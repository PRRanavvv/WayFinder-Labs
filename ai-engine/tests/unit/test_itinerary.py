import unittest

from app.engines.itinerary_planner import (
    plan_deterministic_itinerary,
    replan_deterministic_itinerary,
    validate_deterministic_itinerary,
)
from app.providers.static_catalog import enriched_travel_places


class ItineraryPlannerTests(unittest.TestCase):
    def test_kerala_parent_friendly_route(self):
        plan = plan_deterministic_itinerary(
            destination="Kerala",
            days=4,
            budget=50000,
            group={"adults": 2, "parents": True},
        )
        self.assertEqual(plan["stage"], "itinerary-intelligence-v1")
        self.assertEqual(len(plan["days"]), 4)
        self.assertEqual(plan["day1"], plan["days"][0]["activities"])
        self.assertTrue(plan["feasibility"]["valid"])
        self.assertTrue(plan["feasibility"]["routeValid"])
        self.assertEqual(plan["route"]["routeLocations"], ["Kochi", "Munnar", "Alleppey", "Varkala"])
        self.assertLessEqual(plan["totals"]["totalCost"], 50000)

        names = [
            activity["name"] for day in plan["days"] for activity in day["activities"] if activity["kind"] == "place"
        ]
        self.assertIn("Fort Kochi", names)
        self.assertIn("Munnar Tea Gardens", names)
        self.assertIn("Alleppey Backwaters", names)
        self.assertIn("Varkala Cliff", names)
        self.assertNotIn("Edakkal Caves", names)

        for day in plan["days"]:
            self.assertLessEqual(day["totalFatigue"], plan["constraints"]["maxDailyFatigue"])
            self.assertLessEqual(day["totalWalkingHours"], plan["constraints"]["maxDailyWalkingHours"])
            self.assertLessEqual(day["totalCost"], plan["constraints"]["dailyBudgetCap"])

    def test_live_hours_and_replan(self):
        plan = plan_deterministic_itinerary(
            destination="Kerala",
            days=4,
            budget=50000,
            group={"adults": 2, "parents": True},
            openingHours={"kerala_002": {"closed": True}},
        )
        names = [
            activity["name"] for day in plan["days"] for activity in day["activities"] if activity["kind"] == "place"
        ]
        self.assertNotIn("Alleppey Backwaters", names)
        self.assertTrue(any(candidate["id"] == "kerala_002" for candidate in plan["skippedCandidates"]))
        self.assertTrue(validate_deterministic_itinerary(plan)["valid"])

        replanned = replan_deterministic_itinerary(
            itineraryInput={
                "destination": "Kerala",
                "days": 4,
                "budget": 50000,
                "group": {"adults": 2, "parents": True},
            },
            changes={"skipDays": [2], "weather": {"condition": "rain"}},
        )
        self.assertEqual(len(replanned["days"]), 3)
        self.assertEqual(replanned["constraints"]["weatherMode"], "rain")
        self.assertTrue(replanned["feasibility"]["valid"])

    def test_dataset_has_python_schedule_fields(self):
        required = ["id", "name", "visitDuration", "openingTime", "closingTime", "fatigueScore", "travelType"]
        for place in enriched_travel_places():
            missing = [field for field in required if field not in place]
            self.assertEqual(missing, [], f"{place['name']} missing fields")


if __name__ == "__main__":
    unittest.main()
