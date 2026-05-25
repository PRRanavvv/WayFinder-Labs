import { demoPlaces } from "./samplePlaces.js";

const defaultWeights = {
  semanticFit: 0.38,
  adaptiveFit: 0.22,
  pacingFit: 0.18,
  clusterFit: 0.14,
  weatherFit: 0.08
};

export function rankPlaces({
  interests = [],
  preferenceProfile = {},
  weights = defaultWeights,
  places = demoPlaces
} = {}) {
  const normalizedInterests = interests.map(normalize);

  return places
    .map((place) => {
      const breakdown = {
        semanticFit: semanticFit(place, normalizedInterests),
        adaptiveFit: adaptiveFit(place, preferenceProfile),
        pacingFit: pacingFit(place, preferenceProfile),
        clusterFit: place.clusterPriority,
        weatherFit: place.weatherFit
      };
      const score = weightedAverage(breakdown, weights);

      return {
        ...place,
        score: Number(score.toFixed(2)),
        scoreBreakdown: breakdown,
        explanation: explainScore(place, breakdown)
      };
    })
    .sort((a, b) => b.score - a.score);
}

function semanticFit(place, interests) {
  if (!interests.length) return 70;
  const tags = new Set([place.type, ...place.tags].map(normalize));
  const matches = interests.filter((interest) => tags.has(interest)).length;
  return 50 + (matches / interests.length) * 45;
}

function adaptiveFit(place, profile) {
  const style = profile.travelStyle || {};
  let score = 68;

  if (place.type === "food") score += ((style.foodExploration ?? 0.5) - 0.5) * 35;
  if (place.type === "heritage") score += ((style.heritagePreference ?? 0.5) - 0.5) * 35;
  if (place.role === "recovery") score += ((style.recoveryPreference ?? 0.5) - 0.5) * 28;
  if (place.fatigue > 0.65) score += ((style.fatigueTolerance ?? 0.5) - 0.5) * 30;

  const confidence = profile.confidence?.profileConfidence ?? 0;
  return clamp(68 + (score - 68) * confidence, 0, 100);
}

function pacingFit(place, profile) {
  const tolerance = profile.travelStyle?.fatigueTolerance ?? 0.5;
  const fatiguePenalty = Math.max(0, place.fatigue - tolerance) * 42;
  return clamp(92 - fatiguePenalty, 0, 100);
}

function weightedAverage(breakdown, weights) {
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
  return Object.entries(weights).reduce(
    (sum, [key, weight]) => sum + breakdown[key] * weight,
    0
  ) / totalWeight;
}

function explainScore(place, breakdown) {
  const strongest = Object.entries(breakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([key]) => key);

  return `${place.name} ranks well for ${strongest.join(" and ")} in this public demo.`;
}

const normalize = (value) => String(value || "").trim().toLowerCase();
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
