from copy import deepcopy

DESTINATION_REGION_PROFILES = {
    "kerala": {
        "name": "Kerala",
        "gatewayLocation": "Kochi",
        "locations": ["Kochi", "Munnar", "Alleppey", "Varkala", "Wayanad"],
        "corridorOrder": ["Kochi", "Munnar", "Alleppey", "Varkala", "Wayanad"],
        "travelMinutes": {
            "Kochi::Munnar": 240,
            "Kochi::Alleppey": 95,
            "Kochi::Varkala": 260,
            "Munnar::Alleppey": 270,
            "Munnar::Varkala": 330,
            "Alleppey::Varkala": 180,
        },
    },
    "rajasthan": {
        "name": "Rajasthan",
        "gatewayLocation": "Jaipur",
        "locations": ["Jaipur", "Udaipur", "Jaisalmer"],
        "corridorOrder": ["Jaipur", "Udaipur", "Jaisalmer"],
        "travelMinutes": {
            "Jaipur::Udaipur": 430,
            "Jaipur::Jaisalmer": 560,
            "Udaipur::Jaisalmer": 500,
        },
    },
    "goa": {
        "name": "Goa",
        "gatewayLocation": "Goa",
        "locations": ["Goa"],
        "corridorOrder": ["Goa"],
        "travelMinutes": {},
    },
    "himachal pradesh": {
        "name": "Himachal Pradesh",
        "gatewayLocation": "Manali",
        "locations": ["Manali", "Kasol", "McLeod Ganj"],
        "corridorOrder": ["Manali", "Kasol", "McLeod Ganj"],
        "travelMinutes": {
            "Manali::Kasol": 165,
            "Manali::McLeod Ganj": 420,
            "Kasol::McLeod Ganj": 390,
        },
    },
}

