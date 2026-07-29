from copy import deepcopy
from datetime import UTC, datetime

from ..core.text import clamp, normalize_text
from ..providers.base import PlaceProvider
from ..providers.static_catalog import DESTINATION_REGION_PROFILES, get_default_place_provider
from .confidence import calculate_confidence

DEFAULT_ITINERARY_PLANNER_CONFIG = {
    "dayStartTime": "09:00",
    "dayEndTime": "19:00",
    "parentDayStartTime": "09:30",
    "parentDayEndTime": "18:30",
    "earlyTransferStartTime": "07:30",
    "transferBufferMinutes": 30,
    "intraLocationTransferMinutes": 18,
    "maxActivitiesPerDay": 3,
    "parentMaxActivitiesPerDay": 2,
    "backpackerMaxActivitiesPerDay": 4,
    "longTransferThresholdMinutes": 150,
    "parentMaxFatigue": 6,
    "defaultMaxFatigue": 8,
    "backpackerMaxFatigue": 10,
    "parentMaxWalkingHours": 3.2,
    "defaultMaxWalkingHours": 5,
    "backpackerMaxWalkingHours": 7,
    "groupCostMultiplierCap": 4,
}


def plan_deterministic_itinerary(
    *,
    destination: str = "Kerala",
    days: int = 1,
    budget: int | None = None,
    group: dict | None = None,
    preferences: dict | None = None,
    weather: dict | str | None = None,
    month: str | None = None,
    date: str | None = None,
    openingHours: dict | None = None,
    opening_hours: dict | None = None,
    realtimeSignals: dict | None = None,
    scheduleAdjustments: dict | None = None,
    schedule_adjustments: dict | None = None,
    places: list[dict] | None = None,
    place_provider: PlaceProvider | None = None,
    blockedPlaceIds: list[str] | None = None,
    blocked_place_ids: list[str] | None = None,
    config: dict | None = None,
) -> dict:
    group = group or {}
    preferences = preferences or {}
    normalized_days = max(1, int(days or 1))
    planner_config = {**DEFAULT_ITINERARY_PLANNER_CONFIG, **(config or {})}
    opening_hours = openingHours or opening_hours or {}
    constraints = derive_trip_constraints(
        destination=destination,
        days=normalized_days,
        budget=budget,
        group=group,
        preferences=preferences,
        weather=weather,
        month=month,
        schedule_adjustments=scheduleAdjustments or schedule_adjustments or {},
        config=planner_config,
    )
    blocked_ids = set(blockedPlaceIds or blocked_place_ids or [])
    available_places = places if places is not None else (place_provider or get_default_place_provider()).list_places()
    candidates = [
        apply_realtime_intelligence(place, opening_hours, weather, month, constraints)
        for place in available_places
        if place.get("id") not in blocked_ids and place_matches_destination(place, destination)
    ]
    candidates = [
        {**place, "itineraryScore": score_itinerary_place(place, constraints)}
        for place in candidates
        if is_hard_group_compatible(place, constraints)
    ]
    candidates.sort(key=lambda place: place["itineraryScore"], reverse=True)
    route_locations = select_route_locations(candidates, destination, normalized_days)
    day_location_plan = distribute_locations(route_locations, normalized_days)

    used_place_ids: set[str] = set()
    skipped_candidates: list[dict] = []
    decision_trace: list[dict] = []
    planned_days: list[dict] = []
    for index, route_location in enumerate(day_location_plan):
        previous_location = day_location_plan[index - 1] if index > 0 else None
        day = plan_single_day(
            day_number=index + 1,
            destination=destination,
            route_location=route_location,
            previous_location=previous_location,
            candidates=candidates,
            used_place_ids=used_place_ids,
            constraints=constraints,
            skipped_candidates=skipped_candidates,
            decision_trace=decision_trace,
        )
        for activity in day["activities"]:
            if activity["kind"] == "place":
                used_place_ids.add(activity["id"])
        planned_days.append(day)

    route = build_route_summary(planned_days, destination)
    totals = calculate_totals(planned_days)
    itinerary = {
        "stage": "itinerary-intelligence-v1",
        "plannerStatus": "feasible" if totals["scheduledPlaceCount"] > 0 else "no_optimal_itinerary_available",
        "destination": destination,
        "generatedAt": datetime.now(UTC).isoformat(),
        "input": {
            "destination": destination,
            "days": normalized_days,
            "budget": budget,
            "group": group,
            "preferences": preferences,
            "weather": weather,
            "month": month,
            "date": date,
        },
        "constraints": constraints,
        "route": route,
        "days": planned_days,
        **build_day_aliases(planned_days),
        "totals": totals,
        "realtimeInsights": build_realtime_insights(candidates, planned_days),
        "skippedCandidates": skipped_candidates,
        "decisionTrace": decision_trace,
        "notes": [
            "Python deterministic planner output: no LLM schedule generation.",
            "LLMs can explain or refine this schedule later, but constraints own the plan.",
        ],
    }
    feasibility = validate_deterministic_itinerary(itinerary)
    scheduled_days = sum(
        1 for day in planned_days if any(activity["kind"] == "place" for activity in day["activities"])
    )
    target_place_coverage = totals["scheduledPlaceCount"] / max(1, min(normalized_days, 3))
    day_coverage = scheduled_days / normalized_days
    confidence = calculate_confidence(
        base=0.86 if totals["scheduledPlaceCount"] else 0.42,
        feasible=feasibility["valid"] and totals["scheduledPlaceCount"] > 0,
        sparse_data=len(candidates) < min(normalized_days, 2),
        output_completeness=min(1, target_place_coverage, day_coverage),
    )
    return {**itinerary, "feasibility": feasibility, **confidence}


