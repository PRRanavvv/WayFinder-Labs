import unittest

from app.services.recommendation_engine import rank_destination_recommendations
from app.services.retrieval_engine import retrieve_context


class RecommendationTests(unittest.TestCase):
    def test_retrieval_to_recommendation_ranking(self):
        retrieved = retrieve_context(
            query="cheap romantic beach in December with fewer crowds",
            interests=["beach", "romantic", "budget", "fewer crowds"],
            constraints={"budgetBand": "low", "groupType": "couples", "season": "winter"},
            topK=8,
        )
        recommendations = rank_destination_recommendations(
            candidates=retrieved,
            userPreferences={"interests": ["beach", "romantic", "quiet"], "moods": ["chill", "scenic"]},
            budgetConstraints={"maxBudgetLevel": 2, "preferredBudgetLevel": 1},
            groupPreferences={"groupType": "couples"},
            groupMembers=[
                {"id": "user_a", "interests": ["beach", "budget"], "moods": ["romantic"]},
                {"id": "user_b", "interests": ["nature", "relaxed"], "moods": ["quiet"]},
                {"id": "user_c", "interests": ["photography", "culture"], "moods": ["scenic"]},
            ],
            tripLengthDays=3,
            season="winter",
            month="dec",
            travelStyle={"pace": "slow", "primaryIntent": "romantic"},
            weightProfile="couples",
            topK=5,
        )
        self.assertGreater(len(recommendations), 0)
        self.assertGreaterEqual(recommendations[0]["destinationRankingScore"], recommendations[-1]["destinationRankingScore"])
        self.assertTrue(all("recommendationBreakdown" in place for place in recommendations))
        self.assertTrue(all("recommendationReasons" in place for place in recommendations))
        self.assertTrue(all(len(place["groupSatisfaction"]["memberScores"]) == 3 for place in recommendations))
        self.assertTrue(any(place["id"] in {"goa_002", "kerala_001"} for place in recommendations))


if __name__ == "__main__":
    unittest.main()
