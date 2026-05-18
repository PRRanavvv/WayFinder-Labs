import { buildItinerary, rankPlaces, updatePreferenceProfile } from "../src/index.js";

const profile = updatePreferenceProfile(
  {
    travelStyle: {
      foodExploration: 0.62,
      heritagePreference: 0.68,
      fatigueTolerance: 0.44,
      recoveryPreference: 0.58
    },
    confidence: {
      profileConfidence: 0.32
    }
  },
  {
    type: "recovery_added",
    activityType: "food"
  }
);

const rankedPlaces = rankPlaces({
  interests: ["heritage", "food", "photography"],
  preferenceProfile: profile
});

console.log(JSON.stringify(buildItinerary({ rankedPlaces, days: 2 }), null, 2));