def replan_deterministic_itinerary(
    *,
    itineraryInput: dict | None = None,
    itinerary_input: dict | None = None,
    changes: dict | None = None,
    places: list[dict] | None = None,
) -> dict:
    base = deepcopy(itineraryInput or itinerary_input or {})
    changes = changes or {}
    skip_days = set(changes.get("skipDays") or changes.get("skip_days") or [])
    base["days"] = max(1, int(base.get("days") or 1) - len(skip_days))
    base["blockedPlaceIds"] = [*(base.get("blockedPlaceIds") or []), *(changes.get("blockedPlaceIds") or [])]
    base["group"] = {**(base.get("group") or {}), **(changes.get("group") or {})}
    base["preferences"] = {**(base.get("preferences") or {}), **(changes.get("preferences") or {})}
    base["openingHours"] = {**(base.get("openingHours") or {}), **(changes.get("openingHours") or {})}
    base["weather"] = changes.get("weather", base.get("weather"))
    base["month"] = changes.get("month", base.get("month"))
    schedule_adjustments = {**(base.get("scheduleAdjustments") or {}), **(changes.get("scheduleAdjustments") or {})}

    if (
        normalize_text(
            (base.get("weather") or {}).get("condition")
            if isinstance(base.get("weather"), dict)
            else base.get("weather")
        )
        == "rain"
    ):
        base["preferences"]["indoorBias"] = True
    if changes.get("parentsTired"):
        base["group"]["parents"] = True
        base["preferences"]["fatigueMode"] = "tired"
        base["preferences"]["compressRemaining"] = True
    if changes.get("flightDelayHours") or changes.get("flightDelayMinutes"):
        delay_minutes = round((changes.get("flightDelayHours") or 0) * 60 + (changes.get("flightDelayMinutes") or 0))
        base_start = (
            DEFAULT_ITINERARY_PLANNER_CONFIG["parentDayStartTime"]
            if base["group"].get("parents")
            else DEFAULT_ITINERARY_PLANNER_CONFIG["dayStartTime"]
        )
        schedule_adjustments["dayStartOverrides"] = {
            **(schedule_adjustments.get("dayStartOverrides") or {}),
            1: from_minutes(to_minutes(base_start) + delay_minutes),
        }
        base["preferences"]["compressRemaining"] = True
    base["scheduleAdjustments"] = schedule_adjustments
    return plan_deterministic_itinerary(**base, places=places)


