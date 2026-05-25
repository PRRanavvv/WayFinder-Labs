import { buildItinerary, rankPlaces, retrievePlaces, updatePreferenceProfile } from "../src/index.js";

const tripIntent = {
  query: "slow Jaipur trip with heritage, local food, photography, and recovery breaks",
  interests: ["heritage", "food", "photography"],
  constraints: {
    pace: "slow",
    energyLevel: "low",
    timeOfDay: "afternoon",
    weather: "indoor",
    groupType: "friends"
  }
};

const profile = updatePreferenceProfile(
  {
    travelStyle: {
      foodExploration: 0.66,
      heritagePreference: 0.7,
      fatigueTolerance: 0.42,
      recoveryPreference: 0.64
    },
    confidence: {
      profileConfidence: 0.35
    }
  },
  {
    type: "recovery_added",
    activityType: "food"
  }
);

const retrievedPlaces = retrievePlaces({
  ...tripIntent,
  topK: 5
});

const rankedPlaces = rankPlaces({
  interests: tripIntent.interests,
  preferenceProfile: profile,
  places: retrievedPlaces
});

console.log(JSON.stringify({
  intent: tripIntent,
  retrievedPlaces: retrievedPlaces.map((place) => ({
    id: place.id,
    name: place.name,
    retrievalScore: place.retrievalScore,
    retrievalBreakdown: place.retrievalBreakdown,
    retrievalReason: place.retrievalReason
  })),
  itinerary: buildItinerary({ rankedPlaces, days: 2 })
}, null, 2));
