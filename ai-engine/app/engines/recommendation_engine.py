from ..core.text import clamp, normalize_text, tokenize
from ..providers.base import PlaceProvider
from ..providers.static_catalog import get_default_place_provider
from .confidence import calculate_confidence

DEFAULT_RECOMMENDATION_WEIGHTS = {
    "retrievalFit": 0.25,
    "preferenceFit": 0.24,
    "budgetFit": 0.16,
    "groupFit": 0.14,
    "seasonFit": 0.12,
    "tripFit": 0.09,
    "groupSatisfactionFit": 0,
}

RECOMMENDATION_WEIGHT_PROFILES = {
    "solo": {"preferenceFit": 0.32, "groupFit": 0.04},
    "couples": {"preferenceFit": 0.28, "groupFit": 0.16},
    "family": {"retrievalFit": 0.2, "preferenceFit": 0.2, "groupFit": 0.22},
    "friends": {"preferenceFit": 0.22, "groupSatisfactionFit": 0.14},
}


def rank_destination_recommendations(
    *,
    candidates: list[dict] | None = None,
    places: list[dict] | None = None,
    place_provider: PlaceProvider | None = None,
    userPreferences: dict | None = None,
    user_preferences: dict | None = None,
    budgetConstraints: dict | None = None,
    budget_constraints: dict | None = None,
    groupPreferences: dict | None = None,
    group_preferences: dict | None = None,
    groupMembers: list[dict] | None = None,
    group_members: list[dict] | None = None,
    tripLengthDays: int = 3,
    trip_length_days: int | None = None,
    season: str | None = None,
    month: str | None = None,
    travelStyle: dict | None = None,
    travel_style: dict | None = None,
    weightProfile: str | None = None,
    weight_profile: str | None = None,
    weights: dict | None = None,
    topK: int = 10,
    top_k: int | None = None,
) -> list[dict]:
    source_places = places if places is not None else (place_provider or get_default_place_provider()).list_places()
    lookup = {place["id"]: place for place in source_places}
    resolved = resolve_candidates(candidates, source_places, lookup)
    group_prefs = groupPreferences or group_preferences or {}
    resolved_weights = resolve_recommendation_weights(weightProfile or weight_profile, weights, group_prefs)
    ranked = []
    for place, retrieval_record in resolved:
        group_satisfaction = calculate_group_satisfaction(place, groupMembers or group_members or [])
        breakdown = {
            "retrievalFit": retrieval_fit(retrieval_record),
            "preferenceFit": preference_fit(
                place, userPreferences or user_preferences or {}, travelStyle or travel_style or {}
            ),
            "budgetFit": budget_fit(place, budgetConstraints or budget_constraints or {}),
            "groupFit": group_fit(place, group_prefs),
            "seasonFit": season_fit(place, season, month),
            "tripFit": trip_fit(place, trip_length_days or tripLengthDays),
            "groupSatisfactionFit": group_satisfaction["groupScore"],
        }
        score = weighted_average(breakdown, resolved_weights)
        confidence = calculate_confidence(
            base=score / 100,
            retrieval_score=breakdown["retrievalFit"],
            group_conflict_level="high" if group_satisfaction["conflictLevel"] == "high" else "none",
            sparse_data=not bool(retrieval_record) and bool(candidates),
        )
        ranked.append(
            {
                **place,
                "destinationRankingScore": round(score, 2),
                **confidence,
                "recommendationBreakdown": breakdown,
                "groupSatisfaction": group_satisfaction,
                "recommendationReasons": explain_recommendation(place, breakdown, group_satisfaction, season, month),
            }
        )
    return sorted(ranked, key=lambda place: place["destinationRankingScore"], reverse=True)[: top_k or topK]


def resolve_candidates(candidates, places, lookup):
    if not candidates:
        return [(place, None) for place in places]
    resolved = []
    for candidate in candidates:
        place_id = candidate.get("sourceId") or candidate.get("id")
        place = lookup.get(place_id, candidate)
        if place.get("id"):
            resolved.append((place, candidate if candidate.get("sourceId") else None))
    return resolved


def resolve_recommendation_weights(profile: str | None, weights: dict | None, group_preferences: dict) -> dict:
    if weights:
        return {**DEFAULT_RECOMMENDATION_WEIGHTS, **weights}
    selected = normalize_text(profile or group_preferences.get("groupType") or group_preferences.get("primaryGroup"))
    return {**DEFAULT_RECOMMENDATION_WEIGHTS, **RECOMMENDATION_WEIGHT_PROFILES.get(selected, {})}


def retrieval_fit(record: dict | None) -> float:
    return clamp(record.get("retrievalScore", 68), 0, 100) if record else 68