def validate_deterministic_itinerary(itinerary: dict) -> dict:
    reports: list[dict] = []
    constraints = itinerary.get("constraints") or {}
    for day in itinerary.get("days", []):
        violations: list[str] = []
        places = [activity for activity in day.get("activities", []) if activity["kind"] == "place"]
        for activity in places:
            if to_minutes(activity["startTime"]) < to_minutes(activity["openingTime"]):
                violations.append(f"{activity['name']} starts before opening time.")
            if to_minutes(activity["endTime"]) > to_minutes(activity["closingTime"]):
                violations.append(f"{activity['name']} ends after closing time.")
            if to_minutes(activity["endTime"]) > to_minutes(day["dayEndTime"]):
                violations.append(f"{activity['name']} exceeds the day limit.")
        if day["totalFatigue"] > constraints.get("maxDailyFatigue", 99):
            violations.append("Daily fatigue exceeds limit.")
        if day["totalWalkingHours"] > constraints.get("maxDailyWalkingHours", 99):
            violations.append("Daily walking exceeds limit.")
        if day["totalCost"] > constraints.get("dailyBudgetCap", float("inf")):
            violations.append("Daily cost exceeds budget cap.")
        reports.append(
            {
                "day": day["day"],
                "routeLocation": day.get("routeLocation"),
                "activityCount": len(places),
                "totalCost": day["totalCost"],
                "totalFatigue": day["totalFatigue"],
                "totalWalkingHours": day["totalWalkingHours"],
                "valid": not violations,
                "violations": violations,
            }
        )
    return {
        "valid": all(report["valid"] for report in reports),
        "dayReports": reports,
        "routeValid": has_no_backtracking(itinerary.get("days", [])),
    }


def derive_trip_constraints(
    destination, days, budget, group, preferences, weather, month, schedule_adjustments, config
):
    traveler_type = (
        "parents"
        if group.get("parents")
        else "backpackers"
        if group.get("backpackers") or normalize_text(preferences.get("travelStyle")) == "backpacker"
        else "balanced"
    )
    group_size = max(1, int(group.get("adults") or 1) + int(group.get("children") or 0))
    cost_multiplier = min(group_size, config["groupCostMultiplierCap"])
    daily_budget = round(int(budget) / days) if budget else float("inf")
    fatigue_mode = normalize_text(preferences.get("fatigueMode"))
    max_fatigue = {"parents": config["parentMaxFatigue"], "backpackers": config["backpackerMaxFatigue"]}.get(
        traveler_type, config["defaultMaxFatigue"]
    )
    max_walking = {"parents": config["parentMaxWalkingHours"], "backpackers": config["backpackerMaxWalkingHours"]}.get(
        traveler_type, config["defaultMaxWalkingHours"]
    )
    max_activities = {
        "parents": config["parentMaxActivitiesPerDay"],
        "backpackers": config["backpackerMaxActivitiesPerDay"],
    }.get(traveler_type, config["maxActivitiesPerDay"])
    if fatigue_mode == "tired":
        max_fatigue = max(3, max_fatigue - 2)
        max_walking = max(1.5, max_walking - 1.4)
    if preferences.get("compressRemaining"):
        max_activities = max(1, min(max_activities, 1 if traveler_type == "parents" else 2))
    weather_mode = normalize_text(weather.get("condition") if isinstance(weather, dict) else weather)
    return {
        "destination": destination,
        "days": days,
        "month": month,
        "totalBudget": budget,
        "dailyBudgetCap": daily_budget,
        "group": group,
        "groupSize": group_size,
        "costMultiplier": cost_multiplier,
        "travelerType": traveler_type,
        "maxDailyFatigue": max_fatigue,
        "maxDailyWalkingHours": max_walking,
        "maxActivitiesPerDay": max_activities,
        "dayStartTime": config["parentDayStartTime"] if traveler_type == "parents" else config["dayStartTime"],
        "dayEndTime": config["parentDayEndTime"] if traveler_type == "parents" else config["dayEndTime"],
        "dayStartOverrides": schedule_adjustments.get("dayStartOverrides") or {},
        "dayEndOverrides": schedule_adjustments.get("dayEndOverrides") or {},
        "transferBufferMinutes": config["transferBufferMinutes"],
        "intraLocationTransferMinutes": config["intraLocationTransferMinutes"],
        "earlyTransferStartTime": config["earlyTransferStartTime"],
        "longTransferThresholdMinutes": config["longTransferThresholdMinutes"],
        "weatherMode": weather_mode,
        "preferences": preferences,
    }


