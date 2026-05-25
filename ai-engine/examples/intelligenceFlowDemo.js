import { runIntelligenceFlow, updatePreferenceProfile } from "../src/index.js";

const tripIntent = {
  query: "balanced Jaipur day with heritage, food, indoor options, and low fatigue",
  interests: ["heritage", "food", "culture"],
  budgetPerDay: 1600,
  activitiesPerDay: 3,
  constraints: {
    pace: "balanced",
    energyLevel: "low",
    timeOfDay: "afternoon",
    weather: "indoor",
    groupType: "friends"
  }
};

const preferenceProfile = updatePreferenceProfile(
  {
    travelStyle: {
      foodExploration: 0.68,
      heritagePreference: 0.64,
      fatigueTolerance: 0.42,
      recoveryPreference: 0.7
    },
    confidence: {
      profileConfidence: 0.38
    }
  },
  {
    type: "high_fatigue_removed",
    activityType: "heritage",
    sentiment: "negative"
  }
);

const result = await runIntelligenceFlow({
  tripIntent,
  preferenceProfile,
  topK: 6
});

console.log(JSON.stringify({
  stage: result.stage,
  retrievedContext: result.retrievedContext.map((record) => ({
    id: record.id,
    sourceId: record.sourceId,
    title: record.title,
    score: record.retrievalScore,
    confidence: record.retrievalConfidence
  })),
  rankedCandidates: result.rankedCandidates.map((candidate) => ({
    id: candidate.id,
    name: candidate.name,
    score: candidate.decisionScore,
    scoreBreakdown: candidate.scoreBreakdown,
    strengths: candidate.decisionReasons.strengths,
    risks: candidate.decisionReasons.risks
  })),
  decisionLogs: result.decisionLogs
}, null, 2));