RAW_PLACES = [
    {
        "id": "kerala_004",
        "name": "Fort Kochi",
        "city": "Kochi",
        "state": "Kerala",
        "category": "Heritage",
        "mood": ["cultural", "foodie", "photogenic"],
        "ideal_for": ["family", "couples", "solo"],
        "budget_level": 2,
        "best_months": ["Nov", "Dec", "Jan", "Feb"],
        "visit_duration_hours": 4,
        "crowd_level": 3,
        "walking_required": 3,
        "family_friendly": True,
        "nightlife_score": 2,
        "adventure_score": 1,
        "cultural_score": 5,
        "day_windows": ["morning", "late afternoon", "evening"],
        "summary": "A walkable heritage quarter with colonial lanes, art cafes, seafood, and Chinese fishing nets.",
        "retrieval_terms": ["heritage", "food", "art", "walkable", "culture", "waterfront"],
        "cost_estimate_inr": 1300,
    },
    {
        "id": "kerala_003",
        "name": "Munnar Tea Gardens",
        "city": "Munnar",
        "state": "Kerala",
        "category": "Nature",
        "mood": ["peaceful", "scenic", "nature-focused"],
        "ideal_for": ["couples", "family", "solo"],
        "budget_level": 2,
        "best_months": ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"],
        "visit_duration_hours": 5,
        "crowd_level": 3,
        "walking_required": 3,
        "family_friendly": True,
        "nightlife_score": 1,
        "adventure_score": 2,
        "cultural_score": 2,
        "day_windows": ["morning", "afternoon"],
        "summary": "Rolling tea hills and viewpoints for cool-weather nature days, photography, and slow drives.",
        "retrieval_terms": ["nature", "tea gardens", "mountains", "cool weather", "family vacation", "scenic"],
        "cost_estimate_inr": 1600,
    },
    {
        "id": "kerala_002",
        "name": "Alleppey Backwaters",
        "city": "Alleppey",
        "state": "Kerala",
        "category": "Backwater",
        "mood": ["romantic", "slow", "restorative"],
        "ideal_for": ["couples", "family", "solo"],
        "budget_level": 3,
        "best_months": ["Nov", "Dec", "Jan", "Feb"],
        "visit_duration_hours": 6,
        "crowd_level": 3,
        "walking_required": 1,
        "family_friendly": True,
        "nightlife_score": 1,
        "adventure_score": 1,
        "cultural_score": 3,
        "day_windows": ["morning", "afternoon", "sunset"],
        "summary": "A slow waterway experience for houseboats, canoe rides, village edges, and sunset calm.",
        "retrieval_terms": ["romantic", "backwaters", "houseboat", "slow travel", "family vacation", "nature"],
        "cost_estimate_inr": 4500,
        "travel_type": "boat",
    },
    {
        "id": "kerala_001",
        "name": "Varkala Cliff",
        "city": "Varkala",
        "state": "Kerala",
        "category": "Beach",
        "mood": ["chill", "scenic", "wellness"],
        "ideal_for": ["solo", "couples", "friends"],
        "budget_level": 2,
        "best_months": ["Nov", "Dec", "Jan", "Feb", "Mar"],
        "visit_duration_hours": 5,
        "crowd_level": 2,
        "walking_required": 3,
        "family_friendly": True,
        "nightlife_score": 2,
        "adventure_score": 2,
        "cultural_score": 2,
        "day_windows": ["morning", "sunset", "evening"],
        "summary": "A laid-back cliff beach with cafes, yoga, sea views, and memorable sunsets.",
        "retrieval_terms": ["cliff beach", "chill beach", "fewer crowds", "sunsets", "wellness", "cafes"],
        "cost_estimate_inr": 1600,
    },
    {
        "id": "kerala_005",
        "name": "Edakkal Caves",
        "city": "Wayanad",
        "state": "Kerala",
        "category": "Heritage",
        "mood": ["curious", "adventurous", "historic"],
        "ideal_for": ["friends", "family", "solo"],
        "budget_level": 1,
        "best_months": ["Oct", "Nov", "Dec", "Jan", "Feb"],
        "visit_duration_hours": 3,
        "crowd_level": 3,
        "walking_required": 4,
        "family_friendly": True,
        "nightlife_score": 1,
        "adventure_score": 3,
        "cultural_score": 4,
        "day_windows": ["morning", "afternoon"],
        "summary": "A cave and rock-art visit mixing a short climb with ancient markings and hill views.",
        "retrieval_terms": ["caves", "history", "rock art", "short trek", "culture"],
        "cost_estimate_inr": 700,
    },
    {
        "id": "rajasthan_001",
        "name": "Amber Fort",
        "city": "Jaipur",
        "state": "Rajasthan",
        "category": "Heritage",
        "mood": ["cultural", "photogenic", "grand"],
        "ideal_for": ["family", "couples", "friends"],
        "budget_level": 2,
        "best_months": ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"],
        "visit_duration_hours": 3,
        "crowd_level": 5,
        "walking_required": 4,
        "family_friendly": True,
        "nightlife_score": 1,
        "adventure_score": 1,
        "cultural_score": 5,
        "day_windows": ["morning", "late afternoon"],
        "summary": "A major Jaipur fort for architecture, royal history, courtyards, and first-time India photos.",
        "retrieval_terms": ["heritage", "fort", "architecture", "family vacation", "photography", "culture"],
        "cost_estimate_inr": 900,
    },
    {
        "id": "rajasthan_002",
        "name": "Hawa Mahal",
        "city": "Jaipur",
        "state": "Rajasthan",
        "category": "Heritage",
        "mood": ["photogenic", "cultural", "iconic"],
        "ideal_for": ["family", "couples", "solo"],
        "budget_level": 1,
        "best_months": ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"],
        "visit_duration_hours": 1.5,
        "crowd_level": 5,
        "walking_required": 2,
        "family_friendly": True,
        "nightlife_score": 1,
        "adventure_score": 1,
        "cultural_score": 5,
        "day_windows": ["morning"],
        "summary": "A fast, iconic old-city photo and heritage stop best paired with nearby bazaars.",
        "retrieval_terms": ["heritage", "photography", "icon", "old city", "family vacation", "culture"],
        "cost_estimate_inr": 400,
    },
    {
        "id": "rajasthan_004",
        "name": "Lake Pichola",
        "city": "Udaipur",
        "state": "Rajasthan",
        "category": "Lake",
        "mood": ["romantic", "scenic", "slow"],
        "ideal_for": ["couples", "family", "solo"],
        "budget_level": 3,
        "best_months": ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"],
        "visit_duration_hours": 3,
        "crowd_level": 3,
        "walking_required": 2,
        "family_friendly": True,
        "nightlife_score": 2,
        "adventure_score": 1,
        "cultural_score": 4,
        "day_windows": ["late afternoon", "sunset", "evening"],
        "summary": "A romantic lakefront experience with boat rides, palace views, cafes, and golden-hour scenery.",
        "retrieval_terms": ["romantic", "lake", "sunset", "couples", "slow travel", "palace view"],
        "cost_estimate_inr": 2800,
        "travel_type": "boat",
    },
    {
        "id": "goa_002",
        "name": "Palolem Beach",
        "city": "Goa",
        "state": "Goa",
        "category": "Beach",
        "mood": ["chill", "romantic", "scenic"],
        "ideal_for": ["couples", "friends", "solo"],
        "budget_level": 2,
        "best_months": ["Nov", "Dec", "Jan", "Feb", "Mar"],
        "visit_duration_hours": 5,
        "crowd_level": 2,
        "walking_required": 2,
        "family_friendly": True,
        "nightlife_score": 2,
        "adventure_score": 3,
        "cultural_score": 1,
        "day_windows": ["afternoon", "sunset", "evening"],
        "summary": "A relaxed crescent beach for quiet swims, kayaking, seafood shacks, and soft sunsets.",
        "retrieval_terms": ["chill beach", "fewer crowds", "sunset", "quiet beach", "romantic beach"],
        "cost_estimate_inr": 1500,
    },
    {
        "id": "goa_001",
        "name": "Baga Beach",
        "city": "Goa",
        "state": "Goa",
        "category": "Beach",
        "mood": ["party", "social", "energetic"],
        "ideal_for": ["friends", "solo", "couples"],
        "budget_level": 2,
        "best_months": ["Nov", "Dec", "Jan", "Feb"],
        "visit_duration_hours": 4,
        "crowd_level": 5,
        "walking_required": 2,
        "family_friendly": True,
        "nightlife_score": 5,
        "adventure_score": 3,
        "cultural_score": 1,
        "day_windows": ["afternoon", "evening", "night"],
        "summary": "A high-energy party beach with shacks, water sports, nightlife, and dense evening crowds.",
        "retrieval_terms": ["party beach", "nightlife", "groups", "beach shacks", "water sports"],
        "cost_estimate_inr": 1800,
    },
    {
        "id": "himachal_003",
        "name": "Solang Valley",
        "city": "Manali",
        "state": "Himachal Pradesh",
        "category": "Adventure",
        "mood": ["adventurous", "family-friendly", "scenic"],
        "ideal_for": ["family", "friends", "couples"],
        "budget_level": 3,
        "best_months": ["Dec", "Jan", "Feb", "May", "Jun"],
        "visit_duration_hours": 5,
        "crowd_level": 4,
        "walking_required": 3,
        "family_friendly": True,
        "nightlife_score": 1,
        "adventure_score": 5,
        "cultural_score": 1,
        "day_windows": ["morning", "afternoon"],
        "summary": "A popular Manali adventure zone for snow views, paragliding, ATV rides, and family action.",
        "retrieval_terms": ["adventure", "paragliding", "snow", "family vacation", "scenic", "active trip"],
        "cost_estimate_inr": 3000,
    },
]