def apply_realtime_intelligence(place: dict, opening_hours: dict, weather, month, constraints: dict) -> dict:
    result = deepcopy(place)
    live_hours = opening_hours.get(result["id"], {})
    if live_hours.get("closed") or live_hours.get("temporarilyClosed"):
        result["temporarilyClosed"] = True
        result["availabilityStatus"] = "closed"
    if constraints["weatherMode"] in {"rain", "heavy rain"} or constraints["preferences"].get("indoorBias"):
        if result["indoorOutdoor"] == "indoor":
            result["realtimeScoreAdjustment"] = result.get("realtimeScoreAdjustment", 0) + 12
        elif result["walking_required"] >= 4:
            result["realtimeScoreAdjustment"] = result.get("realtimeScoreAdjustment", 0) - 18
        else:
            result["realtimeScoreAdjustment"] = result.get("realtimeScoreAdjustment", 0) - 8
    return result


def place_matches_destination(place: dict, destination: str) -> bool:
    normalized = normalize_text(destination)
    profile = DESTINATION_REGION_PROFILES.get(normalized)
    if profile:
        route = normalize_text(place.get("routeLocation") or place.get("city") or place.get("destination"))
        return (
            route in {normalize_text(location) for location in profile["locations"]}
            or normalize_text(place.get("state")) == normalized
        )
    return normalized in {normalize_text(place.get(key)) for key in ["name", "city", "destination", "region", "state"]}


def is_hard_group_compatible(place: dict, constraints: dict) -> bool:
    if constraints["group"].get("parents") and place.get("family_friendly") is False:
        return False
    return True


def score_itinerary_place(place: dict, constraints: dict) -> float:
    ideal_for = {normalize_text(value) for value in place.get("ideal_for", [])}
    requested_group = (
        "family" if constraints["group"].get("parents") else normalize_text(constraints["preferences"].get("groupType"))
    )
    estimated_cost = estimate_group_cost(place, constraints)
    budget_pressure = (
        0 if constraints["dailyBudgetCap"] == float("inf") else estimated_cost / constraints["dailyBudgetCap"]
    )
    score = 48
    score += place.get("clusterPriority", 70) * 0.22
    score += 6 if place.get("family_friendly") else -8
    score += 14 if requested_group in ideal_for else 0
    score += 16 if constraints["group"].get("parents") and place["fatigueScore"] <= 2 else 0
    score += 10 if constraints["group"].get("parents") and place["fatigueScore"] == 3 else 0
    score -= 28 if constraints["group"].get("parents") and place["fatigueScore"] >= 4 else 0
    score += 9 if place["budget_level"] <= 2 else 3
    score -= 18 if budget_pressure > 0.7 else 0
    score -= 40 if budget_pressure > 1 else 0
    score -= 8 if place["walking_required"] >= 4 else 0
    score += place.get("realtimeScoreAdjustment", 0)
    score += preference_bonus(place, constraints["preferences"])
    return round(clamp(score, 0, 100), 2)


def preference_bonus(place: dict, preferences: dict) -> int:
    terms = [
        *preferences.get("interests", []),
        *preferences.get("moods", []),
        preferences.get("vibe"),
        preferences.get("travelStyle"),
    ]
    normalized_terms = [normalize_text(term) for term in terms if term]
    if not normalized_terms:
        return 0
    place_terms = {
        normalize_text(value)
        for value in [
            place["category"],
            *place.get("mood", []),
            *place.get("tags", []),
            *place.get("retrieval_terms", []),
        ]
    }
    return sum(4 for term in normalized_terms if term in place_terms)


