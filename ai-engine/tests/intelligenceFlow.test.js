import assert from "node:assert/strict";
import {
  rankCandidates,
  runIntelligenceFlow,
  updatePreferenceProfile
} from "../src/index.js";
import { demoPlaces } from "../src/samplePlaces.js";

const tripIntent = {
  query: "slow Jaipur plan with local food, culture, and indoor recovery",
  interests: ["food", "culture"],
  budgetPerDay: 1400,
  activitiesPerDay: 3,
  constraints: {
    pace: "slow",
    energyLevel: "low",
    timeOfDay: "afternoon",
    weather: "indoor",
    groupType: "friends"
  }
};

const preferenceProfile = updatePreferenceProfile(
  {
    travelStyle: {
      foodExploration: 0.7,
      heritagePreference: 0.54,
      fatigueTolerance: 0.38,
      recoveryPreference: 0.72
    },
    confidence: {
      profileConfidence: 0.42
    }
  },
  {
    type: "recovery_added",
    activityType: "food"
  }
);

const ranking = rankCandidates({
  candidates: demoPlaces,
  tripIntent,
  preferenceProfile
});

assert.equal(ranking.rankedCandidates.length, demoPlaces.length);
assert.ok(ranking.rankedCandidates[0].decisionScore >= ranking.rankedCandidates[1].decisionScore);
assert.ok(ranking.rankedCandidates[0].scoreBreakdown.budgetFit >= 0);
assert.ok(ranking.rankedCandidates[0].scoreBreakdown.preferenceFit >= 0);
assert.equal(ranking.decisionLog.stage, "ranking");
assert.equal(ranking.decisionLog.candidates.length, demoPlaces.length);

const lowBudgetRanking = rankCandidates({
  candidates: demoPlaces,
  tripIntent: {
    ...tripIntent,
    budgetPerDay: 900
  },
  preferenceProfile
});

assert.ok(lowBudgetRanking.rankedCandidates[0].estimatedCost <= 450);

const flow = await runIntelligenceFlow({
  tripIntent,
  preferenceProfile,
  topK: 6
});

assert.equal(flow.stage, "retrieval-to-ranking");
assert.ok(flow.retrievedContext.length > 0);
assert.ok(flow.rankedCandidates.length > 0);
assert.equal(flow.decisionLogs[0].stage, "ranking");
assert.ok(flow.rankedCandidates[0].decisionReasons.strengths.length > 0);

console.log("Intelligence flow tests passed");
