def explain_group_preference_fusion(fusion: dict) -> dict:
    trip_dna = fusion.get("tripDNA", {})
    consensus = trip_dna.get("consensus", {}).get("support", [])
    conflicts = fusion.get("conflicts", [])
    fairness_targets = fusion.get("fairness", {}).get("representationTargets", [])
    return {
        "kind": "group-preference-fusion",
        "headline": f"Group vibe: {trip_dna.get('groupVibe', 'balanced shared trip')}",
        "selectedBecause": [
            f"{term['term']} is supported by {term['supporterCount']} traveler{'s' if term['supporterCount'] != 1 else ''}"
            for term in consensus[:4]
        ],
        "whoThisServes": build_who_this_serves(consensus),
        "tradeoffs": [(conflict.get("tradeoff") or conflict.get("message")) for conflict in conflicts[:4]],
        "watchouts": [
            *[conflict.get("message") for conflict in conflicts[:2]],
            *[
                f"{target['member']}'s {target['preference']} preference needs a visible win."
                for target in fairness_targets[:2]
            ],
        ][:4],
        "confidenceNarrative": explain_confidence(fusion),
    }


def explain_stable_replan(stable_itinerary: dict) -> dict:
    report = stable_itinerary.get("stabilityReport", {})
    preserved = report.get("preservedActivityCount", 0)
    previous = report.get("previousActivityCount", 0)
    changed = report.get("replacedActivityCount", 0) + report.get("newActivityCount", 0)
    return {
        "kind": "stable-replan",
        "headline": f"{preserved}/{previous} accepted places were preserved"
        if previous
        else "Fresh itinerary generated",
        "selectedBecause": [
            item
            for item in [
                report.get("rule"),
                f"Preserved days: {', '.join(map(str, report.get('preservedDays', [])))}"
                if report.get("preservedDays")
                else None,
                f"Regenerated days: {', '.join(map(str, report.get('regeneratedDays', [])))}"
                if report.get("regeneratedDays")
                else None,
            ]
            if item
        ],
        "whoThisServes": [
            "Travelers who already agreed on parts of the trip",
            "Frontend state that needs stable IDs and minimal churn",
        ],
        "tradeoffs": [
            f"{changed} activity-level changes were allowed because they were directly affected or newly feasible."
            if changed
            else "No activity-level changes were needed."
        ],
        "watchouts": [f"Affected days: {', '.join(map(str, report.get('affectedDays', [])))}"]
        if report.get("affectedDays")
        else [],
        "confidenceNarrative": explain_confidence(stable_itinerary),
    }


def explain_recommendation_selection(
    recommendation: dict, *, tripDNA: dict | None = None, trip_dna: dict | None = None
) -> dict:
    dna = tripDNA or trip_dna or {}
    group_scores = recommendation.get("groupSatisfaction", {}).get("memberScores", [])
    top_members = [
        member.get("memberId") or member.get("name") for member in group_scores if float(member.get("score", 0)) >= 70
    ][:3]
    reasons = recommendation.get("recommendationReasons") or recommendation.get("reasons") or []
    breakdown = recommendation.get("recommendationBreakdown", {})
    top_dimensions = [
        dimension for dimension, _score in sorted(breakdown.items(), key=lambda item: item[1], reverse=True)[:3]
    ]
    return {
        "kind": "recommendation-selection",
        "headline": f"{recommendation.get('name', 'This place')} fits {dna.get('groupVibe', 'the current trip DNA')}",
        "selectedBecause": [*reasons, *[f"Strong {humanize_dimension(dimension)}" for dimension in top_dimensions]][:5],
        "whoThisServes": [f"Good fit for {member}" for member in top_members]
        if top_members
        else ["Good shared fit for the group"],
        "tradeoffs": build_recommendation_tradeoffs(recommendation),
        "watchouts": build_recommendation_watchouts(recommendation),
        "confidenceNarrative": explain_confidence(recommendation),
    }


def build_who_this_serves(consensus: list[dict]) -> list[str]:
    members = []
    for term in consensus:
        members.extend(term.get("members", []))
    unique = list(dict.fromkeys(members))[:4]
    return (
        [f"Reflects {member}'s stated preferences" for member in unique]
        if unique
        else ["Reflects the strongest shared group signals"]
    )


def explain_confidence(output: dict) -> str:
    level = output.get("confidenceLevel", "medium")
    reasons = output.get("confidenceReasons", [])
    return (
        f"{level} confidence because {'; '.join(reasons[:2])}."
        if reasons
        else f"{level} confidence from deterministic scoring signals."
    )


def build_recommendation_tradeoffs(recommendation: dict) -> list[str]:
    tradeoffs = []
    if recommendation.get("groupSatisfaction", {}).get("conflictLevel") == "high":
        tradeoffs.append("High group conflict: this may need an alternate for at least one traveler.")
    if recommendation.get("recommendationBreakdown", {}).get("budgetFit", 100) < 65:
        tradeoffs.append("Budget fit is weaker than the rest of the match.")
    if recommendation.get("recommendationBreakdown", {}).get("seasonFit", 100) < 65:
        tradeoffs.append("Seasonal fit is weaker, so timing should be checked before committing.")
    return tradeoffs or ["No major tradeoff detected from available scoring signals."]


def build_recommendation_watchouts(recommendation: dict) -> list[str]:
    watchouts = []
    if recommendation.get("confidenceLevel") == "low":
        watchouts.append("Low confidence: ask for more trip context.")
    if recommendation.get("place_id") is None and "place_id" in recommendation:
        watchouts.append("Place is not yet verified by the geocoding boundary.")
    if recommendation.get("groupSatisfaction", {}).get("fairnessPenalty", 0) >= 8:
        watchouts.append("Fairness penalty is high; minority preferences may be under-served.")
    return watchouts


def humanize_dimension(dimension: str) -> str:
    output = ""
    for char in dimension:
        output += f" {char.lower()}" if char.isupper() else char
    return output.strip()