def select_route_locations(candidates: list[dict], destination: str, days: int) -> list[str]:
    best_by_location: dict[str, dict] = {}
    for candidate in candidates:
        location = candidate.get("routeLocation") or candidate.get("city") or candidate.get("destination")
        current = best_by_location.get(location)
        if not current or candidate["itineraryScore"] > current["itineraryScore"]:
            best_by_location[location] = candidate
    selected = [
        location
        for location, _candidate in sorted(
            best_by_location.items(), key=lambda item: item[1]["itineraryScore"], reverse=True
        )[: max(1, min(days, len(best_by_location)))]
    ]
    profile = DESTINATION_REGION_PROFILES.get(normalize_text(destination))
    if profile and profile["gatewayLocation"] in best_by_location:
        selected = [
            profile["gatewayLocation"],
            *[location for location in selected if location != profile["gatewayLocation"]],
        ]
    return optimize_route_order(selected, destination)


def optimize_route_order(locations: list[str], destination: str) -> list[str]:
    unique = list(dict.fromkeys(location for location in locations if location))
    profile = DESTINATION_REGION_PROFILES.get(normalize_text(destination))
    if profile:
        order = [normalize_text(location) for location in profile["corridorOrder"]]
        return sorted(
            unique,
            key=lambda location: order.index(normalize_text(location)) if normalize_text(location) in order else 999,
        )
    return unique


def distribute_locations(locations: list[str], days: int) -> list[str | None]:
    if not locations:
        return [None] * days
    return [locations[min(int(index * len(locations) / days), len(locations) - 1)] for index in range(days)]


def plan_single_day(
    day_number,
    destination,
    route_location,
    previous_location,
    candidates,
    used_place_ids,
    constraints,
    skipped_candidates,
    decision_trace,
):
    day_start = resolve_day_start(day_number, constraints)
    day_end = resolve_day_end(day_number, constraints)
    state = {
        "current": to_minutes(day_start),
        "totalCost": 0,
        "totalFatigue": 0.0,
        "totalWalkingHours": 0.0,
        "activities": [],
    }
    add_transfer_if_needed(state, day_number, destination, previous_location, route_location, constraints)
    day_candidates = sorted(
        [candidate for candidate in candidates if candidate["id"] not in used_place_ids],
        key=lambda candidate: (candidate.get("routeLocation") == route_location, candidate["itineraryScore"]),
        reverse=True,
    )
    for candidate in day_candidates:
        if (
            len([activity for activity in state["activities"] if activity["kind"] == "place"])
            >= constraints["maxActivitiesPerDay"]
        ):
            break
        attempt = try_schedule_place(candidate, route_location, state, constraints, day_end)
        if not attempt["feasible"]:
            skipped_candidates.append(
                {"day": day_number, "id": candidate["id"], "name": candidate["name"], "reason": attempt["reason"]}
            )
            continue
        activity = attempt["activity"]
        state["activities"].append(activity)
        state["current"] = attempt["nextCurrentMinutes"]
        state["totalCost"] += activity["estimatedGroupCost"]
        state["totalFatigue"] = round(state["totalFatigue"] + activity["fatigueScore"], 2)
        state["totalWalkingHours"] = round(state["totalWalkingHours"] + activity["walkingHours"], 2)
        decision_trace.append(
            {
                "day": day_number,
                "selected": candidate["name"],
                "reason": "Selected highest-scoring feasible place for the active route location.",
                "routeLocation": route_location,
                "score": candidate["itineraryScore"],
            }
        )
    return {
        "day": day_number,
        "title": f"Day {day_number}",
        "routeLocation": route_location,
        "dayStartTime": day_start,
        "dayEndTime": day_end,
        "totalCost": state["totalCost"],
        "totalFatigue": state["totalFatigue"],
        "totalWalkingHours": state["totalWalkingHours"],
        "activities": state["activities"],
    }