def enriched_travel_places() -> list[dict]:
    return [enrich_place(place) for place in RAW_PLACES]


def enrich_place(place: dict) -> dict:
    result = deepcopy(place)
    result["country"] = result.get("country", "India")
    result["region"] = result.get("region", result.get("state") or result["city"])
    result["destination"] = result.get("destination", result["city"])
    result["routeLocation"] = result.get("route_location", result["city"])
    result["visitDuration"] = result.get("visitDuration", result["visit_duration_hours"])
    result["visitDurationHours"] = result["visitDuration"]
    result["durationMinutes"] = round(result["visitDuration"] * 60)
    result["openingTime"] = result.get("openingTime", infer_opening_time(result))
    result["closingTime"] = result.get("closingTime", infer_closing_time(result))
    result["fatigueScore"] = result.get("fatigueScore", result["walking_required"])
    result["travelType"] = result.get("travel_type", infer_travel_type(result))
    result["idealTime"] = result.get("idealTime", infer_ideal_time(result))
    result["indoorOutdoor"] = result.get("indoor_outdoor", "outdoor")
    result["clusterPriority"] = result.get("clusterPriority", cluster_priority(result))
    result["estimatedCost"] = result.get("cost_estimate_inr", 0)
    result["retrievalTerms"] = result.get("retrieval_terms", [])
    result["bestFor"] = result.get("ideal_for", [])
    result["tags"] = sorted(
        {
            result["category"].lower(),
            *result.get("mood", []),
            *result.get("ideal_for", []),
            *result.get("retrieval_terms", []),
            budget_band(result["budget_level"]),
        }
    )
    result["semantic_summary"] = " ".join(
        [
            f"{result['name']} is a {result['category'].lower()} in {result['city']}.",
            f"Mood: {', '.join(result['mood'])}.",
            f"Ideal for: {', '.join(result['ideal_for'])}.",
            result["summary"],
        ]
    )
    return result


def get_place(place_id: str) -> dict | None:
    return next((place for place in enriched_travel_places() if place["id"] == place_id), None)


def infer_ideal_time(place: dict) -> str:
    windows = place.get("day_windows", [])
    for window in ["sunset", "morning", "late afternoon", "afternoon", "evening", "night"]:
        if window in windows:
            return window
    return "morning"


def infer_opening_time(place: dict) -> str:
    windows = place.get("day_windows", [])
    if place["category"] == "Temple":
        return "06:00"
    if "night" in windows or "evening" in windows:
        return "10:00"
    if "sunset" in windows and "morning" not in windows:
        return "12:00"
    return "09:00"


def infer_closing_time(place: dict) -> str:
    windows = place.get("day_windows", [])
    if "night" in windows:
        return "23:30"
    if "evening" in windows or "sunset" in windows:
        return "20:00"
    if len(windows) == 1 and "morning" in windows:
        return "12:30"
    if "late afternoon" in windows:
        return "18:30"
    return "18:00"


def infer_travel_type(place: dict) -> str:
    if place["category"] in {"Backwater", "Lake"}:
        return "boat"
    if place["category"] in {"Trek"} or place["walking_required"] >= 4:
        return "walking"
    if place["category"] in {"Heritage", "Market", "Temple", "Village", "Promenade"}:
        return "walking"
    return "mixed"


def cluster_priority(place: dict) -> int:
    priority = 58 + place["cultural_score"] * 4 + place["adventure_score"] * 3 + place["nightlife_score"] * 2
    if "hidden" in place.get("mood", []):
        priority += 8
    if place.get("family_friendly"):
        priority += 4
    return min(priority, 96)


def budget_band(level: int) -> str:
    if level <= 1:
        return "low"
    if level == 2:
        return "medium"
    if level == 3:
        return "upper-medium"
    return "premium"
