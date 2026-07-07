import unittest

from app.services.explanation_engine import (
    explain_group_preference_fusion,
    explain_recommendation_selection,
    explain_stable_replan,
)
from app.services.group_preference_fusion import build_trip_dna, score_place_against_trip_dna
from app.services.data import enriched_travel_places
from app.services.itinerary_planner import plan_deterministic_itinerary
from app.services.stability_engine import replan_with_stability


class GroupIntelligenceTests(unittest.TestCase):
    def test_group_fusion_stability_and_explanations(self):
        fusion = build_trip_dna({
            "tripContext": {"destination": "Rajasthan", "days": 3, "month": "Jan", "groupType": "friends"},
            "explicitPreferences": {"interests": ["heritage", "food"], "pace": "slow"},
            "groupMembers": [
                {"id": "pranav", "name": "Pranav", "interests": ["heritage", "food", "photography"], "moods": ["slow", "cultural"], "pace": "slow", "budget": 30000},
                {"id": "harsh", "name": "Harsh", "interests": ["nightlife", "food", "social"], "moods": ["energetic"], "pace": "fast", "budget": 60000, "avoid": ["crowds"]},
                {"id": "ayushman", "name": "Ayushman", "interests": ["heritage", "cafes", "quiet"], "moods": ["calm"], "pace": "slow", "budget": 25000, "constraints": {"lowFatigue": True}},
            ],
        })

        self.assertEqual(fusion["stage"], "group-preference-fusion-v1")
        self.assertIn("heritage", fusion["tripDNA"]["softPreferences"])
        self.assertIn("food", fusion["tripDNA"]["softPreferences"])
        self.assertTrue(any(conflict["type"] == "quiet-nightlife" for conflict in fusion["conflicts"]))
        self.assertTrue(any(conflict["type"] == "budget-spread" for conflict in fusion["conflicts"]))
        self.assertTrue(any(target["preference"] == "nightlife" for target in fusion["fairness"]["representationTargets"]))

        amber_fort = next(place for place in enriched_travel_places() if place["id"] == "rajasthan_001")
        place_fit = score_place_against_trip_dna(amber_fort, fusion)
        self.assertGreater(place_fit["score"], 45)
        self.assertIn("heritage", place_fit["matchedPreferences"])

        fusion_explanation = explain_group_preference_fusion(fusion)
        self.assertEqual(fusion_explanation["kind"], "group-preference-fusion")
        self.assertGreaterEqual(len(fusion_explanation["selectedBecause"]), 2)

        itinerary_input = {"destination": "Kerala", "days": 4, "budget": 50000, "group": {"adults": 2, "parents": True}}
        previous = plan_deterministic_itinerary(**itinerary_input)
        affected_day = next(
            day["day"]
            for day in previous["days"]
            if any(activity.get("id") == "kerala_002" for activity in day["activities"])
        )
        stable = replan_with_stability(
            previousItinerary=previous,
            itineraryInput=itinerary_input,
            changes={"openingHours": {"kerala_002": {"closed": True, "source": "mock-places-api"}}},
        )
        self.assertEqual(stable["stage"], "stable-itinerary-replan-v1")
        self.assertTrue(stable["feasibility"]["valid"])
        self.assertIn(affected_day, stable["stabilityReport"]["affectedDays"])
        self.assertFalse(stable["days"][affected_day - 1]["stability"]["preserved"])
        self.assertFalse(any(activity.get("id") == "kerala_002" for activity in stable["days"][affected_day - 1]["activities"]))

        stable_explanation = explain_stable_replan(stable)
        self.assertEqual(stable_explanation["kind"], "stable-replan")
        self.assertIn("accepted places were preserved", stable_explanation["headline"])

        recommendation_explanation = explain_recommendation_selection(
            {
                "name": "Amber Fort",
                "recommendationReasons": ["matches traveler preferences", "strong heritage fit"],
                "recommendationBreakdown": {"preferenceFit": 92, "budgetFit": 82, "groupFit": 88},
                "groupSatisfaction": {
                    "conflictLevel": "medium",
                    "fairnessPenalty": 4,
                    "memberScores": [
                        {"memberId": "pranav", "score": 95},
                        {"memberId": "harsh", "score": 71},
                        {"memberId": "ayushman", "score": 93},
                    ],
                },
                "confidenceLevel": "high",
                "confidenceReasons": ["strong deterministic fit"],
            },
            tripDNA=fusion["tripDNA"],
        )
        self.assertEqual(recommendation_explanation["kind"], "recommendation-selection")
        self.assertTrue(any("pranav" in item for item in recommendation_explanation["whoThisServes"]))


if __name__ == "__main__":
    unittest.main()
