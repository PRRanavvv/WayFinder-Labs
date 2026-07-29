from collections import Counter

from ..core.text import clamp, normalize_text, tokenize
from .confidence import calculate_confidence

DEFAULT_GROUP_FUSION_WEIGHTS = {
    "interest": 1.0,
    "mood": 0.85,
    "mustHave": 1.35,
    "avoid": 1.15,
    "explicitPreference": 1.25,
}


def build_trip_dna(payload: dict | None = None) -> dict:
    return fuse_group_preferences(**(payload or {}))


def fuse_group_preferences(
    *,
    groupMembers: list[dict] | None = None,
    group_members: list[dict] | None = None,
    explicitPreferences: dict | None = None,
    explicit_preferences: dict | None = None,
    tripContext: dict | None = None,
    trip_context: dict | None = None,
    weights: dict | None = None,
) -> dict:
    members = [normalize_member(member) for member in (groupMembers or group_members or [])]
    explicit = normalize_member(
        {"id": "trip_preferences", "name": "Trip preferences", **(explicitPreferences or explicit_preferences or {})},
        source="explicit",
    )
    active_weights = {**DEFAULT_GROUP_FUSION_WEIGHTS, **(weights or {})}
    profiles = [*members, explicit] if explicit["hasSignal"] else members
    positive, avoid = collect_signal_counts(profiles, active_weights)
    member_count = max(len(members), 1)
    ranked_positive = rank_terms(positive)
    consensus_terms = [
        term
        for term in ranked_positive
        if term["supporterCount"] >= consensus_threshold(member_count) or term["source"] == "explicit"
    ][:8]
    fallback_terms = ranked_positive[:5]
    soft_preferences = [term["term"] for term in (consensus_terms or fallback_terms)]
    avoid_terms = rank_terms(avoid)[:8]
    context = tripContext or trip_context or {}
    budget_profile = build_budget_profile(members, context)
    pace_profile = build_pace_profile(members, explicitPreferences or explicit_preferences or {})
    fairness = build_fairness_profile(members, positive, member_count)
    conflicts = detect_group_conflicts(
        positive_terms=ranked_positive,
        avoid_terms=avoid_terms,
        budget_profile=budget_profile,
        pace_profile=pace_profile,
        member_profiles=members,
        trip_context=context,
    )
    conflict_level = (
        "high" if len(conflicts) >= 3 else "medium" if conflicts or len(fairness["minorityPreferences"]) >= 3 else "low"
    )
    confidence = calculate_confidence(
        base=0.88,
        missing_info=[] if members else ["group members"],
        conflicts=conflicts,
        group_conflict_level=conflict_level,
        output_completeness=1 if soft_preferences else 0.55,
    )
    group_vibe = build_group_vibe(soft_preferences, pace_profile, context)
    trip_dna = {
        "groupVibe": group_vibe,
        "softPreferences": soft_preferences,
        "hardConstraints": build_hard_constraints(avoid_terms, budget_profile, members, context),
        "dominantPace": pace_profile["dominantPace"],
        "budgetProfile": budget_profile,
        "consensus": {
            "terms": soft_preferences,
            "support": [public_term(term) for term in (consensus_terms or fallback_terms)],
        },
        "conflictLevel": conflict_level,
    }

    return {
        "stage": "group-preference-fusion-v1",
        "inputSummary": {
            "memberCount": len(members),
            "destination": context.get("destination"),
            "days": context.get("days"),
            "month": context.get("month"),
        },
        "tripDNA": trip_dna,
        "memberProfiles": [public_member(member) for member in members],
        "fairness": fairness,
        "conflicts": conflicts,
        "recommendationHints": build_recommendation_hints(
            soft_preferences, group_vibe, pace_profile, budget_profile, context, members
        ),
        **confidence,
    }


