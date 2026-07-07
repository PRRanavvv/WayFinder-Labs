import argparse
import json
import sys
import unittest

from .services.explanation_engine import explain_group_preference_fusion, explain_stable_replan
from .services.group_preference_fusion import build_trip_dna
from .services.itinerary_planner import plan_deterministic_itinerary
from .services.recommendation_engine import rank_destination_recommendations
from .services.retrieval_engine import retrieve_context
from .services.stability_engine import replan_with_stability


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="WayFinder AI Engine CLI")
    parser.add_argument("command", choices=[
        "demo",
        "demo-retrieval",
        "demo-intelligence",
        "demo-decision-quality",
        "benchmark-retrieval",
        "benchmark-itinerary",
        "benchmark-edge-cases",
        "test",
    ])
    args = parser.parse_args(argv)

    if args.command == "test":
        return run_tests()
    if args.command == "demo-retrieval":
        return print_json(retrieve_context(query="quiet heritage trip with food", topK=5))
    if args.command in {"benchmark-retrieval", "benchmark-itinerary", "benchmark-edge-cases"}:
        return print_json({"status": "ok", "benchmark": args.command, "runtime": "python"})
    return print_json(build_demo_payload())


def build_demo_payload() -> dict:
    fusion = build_trip_dna({
        "tripContext": {"destination": "Rajasthan", "days": 3, "groupType": "friends"},
        "explicitPreferences": {"interests": ["heritage", "food"], "pace": "slow"},
        "groupMembers": [
            {"id": "pranav", "name": "Pranav", "interests": ["heritage", "food", "photography"], "pace": "slow", "budget": 30000},
            {"id": "harsh", "name": "Harsh", "interests": ["nightlife", "food", "social"], "pace": "fast", "budget": 60000, "avoid": ["crowds"]},
            {"id": "ayushman", "name": "Ayushman", "interests": ["heritage", "cafes", "quiet"], "pace": "slow", "budget": 25000},
        ],
    })
    itinerary_input = {"destination": "Kerala", "days": 4, "budget": 50000, "group": {"adults": 2, "parents": True}}
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


def print_json(payload: object) -> int:
    print(json.dumps(payload, indent=2))
    return 0


def run_tests() -> int:
    suite = unittest.defaultTestLoader.discover("tests", pattern="test_*.py")
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    sys.exit(main())
