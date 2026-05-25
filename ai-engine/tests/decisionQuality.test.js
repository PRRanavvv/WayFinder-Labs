import assert from "node:assert/strict";
import {
  createScoringConfig,
  evaluateCandidateConstraints,
  optimizeItinerary,
  rankCandidates,
  runDecisionQualityFlow,
  updatePreferenceProfile,
  validateOptimizedItinerary
} from "../src/index.js";
import { demoPlaces } from "../src/samplePlaces.js";

const tripIntent = {
  destination: "Jaipur",
  query: "slow Jaipur plan with food, culture, indoor backup, and low fatigue",
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
      foodExploration: 0.72,
      heritagePreference: 0.54,
      fatigueTolerance: 0.38,
      recoveryPreference: 0.74
    },
    confidence: {
      profileConfidence: 0.46
    }
  },
  {
    type: "recovery_added",
    activityType: "food"
  }
);

const scoringConfig = createScoringConfig({ profile: "slowTravel" });

assert.equal(scoringConfig.profile, "slowTravel");
assert.equal(Math.round(Object.values(scoringConfig.weights).reduce((sum, value) => sum + value, 0) * 100), 100);

const ranking = rankCandidates({
  candidates: demoPlaces,
  tripIntent,
  preferenceProfile,
  scoringProfile: "slowTravel"
});

assert.ok(ranking.rankedCandidates[0].decisionScore >= ranking.rankedCandidates[1].decisionScore);
assert.ok(ranking.rankedCandidates[0].scoreContributions);
assert.ok(["high", "medium", "low"].includes(ranking.rankedCandidates[0].decisionConfidence));

const constraintReport = evaluateCandidateConstraints({
  candidate: ranking.rankedCandidates[0],
  tripIntent,
  slot: {
    time: "13:00",
    window: "lunch",
    kind: "meal"
  }
});

assert.equal(typeof constraintReport.feasible, "boolean");
assert.ok(constraintReport.constraintScore >= 0);

const optimization = optimizeItinerary({
  rankedCandidates: ranking.rankedCandidates,
  tripIntent,
  days: 1,
  activitiesPerDay: 3
});

assert.ok(optimization.optimizedItinerary.days[0].activities.length > 0);
assert.ok(optimization.decisionTrace.decisions.length > 0);

const feasibility = validateOptimizedItinerary({
  itinerary: optimization.optimizedItinerary,
  tripIntent
});

assert.equal(feasibility.valid, true);

const flow = await runDecisionQualityFlow({
  tripIntent,
  preferenceProfile,
  topK: 8,
  days: 1
});

assert.equal(flow.stage, "decision-quality");
assert.equal(flow.feasibility.valid, true);
assert.ok(flow.qualityMetrics.optimizationQuality.scheduledActivityCount > 0);
assert.ok(flow.optimizedItinerary.days[0].activities[0].recommendationExplanation.selectedBecause.length > 0);
assert.deepEqual(flow.decisionTraces.map((trace) => trace.stage), ["ranking", "optimization"]);

console.log("Decision quality tests passed");
