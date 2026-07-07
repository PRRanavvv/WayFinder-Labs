from datetime import datetime, timezone

from .confidence import calculate_confidence
from .itinerary_planner import calculate_totals, replan_deterministic_itinerary, validate_deterministic_itinerary
from .text import clamp, normalize_text


def replan_with_stability(
    *,
    previousItinerary: dict | None = None,
    previous_itinerary: dict | None = None,
    itineraryInput: dict | None = None,
    itinerary_input: dict | None = None,
    changes: dict | None = None,
    places: list[dict] | None = None,
    stabilityOptions: dict | None = None,
    stability_options: dict | None = None,
) -> dict:
    previous = previousItinerary or previous_itinerary
    next_itinerary = replan_deterministic_itinerary(
        itineraryInput=itineraryInput or itinerary_input or {},
        changes=changes or {},
        places=places,
    )
    return stabilize_itinerary(
        previousItinerary=previous,
        nextItinerary=next_itinerary,
        changes=changes or {},
        **(stabilityOptions or stability_options or {}),
    )


def stabilize_itinerary(
    *,
    previousItinerary: dict | None = None,
    previous_itinerary: dict | None = None,
    nextItinerary: dict | None = None,
    next_itinerary: dict | None = None,
    changes: dict | None = None,
    lockedActivityIds: list[str] | None = None,
    acceptedActivityIds: list[str] | None = None,
    preserveAccepted: bool = True,
    forceFreshDays: list[int] | None = None,
) -> dict:
    previous = previousItinerary or previous_itinerary
    next_plan = nextItinerary or next_itinerary
    changes = changes or {}
    if not previous or not previous.get("days") or not next_plan or not next_plan.get("days"):
        report = build_empty_stability_report(previous, next_plan)
        return {
            **(next_plan or {}),
            "stage": "stable-itinerary-replan-v1",
            "stabilityReport": report,
            **calculate_confidence(base=(next_plan or {}).get("confidence", 0.72), output_completeness=1 if (next_plan or {}).get("days") else 0.4),
        }

    affected_days = infer_affected_days(previous, changes, forceFreshDays or [])
    locked_ids = {str(value) for value in [*(lockedActivityIds or []), *(acceptedActivityIds or [])]}
    preserved_days: list[int] = []
    regenerated_days: list[int] = []
    stable_days: list[dict] = []
    for next_day in next_plan["days"]:
        previous_day = find_matching_previous_day(previous["days"], next_day)
        can_preserve = (
            previous_day
            and next_day["day"] not in affected_days
            and not has_blocked_activity(previous_day, changes)
            and (preserveAccepted or not has_locked_activity(previous_day, locked_ids))
        )
        if can_preserve:
            preserved_days.append(next_day["day"])
            stable_days.append(recalculate_day_totals({
                **previous_day,
                "stability": {
                    "preserved": True,
                    "source": "previous-itinerary",
                    "reason": "No direct change affected this day, so accepted structure was preserved.",
                },
            }))
        else:
            regenerated_days.append(next_day["day"])
            stable_days.append(recalculate_day_totals({
                **next_day,
                "stability": {
                    "preserved": False,
                    "source": "fresh-replan",
                    "reason": "This day was directly affected by the change set."
                    if next_day["day"] in affected_days
                    else "No compatible previous day was available.",
                },
            }))

    itinerary = {
        **next_plan,
        "stage": "stable-itinerary-replan-v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "days": stable_days,
        **{f"day{day['day']}": day["activities"] for day in stable_days},
        "totals": calculate_totals(stable_days),
    }
    report = build_stability_report(
        previousItinerary=previous,
        itinerary=itinerary,
        affectedDays=affected_days,
        preservedDays=preserved_days,
        regeneratedDays=regenerated_days,
        lockedActivityIds=sorted(locked_ids),
    )
    feasibility = validate_deterministic_itinerary(itinerary)
    confidence = calculate_confidence(
        base=next_plan.get("confidence", 0.84),
        feasible=feasibility["valid"],
        output_completeness=report["currentActivityCount"] / report["previousActivityCount"] if report["previousActivityCount"] else 1,
    )
    return {**itinerary, "feasibility": feasibility, "stabilityReport": report, **confidence}


def build_stability_report(
    *,
    previousItinerary: dict | None = None,
    itinerary: dict | None = None,
    affectedDays: set[int] | None = None,
    preservedDays: list[int] | None = None,
    regeneratedDays: list[int] | None = None,
    lockedActivityIds: list[str] | None = None,
) -> dict:
    previous_activities = collect_place_activities((previousItinerary or {}).get("days", []))
    current_activities = collect_place_activities((itinerary or {}).get("days", []))
    previous_keys = {activity["key"] for activity in previous_activities}
    current_keys = {activity["key"] for activity in current_activities}
    preserved = [activity for activity in current_activities if activity["key"] in previous_keys]
    replaced = [activity for activity in previous_activities if activity["key"] not in current_keys]
    new = [activity for activity in current_activities if activity["key"] not in previous_keys]
    moved = [
        activity
        for activity in preserved
        if next((old for old in previous_activities if old["key"] == activity["key"]), {}).get("day") != activity["day"]
    ]
    stability_score = len(preserved) / len(previous_activities) if previous_activities else 1
    return {
        "previousActivityCount": len(previous_activities),
        "currentActivityCount": len(current_activities),
        "preservedActivityCount": len(preserved),
        "replacedActivityCount": len(replaced),
        "newActivityCount": len(new),
        "movedActivityCount": len(moved),
        "stabilityScore": round(clamp(stability_score * 100, 0, 100), 2),
        "affectedDays": sorted(affectedDays or set()),
        "preservedDays": preservedDays or [],
        "regeneratedDays": regeneratedDays or [],
        "lockedActivityIds": lockedActivityIds or [],
        "preservedActivities": public_activities(preserved),
        "replacedActivities": public_activities(replaced),
        "newActivities": public_activities(new),
        "movedActivities": public_activities(moved),
        "rule": "Preserve unaffected accepted days; regenerate only directly impacted days.",
    }


