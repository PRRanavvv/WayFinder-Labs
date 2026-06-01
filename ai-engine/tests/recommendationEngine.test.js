import assert from "node:assert/strict";
import {
  createWayfinderRetrievalPipeline,
  enrichedTravelPlaces,
  rankDestinationRecommendations
} from "../src/index.js";

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
  tripLengthDays: 3,
  season: "winter",
  travelStyle: {
    pace: "slow",
    primaryIntent: "romantic"
  },
  topK: 5
});

assert.ok(recommendations.length > 0);
assert.ok(recommendations[0].destinationRankingScore >= recommendations[1].destinationRankingScore);
assert.ok(recommendations.every((place) => place.recommendationBreakdown));
assert.ok(recommendations.every((place) => Array.isArray(place.recommendationReasons)));
assert.ok(recommendations.some((place) => ["goa_002", "goa_003", "kerala_001"].includes(place.id)));

console.log("Recommendation engine tests passed");