def score_place_against_trip_dna(place: dict, fusion: dict) -> dict:
    trip_dna = fusion.get("tripDNA", fusion)
    soft_preferences = trip_dna.get("softPreferences", [])
    hard_avoids = [
        value
        for constraint in trip_dna.get("hardConstraints", [])
        if constraint.get("type") == "avoid"
        for value in constraint.get("values", [])
    ]
    place_terms = set(
        tokenize(
            " ".join(
                [
                    place.get("name", ""),
                    place.get("category", ""),
                    place.get("summary", ""),
                    place.get("semantic_summary", ""),
                    *place.get("mood", []),
                    *place.get("tags", []),
                    *place.get("ideal_for", place.get("bestFor", [])),
                    *place.get("retrieval_terms", place.get("retrievalTerms", [])),
                ]
            )
        )
    )
    matched = [pref for pref in soft_preferences if any(term in place_terms for term in tokenize(pref))]
    avoided = [avoid for avoid in hard_avoids if any(term in place_terms for term in tokenize(avoid))]
    consensus_fit = len(matched) / len(soft_preferences) if soft_preferences else 0.55
    fairness_boost = (
        0.08
        if any(
            any(term in place_terms for term in tokenize(target["preference"]))
            for target in fusion.get("fairness", {}).get("representationTargets", [])
        )
        else 0
    )
    score = clamp((consensus_fit + fairness_boost - len(avoided) * 0.18) * 100, 0, 100)
    return {
        "placeId": place.get("id"),
        "name": place.get("name"),
        "score": round(score, 2),
        "matchedPreferences": matched,
        "avoidedMatches": avoided,
        "fairnessBoostApplied": fairness_boost > 0,
    }


def normalize_member(member: dict, source: str = "member") -> dict:
    interests = normalize_list(member.get("interests"))
    moods = normalize_list(member.get("moods"))
    must_have = normalize_list(member.get("mustHave") or member.get("must_haves") or member.get("musts"))
    avoid = normalize_list(member.get("avoid") or member.get("dislikes") or member.get("blockedPreferences"))
    constraints = normalize_constraints(member.get("constraints") or {})
    travel_style = member.get("travelStyle") or {}
    if not isinstance(travel_style, dict):
        travel_style = {"primaryIntent": travel_style}
    pace = normalize_text(member.get("pace") or member.get("travelPace") or travel_style.get("pace"))
    style = normalize_text(travel_style.get("primaryIntent") or member.get("style"))
    member_id = member.get("id") or member.get("name") or source
    return {
        "id": member_id,
        "name": member.get("name") or member_id,
        "source": source,
        "interests": interests,
        "moods": moods,
        "mustHave": must_have,
        "avoid": avoid,
        "constraints": constraints,
        "pace": pace,
        "travelStyle": style,
        "budget": normalize_budget(member.get("budget") or member.get("maxBudget") or member.get("budgetInr")),
        "hasSignal": any([interests, moods, must_have, avoid, constraints, pace]),
    }


def normalize_list(value: object) -> list[str]:
    if not value:
        return []
    values = value if isinstance(value, list) else [value]
    normalized: list[str] = []
    for item in values:
        normalized.extend(normalize_text(part) for part in str(item).split(","))
    return sorted({item for item in normalized if item})


def normalize_constraints(constraints: dict) -> dict:
    return {
        normalize_text(key): True if value is True else normalize_text(value)
        for key, value in constraints.items()
        if value not in (None, False, "")
    }


def normalize_budget(value: object) -> int | None:
    try:
        budget = int(value)
    except (TypeError, ValueError):
        return None
    return budget if budget > 0 else None


def collect_signal_counts(profiles: list[dict], weights: dict) -> tuple[dict, dict]:
    positive: dict[str, dict] = {}
    avoid: dict[str, dict] = {}
    for profile in profiles:
        add_terms(positive, profile["interests"], profile, weights["interest"])
        add_terms(positive, profile["moods"], profile, weights["mood"])
        add_terms(positive, profile["mustHave"], profile, weights["mustHave"])
        if profile["travelStyle"]:
            add_terms(positive, [profile["travelStyle"]], profile, weights["interest"])
        add_terms(avoid, profile["avoid"], profile, weights["avoid"])
        if profile["source"] == "explicit":
            for report in positive.values():
                if profile["id"] in report["memberIds"]:
                    report["score"] *= weights["explicitPreference"]
    return positive, avoid


