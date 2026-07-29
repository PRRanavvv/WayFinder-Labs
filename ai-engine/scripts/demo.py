import json

from app.engines.explanation_engine import explain_group_preference_fusion, explain_stable_replan
from app.engines.group_preference_fusion import build_trip_dna
from app.engines.itinerary_planner import plan_deterministic_itinerary
from app.engines.recommendation_engine import rank_destination_recommendations
from app.engines.stability_engine import replan_with_stability


def build_demo_payload() -> dict:
    fusion = build_trip_dna(
        {
            "tripContext": {"destination": "Rajasthan", "days": 3, "groupType": "friends"},
            "explicitPreferences": {"interests": ["heritage", "food"], "pace": "slow"},
            "groupMembers": [
                {
                    "id": "pranav",
                    "name": "Pranav",
                    "interests": ["heritage", "food", "photography"],
                    "pace": "slow",
                    "budget": 30_000,
                },
                {
                    "id": "harsh",
                    "name": "Harsh",
                    "interests": ["nightlife", "food", "social"],
                    "pace": "fast",
                    "budget": 60_000,
                    "avoid": ["crowds"],
                },
                {
                    "id": "ayushman",
                    "name": "Ayushman",
                    "interests": ["heritage", "cafes", "quiet"],
                    "pace": "slow",
                    "budget": 25_000,
                },
            ],
        }
    )
    itinerary_input = {
        "destination": "Kerala",
        "days": 4,
        "budget": 50_000,
        "group": {"adults": 2, "parents": True},
    }
    plan = plan_deterministic_itinerary(**itinerary_input)
    stable = replan_with_stability(
        previousItinerary=plan,
        itineraryInput=itinerary_input,
        changes={"openingHours": {"kerala_002": {"closed": True}}},
    )
    recommendations = rank_destination_recommendations(
        userPreferences={"interests": fusion["tripDNA"]["softPreferences"]},
        groupPreferences={"groupType": "friends"},
        topK=3,
    )
    return {
        "fusion": fusion,
        "fusionExplanation": explain_group_preference_fusion(fusion),
        "stableReplan": stable["stabilityReport"],
        "stableExplanation": explain_stable_replan(stable),
        "recommendations": recommendations,
    }


def main() -> int:
    print(json.dumps(build_demo_payload(), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
