def collect_place_ids(itinerary: dict) -> list[str]:
    return [
        activity["id"]
        for day in itinerary.get("days", [])
        for activity in day.get("activities", [])
        if activity.get("kind") == "place" and activity.get("id")
    ]


def evaluate_itinerary(case: dict, itinerary: dict) -> dict:
    place_ids = collect_place_ids(itinerary)
    budget = case.get("input", {}).get("budget")
    total_cost = itinerary.get("totals", {}).get("totalCost", 0)
    blocked = set(case.get("input", {}).get("blockedPlaceIds", []))
    checks = {
        "feasible": bool(itinerary.get("feasibility", {}).get("valid")),
        "noDuplicatePlaces": len(place_ids) == len(set(place_ids)),
        "withinBudget": budget is None or total_cost <= budget,
        "blockedPlacesExcluded": not blocked.intersection(place_ids),
        "honestCoverage": len(itinerary.get("days", [])) == case.get("input", {}).get("days", 1),
    }
    return {
        "caseId": case["id"],
        "passed": all(checks.values()),
        "checks": checks,
        "scheduledPlaces": len(place_ids),
        "totalCost": total_cost,
    }
