import { demoPlaces } from "../samplePlaces.js";
import { clamp, normalizeText } from "../retrieval/textUtils.js";
import { createDecisionLog } from "./decisionLogger.js";

export const defaultDecisionWeights = {
  semanticRelevance: 0.18,
  retrievalConfidence: 0.12,
  travelEfficiency: 0.12,
  popularity: 0.08,
  budgetFit: 0.12,
  timingFit: 0.12,
  preferenceFit: 0.14,
  groupCompatibility: 0.08,
  weatherCompatibility: 0.08,
  diversityFit: 0.06
};

export function rankCandidates({
  candidates = demoPlaces,
  retrievedContext = [],
  tripIntent = {},
  preferenceProfile = {},
  selectedContext = {},
  weights = defaultDecisionWeights
} = {}) {
  const retrievalBySourceId = summarizeRetrievedContext(retrievedContext);

  const rankedCandidates = candidates
    .map((candidate) => scoreCandidate({
      candidate,
      retrievalSignal: retrievalBySourceId.get(candidate.id),
      tripIntent,
      preferenceProfile,
      selectedContext,
      weights
    }))
    .sort((a, b) => b.decisionScore - a.decisionScore);

  return {
    rankedCandidates,
    decisionLog: createDecisionLog({
      stage: "ranking",
      intent: tripIntent,
      weights,
      candidates: rankedCandidates,
      notes: [
        "Ranking is deterministic and uses public-safe scoring heuristics.",
        "The LLM should explain these decisions later, not replace this scoring layer."
      ]
    })
  };
}

function scoreCandidate({
  candidate,
  retrievalSignal,
  tripIntent,
  preferenceProfile,
  selectedContext,
  weights
}) {
  const scoreBreakdown = roundBreakdown({
    semanticRelevance: semanticRelevance(candidate, tripIntent),
    retrievalConfidence: retrievalConfidence(retrievalSignal),
    travelEfficiency: travelEfficiency(candidate),
    popularity: candidate.popularity ?? 65,
    budgetFit: budgetFit(candidate, tripIntent),
    timingFit: timingFit(candidate, tripIntent),
    preferenceFit: preferenceFit(candidate, preferenceProfile),
    groupCompatibility: groupCompatibility(candidate, tripIntent),
    weatherCompatibility: weatherCompatibility(candidate, tripIntent),
    diversityFit: diversityFit(candidate, selectedContext)
  });

  const decisionScore = weightedAverage(scoreBreakdown, weights);
  const decisionReasons = explainDecision(candidate, scoreBreakdown);

  return {
    ...candidate,
    score: Number(decisionScore.toFixed(2)),
    decisionScore: Number(decisionScore.toFixed(2)),
    scoreBreakdown,
    decisionReasons,
    explanation: `${candidate.name} is recommended because ${decisionReasons.strengths.slice(0, 2).join(" and ")}.`
  };
}

function semanticRelevance(candidate, tripIntent) {
  const interests = tripIntent.interests || [];
  if (!interests.length) return 70;

  const terms = new Set([
    candidate.type,
    candidate.role,
    ...(candidate.tags || []),
    ...(candidate.bestFor || []),
    ...(candidate.retrievalTerms || [])
  ].map(normalizeText));

  const matches = interests.filter((interest) => terms.has(normalizeText(interest))).length;
  return clamp(48 + (matches / interests.length) * 48, 0, 100);
}

function retrievalConfidence(signal) {
  if (!signal) return 45;
  return clamp(signal.averageScore, 0, 100);
}

function travelEfficiency(candidate) {
  const clusterScore = candidate.clusterPriority ?? 70;
  const travelPenalty = Math.min(candidate.travelTimeFromCenterMinutes ?? 25, 60) * 0.55;
  return clamp(clusterScore - travelPenalty + 20, 0, 100);
}

function budgetFit(candidate, tripIntent) {
  const budgetPerDay = tripIntent.budgetPerDay ?? 1800;
  const targetActivityBudget = budgetPerDay / Math.max(tripIntent.activitiesPerDay ?? 3, 1);
  const estimatedCost = candidate.estimatedCost ?? targetActivityBudget;
  const overBudgetRatio = Math.max(0, estimatedCost - targetActivityBudget) / targetActivityBudget;
  const underBudgetBonus = estimatedCost <= targetActivityBudget ? 10 : 0;

  return clamp(88 + underBudgetBonus - overBudgetRatio * 70, 0, 100);
}

