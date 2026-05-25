import { runDecisionQualityFlow, updatePreferenceProfile } from "../src/index.js";

const tripIntent = {
  destination: "Jaipur",
  query: "realistic Jaipur day with culture, food, indoor backup, and low fatigue",
  interests: ["heritage", "food", "culture"],
  budgetPerDay: 1500,
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
      heritagePreference: 0.62,
      fatigueTolerance: 0.4,
      recoveryPreference: 0.72
    },
    confidence: {
      profileConfidence: 0.44
    }
  },
  {
    type: "recovery_added",
    activityType: "food"
  }
);

const result = await runDecisionQualityFlow({
  tripIntent,
  preferenceProfile,
  topK: 8,
  days: 1
});

console.log(JSON.stringify({
  stage: result.stage,
  optimizedItinerary: result.optimizedItinerary.days.map((day) => ({
    day: day.day,
    totalCost: day.totalCost,
    totalFatigue: day.totalFatigue,
    activities: day.activities.map((activity) => ({
      time: activity.time,
      name: activity.name,
      score: activity.decisionScore,
      optimizationScore: activity.optimizationScore,
      cost: activity.estimatedCost,
      fatigue: activity.fatigue,
      explanation: activity.recommendationExplanation
    }))
  })),
  feasibility: result.feasibility,
  qualityMetrics: result.qualityMetrics,
  decisionTraceStages: result.decisionTraces.map((trace) => trace.stage)
}, null, 2));