def add_terms(target: dict, terms: list[str], profile: dict, weight: float) -> None:
    for term in terms:
        report = target.setdefault(
            term,
            {"term": term, "score": 0.0, "memberIds": set(), "names": set(), "source": profile["source"]},
        )
        report["score"] += weight
        report["memberIds"].add(profile["id"])
        report["names"].add(profile["name"])
        if profile["source"] == "explicit":
            report["source"] = "explicit"


def rank_terms(signal_map: dict) -> list[dict]:
    terms = [
        {
            **report,
            "supporterCount": len(report["memberIds"]),
            "members": sorted(report["names"]),
            "score": round(report["score"], 2),
        }
        for report in signal_map.values()
    ]
    return sorted(terms, key=lambda term: (-term["supporterCount"], -term["score"], term["term"]))


def consensus_threshold(member_count: int) -> int:
    if member_count <= 2:
        return 1
    return (member_count + 1) // 2


def public_term(term: dict) -> dict:
    return {
        "term": term["term"],
        "supporterCount": term["supporterCount"],
        "members": term["members"],
        "score": term["score"],
    }


def build_budget_profile(members: list[dict], context: dict) -> dict:
    budgets = sorted(
        budget
        for budget in [*(member["budget"] for member in members), normalize_budget(context.get("budget"))]
        if budget
    )
    if not budgets:
        return {"status": "unknown", "min": None, "max": None, "median": None, "sharedCap": None, "spreadRatio": None}
    minimum, maximum = budgets[0], budgets[-1]
    return {
        "status": "spread" if maximum / minimum >= 2 else "aligned",
        "min": minimum,
        "max": maximum,
        "median": budgets[len(budgets) // 2],
        "sharedCap": minimum,
        "spreadRatio": round(maximum / minimum, 2),
    }


def build_pace_profile(members: list[dict], explicit: dict) -> dict:
    counts = Counter(member["pace"] for member in members if member["pace"])
    explicit_pace = normalize_text(explicit.get("pace") or explicit.get("travelPace"))
    if explicit_pace:
        counts[explicit_pace] += 1
    ranked = counts.most_common()
    return {
        "dominantPace": ranked[0][0] if ranked else "balanced",
        "paceCounts": dict(ranked),
        "hasConflict": len(ranked) >= 2 and ranked[0][1] == ranked[1][1],
    }


def build_fairness_profile(members: list[dict], positive: dict, member_count: int) -> dict:
    minority = [public_term(term) for term in rank_terms(positive) if term["supporterCount"] == 1 and member_count >= 3]
    targets = [
        {
            "preference": term["term"],
            "member": term["members"][0],
            "reason": "Keep at least one visible win for a minority preference.",
        }
        for term in minority[:4]
    ]
    underrepresented = sorted({target["member"] for target in targets})
    return {
        "minorityPreferences": minority,
        "representationTargets": targets,
        "underrepresentedMembers": underrepresented,
        "fairnessRule": "Do not average minority travelers out of the plan."
        if member_count >= 3
        else "Small-group plan can optimize for direct consensus.",
    }


def detect_group_conflicts(
    *,
    positive_terms: list[dict],
    avoid_terms: list[dict],
    budget_profile: dict,
    pace_profile: dict,
    member_profiles: list[dict],
    trip_context: dict,
) -> list[dict]:
    terms = {term["term"] for term in positive_terms}
    avoids = {term["term"] for term in avoid_terms}
    conflicts: list[dict] = []
    add_opposition(
        conflicts,
        terms,
        {"quiet", "peaceful", "slow", "calm"},
        {"nightlife", "party", "energetic", "social"},
        {
            "type": "quiet-nightlife",
            "message": "The group wants quiet pacing and high-energy social blocks.",
            "tradeoff": "Use a quiet base with optional evening zones instead of making nightlife the default.",
        },
    )
    add_opposition(
        conflicts,
        terms,
        {"adventure", "trek", "hiking", "wild"},
        {"low fatigue", "accessible", "parents", "comfort"},
        {
            "type": "adventure-fatigue",
            "message": "Adventure interest is competing with low-fatigue or comfort needs.",
            "tradeoff": "Prefer scenic low-risk adventure and cap long walking blocks.",
        },
    )
    add_opposition(
        conflicts,
        terms,
        {"budget", "cheap", "low cost"},
        {"luxury", "premium", "comfort"},
        {
            "type": "budget-comfort",
            "message": "Budget and premium comfort expectations are both present.",
            "tradeoff": "Keep the base plan budget-safe and mark premium upgrades separately.",
        },
    )
    if budget_profile["status"] == "spread":
        conflicts.append(
            {
                "type": "budget-spread",
                "message": f"Group budgets range from {budget_profile['min']} to {budget_profile['max']}.",
                "tradeoff": "Rank against the lowest shared cap, then show paid upgrades as opt-ins.",
            }
        )
    if pace_profile["hasConflict"]:
        conflicts.append(
            {
                "type": "pace-split",
                "message": "No single pace dominates the group.",
                "tradeoff": "Alternate anchor days with lighter recovery blocks.",
            }
        )
    if "crowds" in avoids and "nightlife" in terms:
        conflicts.append(
            {
                "type": "crowd-nightlife",
                "message": "Nightlife usually raises crowd exposure.",
                "tradeoff": "Pick controlled evening venues over dense party strips.",
            }
        )
    if trip_context.get("days") and len(member_profiles) >= 4 and int(trip_context["days"]) <= 2:
        conflicts.append(
            {
                "type": "short-trip-large-group",
                "message": "A short trip with a larger group leaves little room for everyone to get a win.",
                "tradeoff": "Prioritize two shared anchors and one optional split activity.",
            }
        )
    return conflicts


def add_opposition(conflicts: list[dict], terms: set[str], left: set[str], right: set[str], report: dict) -> None:
    if terms.intersection(left) and terms.intersection(right):
        conflicts.append(report)


def build_hard_constraints(
    avoid_terms: list[dict], budget_profile: dict, members: list[dict], context: dict
) -> list[dict]:
    constraints: list[dict] = []
    if budget_profile.get("sharedCap"):
        constraints.append({"type": "budget", "value": budget_profile["sharedCap"], "source": "lowest shared budget"})
    elif context.get("budget"):
        constraints.append({"type": "budget", "value": context["budget"], "source": "trip context"})
    if avoid_terms:
        constraints.append(
            {"type": "avoid", "values": [term["term"] for term in avoid_terms], "source": "traveler dislikes"}
        )
    member_constraints = [
        key if value is True else f"{key}: {value}"
        for member in members
        for key, value in member["constraints"].items()
    ]
    if member_constraints:
        constraints.append(
            {"type": "traveler-constraint", "values": sorted(set(member_constraints)), "source": "member constraints"}
        )
    return constraints


def build_group_vibe(soft_preferences: list[str], pace_profile: dict, context: dict) -> str:
    theme = " + ".join(soft_preferences[:2]) or normalize_text(context.get("groupType")) or "shared"
    return f"{pace_profile['dominantPace']} {theme} trip"


def build_recommendation_hints(
    soft_preferences: list[str],
    group_vibe: str,
    pace_profile: dict,
    budget_profile: dict,
    context: dict,
    members: list[dict],
) -> dict:
    family = any(member["constraints"].get("parents") or "family" in member["interests"] for member in members)
    group_type = normalize_text(context.get("groupType")) or (
        "family" if family else "friends" if len(members) >= 3 else "solo"
    )
    return {
        "groupType": group_type,
        "groupVibe": group_vibe,
        "userPreferences": {
            "interests": soft_preferences,
            "moods": [
                term for term in soft_preferences if term in {"slow", "quiet", "social", "romantic", "adventurous"}
            ],
        },
        "travelStyle": {
            "pace": pace_profile["dominantPace"],
            "primaryIntent": soft_preferences[0] if soft_preferences else None,
        },
        "budgetConstraints": {
            "maxBudget": budget_profile.get("sharedCap"),
            "preferredBudget": budget_profile.get("median"),
        },
        "rankingNotes": [
            "Use consensus terms for the main route.",
            "Reserve at least one visible win for minority preferences.",
            "Treat hard constraints as filters, not soft scoring hints.",
        ],
    }


def public_member(member: dict) -> dict:
    return {
        "id": member["id"],
        "name": member["name"],
        "interests": member["interests"],
        "moods": member["moods"],
        "mustHave": member["mustHave"],
        "avoid": member["avoid"],
        "pace": member["pace"] or None,
        "budget": member["budget"],
    }
