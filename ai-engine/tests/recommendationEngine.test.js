import assert from "node:assert/strict";
import {
  createWayfinderRetrievalPipeline,
  enrichedTravelPlaces,
  extractTravelIntent,
  rankDestinationRecommendations
} from "../src/index.js";

const coolMayIntent = extractTravelIntent({
  query: "cool weather destination in May for a family"
});

assert.equal(coolMayIntent.trip_type, "family");
assert.equal(coolMayIntent.month, "may");
assert.equal(coolMayIntent.climate_preference, "cool");

const pipeline = await createWayfinderRetrievalPipeline();
await pipeline.indexPlaces();

const retrievedContext = await pipeline.retrieveContext({
  query: "cheap romantic beach in December with fewer crowds",
  interests: ["beach", "romantic", "budget", "fewer crowds"],
  constraints: {
    budgetBand: "low",
    crowdLevel: "low",
    groupType: "couples",
    season: "winter"
  },
  topK: 8
});

const recommendations = rankDestinationRecommendations({
  candidates: retrievedContext,
  places: enrichedTravelPlaces,
  userPreferences: {
    interests: ["beach", "romantic", "quiet"],
    moods: ["chill", "scenic"]
  },
  budgetConstraints: {
    maxBudgetLevel: 2,
    preferredBudgetLevel: 1
  },
  groupPreferences: {
    groupType: "couples"
  },
  groupMembers: [
    { id: "user_a", interests: ["beach", "budget"], moods: ["romantic"] },
    { id: "user_b", interests: ["nature", "relaxed"], moods: ["quiet"] },
    { id: "user_c", interests: ["photography", "culture"], moods: ["scenic"] }
  ],
  tripLengthDays: 3,
  season: "winter",
  month: "dec",
  travelStyle: {
    pace: "slow",
    primaryIntent: "romantic"
  },
  weightProfile: "couples",
  topK: 5
});

assert.ok(recommendations.length > 0);
assert.ok(recommendations[0].destinationRankingScore >= recommendations[1].destinationRankingScore);
assert.ok(recommendations.every((place) => place.recommendationBreakdown));
assert.ok(recommendations.every((place) => Array.isArray(place.recommendationReasons)));
assert.ok(recommendations.every((place) => place.groupSatisfaction.memberScores.length === 3));
assert.ok(recommendations.some((place) => ["goa_002", "goa_003", "kerala_001"].includes(place.id)));

const coolMayResults = await pipeline.retrieveContext({
  query: "cool weather destination in May for a family",
  topK: 5
});

const coolMayIds = new Set(coolMayResults.map((result) => result.sourceId));
assert.ok(coolMayIds.has("himachal_003") || coolMayIds.has("kerala_003") || coolMayIds.has("karnataka_003"));
assert.ok(coolMayResults[0].retrievalReasons.some((reason) => reason.includes("may") || reason.includes("cool")));

console.log("Recommendation engine tests passed");
