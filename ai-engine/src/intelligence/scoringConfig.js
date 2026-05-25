export const scoringDimensions = [
  "semanticRelevance",
  "retrievalConfidence",
  "travelEfficiency",
  "popularity",
  "budgetFit",
  "timingFit",
  "preferenceFit",
  "groupCompatibility",
  "weatherCompatibility",
  "diversityFit"
];

export const defaultScoringWeights = {
  semanticRelevance: 0.17,
  retrievalConfidence: 0.1,
  travelEfficiency: 0.11,
  popularity: 0.05,
  budgetFit: 0.12,
  timingFit: 0.12,
  preferenceFit: 0.14,
  groupCompatibility: 0.06,
  weatherCompatibility: 0.07,
  diversityFit: 0.06
};

export const scoringProfiles = {
  balanced: defaultScoringWeights,
  budgetSensitive: {
    ...defaultScoringWeights,
    budgetFit: 0.2,
    popularity: 0.05,
    semanticRelevance: 0.15
  },
  slowTravel: {
    ...defaultScoringWeights,
    preferenceFit: 0.18,
    timingFit: 0.15,
    travelEfficiency: 0.15,
    popularity: 0.04
  },
  weatherSafe: {
    ...defaultScoringWeights,
    weatherCompatibility: 0.16,
    timingFit: 0.14,
    popularity: 0.04
  }
};

export function createScoringConfig({ profile = "balanced", weights = {} } = {}) {
  const baseWeights = scoringProfiles[profile] || scoringProfiles.balanced;

  return {
    profile,
    dimensions: scoringDimensions,
    weights: normalizeWeights({
      ...baseWeights,
      ...weights
    })
  };
}

export function normalizeWeights(weights) {
  const filteredWeights = Object.fromEntries(
    scoringDimensions.map((dimension) => [dimension, Math.max(weights[dimension] ?? 0, 0)])
  );
  const total = Object.values(filteredWeights).reduce((sum, value) => sum + value, 0);

  if (!total) return defaultScoringWeights;

  return Object.fromEntries(
    Object.entries(filteredWeights).map(([key, value]) => [key, Number((value / total).toFixed(4))])
  );
}