def add_transfer_if_needed(state, day_number, destination, previous_location, route_location, constraints):
    if not previous_location or not route_location or previous_location == route_location:
        return
    travel_minutes = estimate_travel_minutes(previous_location, route_location, destination)
    transfer_start = (
        to_minutes(constraints["earlyTransferStartTime"])
        if travel_minutes >= constraints["longTransferThresholdMinutes"]
        else state["current"]
    )
    transfer_end = transfer_start + travel_minutes
    fatigue = transfer_fatigue(travel_minutes)
    state["activities"].append(
        {
            "kind": "transfer",
            "day": day_number,
            "from": previous_location,
            "to": route_location,
            "startTime": from_minutes(transfer_start),
            "endTime": from_minutes(transfer_end),
            "durationMinutes": travel_minutes,
            "travelType": "driving",
            "fatigueScore": fatigue,
            "reason": "Route optimization keeps movement forward instead of bouncing between clusters.",
        }
    )
    state["current"] = max(state["current"], transfer_end + constraints["transferBufferMinutes"])
    state["totalFatigue"] = round(state["totalFatigue"] + fatigue, 2)


def try_schedule_place(place, route_location, state, constraints, day_end):
    if (place.get("routeLocation") or place.get("city")) != route_location:
        return {"feasible": False, "reason": "Skipped to avoid cross-cluster backtracking inside the day."}
    if place.get("temporarilyClosed") or place.get("availabilityStatus") == "closed":
        return {"feasible": False, "reason": f"{place['name']} is closed according to live opening-hours data."}
    duration = round(place["visitDuration"] * 60)
    opening = to_minutes(place["openingTime"])
    closing = to_minutes(place["closingTime"])
    preferred = preferred_start_minutes(place["idealTime"])
    earliest = max(state["current"], opening)
    start = (
        preferred
        if preferred >= earliest and preferred + duration <= closing and preferred + duration <= to_minutes(day_end)
        else earliest
    )
    end = start + duration
    cost = estimate_group_cost(place, constraints)
    fatigue = float(place["fatigueScore"])
    walking_hours = estimate_walking_hours(place, duration)
    if end > closing:
        return {"feasible": False, "reason": f"{place['name']} would end after closing time."}
    if end > to_minutes(day_end):
        return {"feasible": False, "reason": f"{place['name']} would exceed the day limit."}
    if state["totalFatigue"] + fatigue > constraints["maxDailyFatigue"]:
        return {
            "feasible": False,
            "reason": f"{place['name']} would exceed max fatigue {constraints['maxDailyFatigue']}.",
        }
    if state["totalWalkingHours"] + walking_hours > constraints["maxDailyWalkingHours"]:
        return {
            "feasible": False,
            "reason": f"{place['name']} would exceed walking limit {constraints['maxDailyWalkingHours']}h.",
        }
    if state["totalCost"] + cost > constraints["dailyBudgetCap"]:
        return {
            "feasible": False,
            "reason": f"{place['name']} would exceed daily budget cap {constraints['dailyBudgetCap']}.",
        }
    return {
        "feasible": True,
        "nextCurrentMinutes": end + constraints["intraLocationTransferMinutes"],
        "activity": {
            "kind": "place",
            "id": place["id"],
            "name": place["name"],
            "category": place["category"],
            "destination": place["city"],
            "routeLocation": place["routeLocation"],
            "startTime": from_minutes(start),
            "endTime": from_minutes(end),
            "visitDuration": place["visitDuration"],
            "durationMinutes": duration,
            "openingTime": place["openingTime"],
            "closingTime": place["closingTime"],
            "fatigueScore": fatigue,
            "walkingHours": walking_hours,
            "travelType": place["travelType"],
            "idealTime": place["idealTime"],
            "estimatedCost": place["estimatedCost"],
            "estimatedGroupCost": cost,
            "itineraryScore": place["itineraryScore"],
            "reasons": build_activity_reasons(place, constraints),
        },
    }


def build_activity_reasons(place, constraints):
    reasons = []
    if constraints["group"].get("parents") and place["fatigueScore"] <= 3:
        reasons.append("fits parent-friendly fatigue limits")
    if place.get("family_friendly"):
        reasons.append("family friendly")
    if place.get("idealTime"):
        reasons.append(f"best around {place['idealTime']}")
    if place["budget_level"] <= 2:
        reasons.append("keeps activity budget controlled")
    if place.get("routeLocation"):
        reasons.append(f"fits the {place['routeLocation']} route cluster")
    return reasons[:4]


