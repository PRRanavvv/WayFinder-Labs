import { enrichedTravelPlaces } from "../datasets/enrichedPlaces.js";
import { clamp, normalizeText, tokenize } from "../retrieval/textUtils.js";

export const defaultRecommendationWeights = {
  retrievalFit: 0.25,
  preferenceFit: 0.24,
  budgetFit: 0.16,
  groupFit: 0.14,
  seasonFit: 0.12,
  tripFit: 0.09
};

export function rankDestinationRecommendations({
  candidates,
  places = enrichedTravelPlaces,
  userPreferences = {},
  budgetConstraints = {},
  groupPreferences = {},
  tripLengthDays = 3,
  season,
  travelStyle = {},
  weights = defaultRecommendationWeights,
  topK = 10
} = {}) {
  const placeLookup = new Map(places.map((place) => [place.id, place]));
  const resolvedCandidates = resolveCandidates(candidates, places, placeLookup);

  return resolvedCandidates
    .map(({ place, retrievalRecord }) => {
      const breakdown = {
        retrievalFit: retrievalFit(retrievalRecord),
        preferenceFit: preferenceFit(place, { userPreferences, travelStyle }),
        budgetFit: budgetFit(place, budgetConstraints),
        groupFit: groupFit(place, groupPreferences),
        seasonFit: seasonFit(place, season),
        tripFit: tripFit(place, tripLengthDays)
      };
      const destinationRankingScore = weightedAverage(breakdown, weights);

      return {
        ...place,
        destinationRankingScore: Number(destinationRankingScore.toFixed(2)),
        recommendationBreakdown: breakdown,
        recommendationReasons: explainRecommendation(place, breakdown)
      };
    })
    .sort((a, b) => b.destinationRankingScore - a.destinationRankingScore)
    .slice(0, topK);
}

function resolveCandidates(candidates, places, placeLookup) {
  if (!candidates?.length) {
    return places.map((place) => ({ place, retrievalRecord: null }));
  }

  return candidates
    .map((candidate) => {
      const placeId = candidate.sourceId || candidate.id;
      const place = placeLookup.get(placeId) || candidate;
      return { place, retrievalRecord: candidate.sourceId ? candidate : null };
    })
    .filter(({ place }) => place?.id);
}

function retrievalFit(record) {
  if (!record?.retrievalScore) return 68;
  return clamp(record.retrievalScore, 0, 100);
}

function preferenceFit(place, { userPreferences = {}, travelStyle = {} }) {
  const interests = [
    ...(userPreferences.interests || []),
    ...(userPreferences.moods || []),
    travelStyle.pace,
    travelStyle.primaryIntent
  ].filter(Boolean);

  if (!interests.length) return 70;

  const placeTerms = new Set(tokenize([
    place.category,
    place.role,
    ...(place.mood || []),
    ...(place.tags || []),
    ...(place.retrievalTerms || [])
  ].join(" ")));
  const matches = interests
    .flatMap((interest) => tokenize(interest))
    .filter((term) => placeTerms.has(term)).length;

  return clamp(52 + (matches / Math.max(interests.length, 1)) * 48, 0, 100);
}

function budgetFit(place, budgetConstraints = {}) {
  const maxBudgetLevel = budgetConstraints.maxBudgetLevel;
  const preferredBudgetLevel = budgetConstraints.preferredBudgetLevel;

  if (!maxBudgetLevel && !preferredBudgetLevel) return 72;
  if (maxBudgetLevel && place.budget_level > maxBudgetLevel) {
    return clamp(62 - (place.budget_level - maxBudgetLevel) * 18, 0, 100);
  }
  if (preferredBudgetLevel) {
    return clamp(96 - Math.abs(place.budget_level - preferredBudgetLevel) * 16, 0, 100);
  }

  return 88;
}

function groupFit(place, groupPreferences = {}) {
  const groupType = normalizeText(groupPreferences.groupType || groupPreferences.primaryGroup);
  if (!groupType) return 72;

  const idealFor = new Set((place.ideal_for || place.bestFor || []).map(normalizeText));
  if (idealFor.has(groupType)) return 95;
  if (groupType === "family" && place.family_friendly) return 88;

  return 55;
}

function seasonFit(place, season) {
  if (!season) return 72;

  const requestedMonths = seasonToMonths(season);
  const bestMonths = new Set((place.best_months || []).map(normalizeMonth));
  const matches = requestedMonths.filter((month) => bestMonths.has(month)).length;

  if (!requestedMonths.length) return 72;
  return clamp(48 + (matches / requestedMonths.length) * 52, 0, 100);
}

function tripFit(place, tripLengthDays) {
  const totalTripHours = Math.max(Number(tripLengthDays) || 1, 1) * 8;
  const durationShare = place.visit_duration_hours / totalTripHours;

  if (durationShare <= 0.18) return 94;
  if (durationShare <= 0.32) return 84;
  if (durationShare <= 0.5) return 72;
  return 58;
}

function weightedAverage(breakdown, weights) {
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
  return Object.entries(weights).reduce(
    (sum, [key, weight]) => sum + (breakdown[key] || 0) * weight,
    0
  ) / totalWeight;
}

function explainRecommendation(place, breakdown) {
  const reasons = [];

  if (breakdown.preferenceFit >= 82) reasons.push("matches traveler preferences");
  if (breakdown.budgetFit >= 82) reasons.push(`${place.costBand} budget fit`);
  if (breakdown.groupFit >= 82) reasons.push("fits the group");
  if (breakdown.seasonFit >= 82) reasons.push("strong seasonal fit");
  if (breakdown.tripFit >= 82) reasons.push("fits trip length");
  if (breakdown.retrievalFit >= 70) reasons.push("strong retrieval match");

  return reasons.slice(0, 5);
}

function seasonToMonths(season) {
  const normalized = normalizeText(season);
  if (normalized === "winter") return ["nov", "dec", "jan", "feb"];
  if (normalized === "summer") return ["mar", "apr", "may", "jun"];
  if (normalized === "monsoon") return ["jun", "jul", "aug", "sep"];
  return [normalizeMonth(season)].filter(Boolean);
}

function normalizeMonth(month) {
  const normalized = normalizeText(month).slice(0, 3);
  return normalized || null;
}
