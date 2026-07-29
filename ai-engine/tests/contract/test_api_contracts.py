import unittest

from fastapi.testclient import TestClient

from app.main import app


class ApiContractTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["runtime"], "python-fastapi")

    def test_fusion_endpoint(self):
        response = self.client.post(
            "/v1/fuse-preferences",
            json={
                "tripContext": {"destination": "Rajasthan", "days": 3},
                "groupMembers": [
                    {"id": "a", "interests": ["heritage", "food"]},
                    {"id": "b", "interests": ["food", "nightlife"]},
                ],
            },
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["fusion"]["stage"], "group-preference-fusion-v1")
        self.assertEqual(body["explanation"]["kind"], "group-preference-fusion")

    def test_itinerary_endpoint(self):
        response = self.client.post(
            "/v1/itinerary",
            json={"destination": "Kerala", "days": 2, "budget": 30000, "group": {"adults": 2}},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["stage"], "itinerary-intelligence-v1")


if __name__ == "__main__":
    unittest.main()