def estimate_group_cost(place, constraints):
    return round(place.get("estimatedCost", 0) * constraints["costMultiplier"])


def estimate_walking_hours(place, duration_minutes):
    if place["travelType"] in {"boat", "driving"}:
        return 0.25
    walking_ratio = 0.45 if place["travelType"] == "mixed" else 0.75
    return round(duration_minutes / 60 * walking_ratio * (place["walking_required"] / 5), 2)


def estimate_travel_minutes(from_location, to_location, destination):
    if not from_location or not to_location or from_location == to_location:
        return 0
    profile = DESTINATION_REGION_PROFILES.get(normalize_text(destination))
    if profile:
        direct = f"{from_location}::{to_location}"
        reverse = f"{to_location}::{from_location}"
        return profile["travelMinutes"].get(direct) or profile["travelMinutes"].get(reverse) or 75
    return 75


def transfer_fatigue(travel_minutes):
    if travel_minutes >= 300:
        return 1.4
    if travel_minutes >= 180:
        return 1.1
    if travel_minutes >= 90:
        return 0.7
    return 0.3


def preferred_start_minutes(ideal_time):
    return to_minutes(
        {
            "morning": "09:00",
            "lunch": "13:00",
            "afternoon": "14:00",
            "late afternoon": "15:30",
            "sunset": "16:30",
            "evening": "17:30",
            "night": "20:00",
        }.get(normalize_text(ideal_time), "09:00")
    )


def build_route_summary(days, destination):
    locations = list(dict.fromkeys(day.get("routeLocation") for day in days if day.get("routeLocation")))
    transfers = [
        {
            "from": locations[index - 1],
            "to": locations[index],
            "estimatedMinutes": estimate_travel_minutes(locations[index - 1], locations[index], destination),
        }
        for index in range(1, len(locations))
    ]
    return {
        "routeLocations": locations,
        "transfers": transfers,
        "totalTransferMinutes": sum(transfer["estimatedMinutes"] for transfer in transfers),
        "backtrackingAvoided": has_no_backtracking(days),
    }


def calculate_totals(days):
    return {
        "totalCost": sum(day["totalCost"] for day in days),
        "totalFatigue": round(sum(day["totalFatigue"] for day in days), 2),
        "totalWalkingHours": round(sum(day["totalWalkingHours"] for day in days), 2),
        "scheduledPlaceCount": sum(1 for day in days for activity in day["activities"] if activity["kind"] == "place"),
    }


def build_realtime_insights(candidates, planned_days):
    impacted = [place for place in candidates if place.get("realtimeScoreAdjustment", 0) < 0]
    alternatives = [place for place in candidates if place.get("realtimeScoreAdjustment", 0) > 0]
    return {
        "dynamicSignalsApplied": bool(impacted or alternatives),
        "impactedPlaces": [{"id": place["id"], "name": place["name"]} for place in impacted[:5]],
        "alternatives": [{"id": place["id"], "name": place["name"]} for place in alternatives[:5]],
    }


def build_day_aliases(days):
    return {f"day{day['day']}": day["activities"] for day in days}


def resolve_day_start(day_number, constraints):
    overrides = constraints.get("dayStartOverrides") or {}
    return overrides.get(day_number) or overrides.get(str(day_number)) or constraints["dayStartTime"]


def resolve_day_end(day_number, constraints):
    overrides = constraints.get("dayEndOverrides") or {}
    return overrides.get(day_number) or overrides.get(str(day_number)) or constraints["dayEndTime"]


def has_no_backtracking(days):
    seen = set()
    previous = None
    for day in days:
        location = day.get("routeLocation")
        if not location or location == previous:
            continue
        if location in seen:
            return False
        seen.add(location)
        previous = location
    return True


def to_minutes(value):
    hours, minutes = [int(part) for part in str(value or "00:00").split(":")[:2]]
    return hours * 60 + minutes


def from_minutes(value):
    normalized = max(0, round(value))
    hours = (normalized // 60) % 24
    minutes = normalized % 60
    return f"{hours:02d}:{minutes:02d}"