function timingFit(candidate, tripIntent) {
  const timeOfDay = tripIntent.constraints?.timeOfDay;
  const windows = (candidate.openingWindows || candidate.dayWindows || []).map(normalizeText);
  if (!timeOfDay) return 74;
  if (windows.includes(normalizeText(timeOfDay))) return 96;
  if (timeOfDay === "afternoon" && windows.includes("late afternoon")) return 84;
  if (timeOfDay === "evening" && windows.includes("early evening")) return 84;
  return 52;
}

function preferenceFit(candidate, preferenceProfile) {
  const style = preferenceProfile.travelStyle || {};
  let score = 66;

  if (candidate.type === "food") score += ((style.foodExploration ?? 0.5) - 0.5) * 38;
  if (candidate.type === "heritage") score += ((style.heritagePreference ?? 0.5) - 0.5) * 38;
  if (candidate.role === "recovery") score += ((style.recoveryPreference ?? 0.5) - 0.5) * 34;

  const tolerance = style.fatigueTolerance ?? 0.5;
  if (candidate.fatigue > tolerance) score -= (candidate.fatigue - tolerance) * 45;
  if (candidate.fatigue <= tolerance) score += 8;

  const confidence = preferenceProfile.confidence?.profileConfidence ?? 0.25;
  return clamp(66 + (score - 66) * Math.max(confidence, 0.25), 0, 100);
}

function groupCompatibility(candidate, tripIntent) {
  const groupType = tripIntent.constraints?.groupType;
  if (!groupType) return 72;
  return (candidate.groupFit || []).map(normalizeText).includes(normalizeText(groupType)) ? 94 : 58;
}

function weatherCompatibility(candidate, tripIntent) {
  const weather = tripIntent.constraints?.weather;
  if (weather === "indoor" && candidate.indoorOutdoor === "indoor") return 98;
  if (weather === "indoor" && candidate.indoorOutdoor === "mixed") return 88;
  if (weather === "outdoor" && candidate.indoorOutdoor === "outdoor") return 92;
  return candidate.weatherFit ?? 72;
}

function diversityFit(candidate, selectedContext) {
  const usedTypes = new Set(selectedContext.usedTypes || []);
  const usedRoles = new Set(selectedContext.usedRoles || []);
  let score = 82;

  if (usedTypes.has(candidate.type)) score -= 20;
  if (usedRoles.has(candidate.role)) score -= 14;

  return clamp(score, 35, 100);
}

function summarizeRetrievedContext(retrievedContext) {
  const bySourceId = new Map();

  for (const record of retrievedContext) {
    const current = bySourceId.get(record.sourceId) || {
      totalScore: 0,
      count: 0,
      maxScore: 0
    };

    current.totalScore += record.retrievalScore ?? 0;
    current.count += 1;
    current.maxScore = Math.max(current.maxScore, record.retrievalScore ?? 0);
    bySourceId.set(record.sourceId, current);
  }

  for (const [sourceId, summary] of bySourceId.entries()) {
    bySourceId.set(sourceId, {
      ...summary,
      averageScore: summary.totalScore / summary.count
    });
  }

  return bySourceId;
}

function explainDecision(candidate, scoreBreakdown) {
  const sorted = Object.entries(scoreBreakdown).sort((a, b) => b[1] - a[1]);
  const strengths = sorted
    .filter(([, score]) => score >= 82)
    .slice(0, 3)
    .map(([dimension]) => humanizeDimension(dimension));
  const risks = sorted
    .filter(([, score]) => score < 58)
    .slice(0, 2)
    .map(([dimension]) => humanizeDimension(dimension));

  return {
    strengths: strengths.length ? strengths : [`balanced fit for ${candidate.role} planning`],
    risks
  };
}

function humanizeDimension(dimension) {
  return dimension.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`);
}

function weightedAverage(breakdown, weights) {
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
  return Object.entries(weights).reduce(
    (sum, [key, weight]) => sum + (breakdown[key] ?? 0) * weight,
    0
  ) / totalWeight;
}

function roundBreakdown(breakdown) {
  return Object.fromEntries(
    Object.entries(breakdown).map(([key, value]) => [key, Number(value.toFixed(2))])
  );
}