def build_empty_stability_report(previous, next_plan):
    return {
        "previousActivityCount": len(collect_place_activities((previous or {}).get("days", []))),
        "currentActivityCount": len(collect_place_activities((next_plan or {}).get("days", []))),
        "preservedActivityCount": 0,
        "replacedActivityCount": 0,
        "newActivityCount": len(collect_place_activities((next_plan or {}).get("days", []))),
        "movedActivityCount": 0,
        "stabilityScore": 0,
        "affectedDays": [],
        "preservedDays": [],
        "regeneratedDays": [day["day"] for day in (next_plan or {}).get("days", [])],
        "lockedActivityIds": [],
        "preservedActivities": [],
        "replacedActivities": [],
        "newActivities": public_activities(collect_place_activities((next_plan or {}).get("days", []))),
        "movedActivities": [],
        "rule": "No previous itinerary was available, so no structure could be preserved.",
    }


def infer_affected_days(previous: dict, changes: dict, force_fresh_days: list[int]) -> set[int]:
    affected = {int(day) for day in force_fresh_days if day}
    days = previous.get("days", [])
    for day in changes.get("affectedDays", []):
        affected.add(int(day))
    if changes.get("day") or changes.get("dayNumber"):
        affected.add(int(changes.get("day") or changes.get("dayNumber")))
    if changes.get("flightDelayHours") or changes.get("flightDelayMinutes"):
        affected.add(1)
    for day in changes.get("skipDays", []):
        day_number = int(day)
        for existing_day in days:
            if existing_day["day"] >= day_number:
                affected.add(existing_day["day"])
    changed_ids = {
        str(place_id)
        for place_id in [
            *(changes.get("blockedPlaceIds") or []),
            *[
                place_id
                for place_id, value in (changes.get("openingHours") or {}).items()
                if value.get("closed") or value.get("temporarilyClosed")
            ],
        ]
    }
    for day in days:
        if any(str(activity.get("id")) in changed_ids for activity in day.get("activities", [])):
            affected.add(day["day"])
    weather = changes.get("weather") or {}
    if "*" in weather or normalize_text(weather.get("condition") if isinstance(weather, dict) else weather).find("rain") >= 0:
        for day in days:
            affected.add(day["day"])
    if changes.get("forceFullReplan"):
        for day in days:
            affected.add(day["day"])
    return affected


def find_matching_previous_day(previous_days: list[dict], next_day: dict) -> dict | None:
    return next((day for day in previous_days if day["day"] == next_day["day"]), None) or next(
        (day for day in previous_days if day.get("routeLocation") and day.get("routeLocation") == next_day.get("routeLocation")),
        None,
    )


def has_blocked_activity(day: dict, changes: dict) -> bool:
    blocked_ids = {
        str(place_id)
        for place_id in [
            *(changes.get("blockedPlaceIds") or []),
            *[
                place_id
                for place_id, value in (changes.get("openingHours") or {}).items()
                if value.get("closed") or value.get("temporarilyClosed")
            ],
        ]
    }
    return any(str(activity.get("id")) in blocked_ids for activity in day.get("activities", []))


def has_locked_activity(day: dict, locked_ids: set[str]) -> bool:
    return bool(locked_ids) and any(str(activity.get("id")) in locked_ids for activity in day.get("activities", []))


def collect_place_activities(days: list[dict]) -> list[dict]:
    activities = []
    for day in days:
        for activity in day.get("activities", []):
            if activity.get("kind") == "place":
                key = str(activity.get("id") or normalize_text(activity.get("name")))
                activities.append({**activity, "day": day["day"], "key": key})
    return activities


def public_activities(activities: list[dict]) -> list[dict]:
    return [
        {
            "id": activity.get("id"),
            "name": activity.get("name"),
            "day": activity.get("day"),
            "startTime": activity.get("startTime"),
            "endTime": activity.get("endTime"),
        }
        for activity in activities
    ]


def recalculate_day_totals(day: dict) -> dict:
    places = [activity for activity in day.get("activities", []) if activity.get("kind") == "place"]
    return {
        **day,
        "totalCost": sum(activity.get("estimatedGroupCost", 0) for activity in places),
        "totalFatigue": round(sum(activity.get("fatigueScore", 0) for activity in places), 2),
        "totalWalkingHours": round(sum(activity.get("walkingHours", 0) for activity in places), 2),
    }