def preference_fit(place: dict, preferences: dict, travel_style: dict) -> float:
    interests = [
        *(preferences.get("interests") or []),
        *(preferences.get("moods") or []),
        travel_style.get("pace"),
        travel_style.get("primaryIntent"),
    ]
    interests = [interest for interest in interests if interest]
    if not interests:
        return 70
    place_terms = set(
        tokenize(
            " ".join(
                [
                    place.get("category", ""),
                    *place.get("mood", []),
                    *place.get("tags", []),
                    *place.get("retrieval_terms", place.get("retrievalTerms", [])),
                ]
            )
        )
    )
    matches = sum(1 for interest in interests for term in tokenize(interest) if term in place_terms)
    return clamp(52 + matches / max(len(interests), 1) * 48, 0, 100)


def budget_fit(place: dict, constraints: dict) -> float:
    max_level = constraints.get("maxBudgetLevel") or constraints.get("max_budget_level")
    preferred = constraints.get("preferredBudgetLevel") or constraints.get("preferred_budget_level")
    if not max_level and constraints.get("maxBudget"):
        max_level = 2 if constraints["maxBudget"] <= 30000 else 3
    if not max_level and not preferred:
        return 72
    if max_level and place["budget_level"] > max_level:
        return clamp(62 - (place["budget_level"] - max_level) * 18, 0, 100)
    if preferred:
        return clamp(96 - abs(place["budget_level"] - preferred) * 16, 0, 100)
    return 88


def group_fit(place: dict, preferences: dict) -> float:
    group_type = normalize_text(preferences.get("groupType") or preferences.get("primaryGroup"))
    if not group_type:
        return 72
    ideal_for = {normalize_text(value) for value in place.get("ideal_for", place.get("bestFor", []))}
    if group_type in ideal_for:
        return 95
    if group_type == "family" and place.get("family_friendly"):
        return 88
    return 55


def season_fit(place: dict, season: str | None, month: str | None) -> float:
    if not season and not month:
        return 72
    requested = normalize_text(month or season)[:3]
    best_months = {normalize_text(value)[:3] for value in place.get("best_months", [])}
    return 95 if requested in best_months else 58


def trip_fit(place: dict, days: int) -> float:
    share = place["visitDuration"] / (max(int(days or 1), 1) * 8)
    if share <= 0.18:
        return 94
    if share <= 0.32:
        return 84
    if share <= 0.5:
        return 72
    return 58


def calculate_group_satisfaction(place: dict, members: list[dict]) -> dict:
    if not members:
        return {"groupScore": 72, "memberScores": [], "fairnessPenalty": 0, "conflictLevel": "none"}
    member_scores = []
    for member in members:
        score = preference_fit(
            place,
            {"interests": member.get("interests", []), "moods": member.get("moods", [])},
            member.get("travelStyle", {}) if isinstance(member.get("travelStyle"), dict) else {},
        )
        member_scores.append(
            {
                "memberId": member.get("id") or member.get("name"),
                "score": round(score, 2),
                "matchedPreferences": matched_preferences(place, member),
            }
        )
    average = sum(member["score"] for member in member_scores) / len(member_scores)
    lowest = min(member["score"] for member in member_scores)
    penalty = max(0, average - lowest) * 0.35
    group_score = clamp(average - penalty, 0, 100)
    return {
        "groupScore": round(group_score, 2),
        "memberScores": member_scores,
        "fairnessPenalty": round(penalty, 2),
        "conflictLevel": "high" if penalty >= 12 else "medium" if penalty >= 6 else "low",
    }


def matched_preferences(place: dict, member: dict) -> list[str]:
    place_terms = set(tokenize(" ".join([place.get("category", ""), *place.get("mood", []), *place.get("tags", [])])))
    return [
        preference
        for preference in [*(member.get("interests") or []), *(member.get("moods") or [])]
        if any(term in place_terms for term in tokenize(preference))
    ][:5]


def weighted_average(breakdown: dict, weights: dict) -> float:
    total = sum(weights.values())
    return sum(breakdown.get(key, 0) * weight for key, weight in weights.items()) / total


def explain_recommendation(place, breakdown, group_satisfaction, season, month):
    reasons = []
    if breakdown["preferenceFit"] >= 82:
        reasons.append("matches traveler preferences")
    if breakdown["budgetFit"] >= 82:
        reasons.append("strong budget fit")
    if breakdown["groupFit"] >= 82:
        reasons.append("fits the group")
    if breakdown["seasonFit"] >= 82:
        reasons.append(f"matches {month or season} timing")
    if group_satisfaction["groupScore"] >= 82:
        reasons.append("high group satisfaction")
    if breakdown["tripFit"] >= 82:
        reasons.append("fits trip length")
    if breakdown["retrievalFit"] >= 70:
        reasons.append("strong retrieval match")
    return reasons[:5]
