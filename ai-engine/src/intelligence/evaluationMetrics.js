import { validateOptimizedItinerary } from "./constraintEngine.js";

export function evaluateDecisionQuality({
  rankedCandidates = [],
  optimizedItinerary = {},
  tripIntent = {},
  decisionTraces = []
} = {}) {
  const scheduledActivities = (optimizedItinerary.days || []).flatMap((day) => day.activities || []);
  const feasibility = validateOptimizedItinerary({ itinerary: optimizedItinerary, tripIntent });

  return {
    generatedAt: new Date().toISOString(),
    rankingQuality: rankingQuality(rankedCandidates),
    optimizationQuality: optimizationQuality(scheduledActivities, tripIntent, feasibility),
    explainabilityQuality: explainabilityQuality(scheduledActivities, decisionTraces),
    feasibility
  };
}

function rankingQuality(rankedCandidates) {
  if (!rankedCandidates.length) {
    return {
      averageDecisionScore: 0,
      averageConfidenceScore: 0
    };
  }

  return {
    averageDecisionScore: average(rankedCandidates.map((candidate) => candidate.decisionScore || 0)),
    averageConfidenceScore: average(rankedCandidates.map(confidenceToScore))
  };
}

function optimizationQuality(activities, tripIntent, feasibility) {
  const budgetPerDay = tripIntent.budgetPerDay || 0;
  const totalCost = activities.reduce((sum, activity) => sum + (activity.estimatedCost || 0), 0);
  const types = new Set(activities.map((activity) => activity.type));
  const totalFatigue = activities.reduce((sum, activity) => sum + (activity.fatigue || 0), 0);
  const maxPossibleDiversity = Math.max(activities.length, 1);

  return {
    scheduledActivityCount: activities.length,
    budgetUseRatio: budgetPerDay ? Number((totalCost / budgetPerDay).toFixed(3)) : null,
    activityDiversity: Number((types.size / maxPossibleDiversity).toFixed(3)),
    totalFatigue: Number(totalFatigue.toFixed(2)),
    feasibilityScore: feasibility.valid ? 100 : 60
  };
}

function explainabilityQuality(activities, decisionTraces) {
  const explainedActivities = activities.filter((activity) => activity.explanation || activity.recommendationExplanation);

  return {
    explainedActivityRatio: activities.length
      ? Number((explainedActivities.length / activities.length).toFixed(3))
      : 0,
    decisionTraceCount: decisionTraces.length
  };
}

function confidenceToScore(candidate) {
  if (candidate.decisionConfidence === "high") return 100;
  if (candidate.decisionConfidence === "medium") return 72;
  return 45;
}

function average(values) {
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}
