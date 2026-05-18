import { buildItinerary, rankPlaces, updatePreferenceProfile } from "../../../ai-engine/src/index.js";

let memoryProfile = {
  travelStyle: {
    foodExploration: 0.58,
    heritagePreference: 0.64,
    fatigueTolerance: 0.52,
    recoveryPreference: 0.55
  },
  confidence: {
    profileConfidence: 0.18
  }
};

export function createDemoPlan(input = {}) {
  const ranked = rankPlaces({
    destination: input.destination || "Jaipur",
    interests: input.interests || ["heritage", "food", "photography"],
    preferenceProfile: memoryProfile
  });

  return buildItinerary({
    destination: input.destination || "Jaipur",
    rankedPlaces: ranked,
    days: Number(input.days || 2)
  });
}

export function recordInteraction(event = {}) {
  memoryProfile = updatePreferenceProfile(memoryProfile, event);
  return {
    preferenceProfile: memoryProfile,
    note: "This public demo stores memory in process only. Production persistence is intentionally omitted."
  };
}

