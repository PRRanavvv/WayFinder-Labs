import { enrichedTravelPlaces } from "../datasets/enrichedPlaces.js";
import { climateFitForIntent } from "../datasets/travelKnowledge.js";
import { clamp, normalizeText, tokenize } from "../retrieval/textUtils.js";
import { calculateConfidence } from "./confidenceScoring.js";

export const defaultRecommendationWeights = {
  retrievalFit: 0.25,
  preferenceFit: 0.24,
  budgetFit: 0.16,
  groupFit: 0.14,
  seasonFit: 0.12,
  tripFit: 0.09,
  groupSatisfactionFit: 0
};

export const recommendationWeightProfiles = {
  solo: {
    retrievalFit: 0.28,
    preferenceFit: 0.32,
    budgetFit: 0.16,
    groupFit: 0.04,
    seasonFit: 0.12,
    tripFit: 0.08,
    groupSatisfactionFit: 0
  },
  couples: {
    retrievalFit: 0.24,
    preferenceFit: 0.28,
    budgetFit: 0.14,
    groupFit: 0.16,
    seasonFit: 0.12,
    tripFit: 0.06,
    groupSatisfactionFit: 0
  },
  family: {
    retrievalFit: 0.2,
    preferenceFit: 0.2,
    budgetFit: 0.14,
    groupFit: 0.22,
    seasonFit: 0.14,
    tripFit: 0.1,
    groupSatisfactionFit: 0
  },
  friends: {
    retrievalFit: 0.23,
    preferenceFit: 0.22,
    budgetFit: 0.14,
    groupFit: 0.12,
    seasonFit: 0.09,
    tripFit: 0.06,
    groupSatisfactionFit: 0.14
  }
};

export function rankDestinationRecommendations({
  candidates,
  places = enrichedTravelPlaces,
  userPreferences = {},
  budgetConstraints = {},
  groupPreferences = {},
  groupMembers = [],
  tripLengthDays = 3,
  season,
  month,
  climatePreference,
  travelStyle = {},
  weightProfile,
  weights,
  visitedDestinations = [],
  excludedDestinations = [],
  diversityControls = {},
  topK = 10
} = {}) {
  const placeLookup = new Map(places.map((place) => [place.id, place]));
  const excluded = new Set([...visitedDestinations, ...excludedDestinations].map(normalizeText));
  const resolvedCandidates = resolveCandidates(candidates, places, placeLookup)
    .filter(({ place }) => !excluded.has(normalizeText(place.destination || place.city || place.name)));
  const resolvedWeights = resolveRecommendationWeights({ weightProfile, weights, groupPreferences });

  return applyDiversityControls(resolvedCandidates
    .map(({ place, retrievalRecord }) => {
      const groupSatisfaction = calculateGroupSatisfaction(place, groupMembers);
      const breakdown = {
        retrievalFit: retrievalFit(retrievalRecord),
        preferenceFit: preferenceFit(place, { userPreferences, travelStyle }),
        budgetFit: budgetFit(place, budgetConstraints),
        groupFit: groupFit(place, groupPreferences),
        seasonFit: seasonFit(place, { season, month, climatePreference }),
        tripFit: tripFit(place, tripLengthDays),
        groupSatisfactionFit: groupSatisfaction.groupScore
      };
      const destinationRankingScore = weightedAverage(breakdown, resolvedWeights);
      const confidenceReport = calculateConfidence({
        base: destinationRankingScore / 100,
        retrievalScore: breakdown.retrievalFit,
        groupConflictLevel: groupSatisfaction.conflictLevel === "high" ? "high" : "none",
        sparseData: !retrievalRecord && Boolean(candidates?.length)
      });

      return {
        ...place,
        destinationRankingScore: Number(destinationRankingScore.toFixed(2)),
        ...confidenceReport,
        recommendationBreakdown: breakdown,
        groupSatisfaction,
        recommendationReasons: explainRecommendation(place, breakdown, {
          groupSatisfaction,
          season,
          month,
          climatePreference
        })
      };
    })
    .sort((a, b) => b.destinationRankingScore - a.destinationRankingScore), {
      topK,
      maxPerDestination: diversityControls.maxPerDestination
    });
}

export function resolveRecommendationWeights({ weightProfile, weights, groupPreferences = {} } = {}) {
  if (weights) return { ...defaultRecommendationWeights, ...weights };
  const profile = weightProfile || normalizeText(groupPreferences.groupType || groupPreferences.primaryGroup);
  return {
    ...defaultRecommendationWeights,
    ...(recommendationWeightProfiles[profile] || {})
  };
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

function applyDiversityControls(rankedPlaces, { topK, maxPerDestination } = {}) {
  if (!maxPerDestination) return rankedPlaces.slice(0, topK);

  const counts = new Map();
  const diversified = [];

  for (const place of rankedPlaces) {
    const destination = normalizeText(place.destination || place.city || place.name);
    const count = counts.get(destination) || 0;
    if (count >= maxPerDestination) continue;
    counts.set(destination, count + 1);
    diversified.push(place);
    if (diversified.length >= topK) break;
  }

  return diversified;
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

function seasonFit(place, { season, month, climatePreference } = {}) {
  if (!season && !month && !climatePreference) return 72;

  if (month || climatePreference) {
    return Number((climateFitForIntent(place, { month, climatePreference }) * 100).toFixed(2));
  }

  const requestedMonths = seasonToMonths(season);
  const bestMonths = new Set((place.best_months || []).map(normalizeMonth));
  const matches = requestedMonths.filter((month) => bestMonths.has(month)).length;

  if (!requestedMonths.length) return 72;
  return clamp(48 + (matches / requestedMonths.length) * 52, 0, 100);
}

export function calculateGroupSatisfaction(place, groupMembers = []) {
  if (!groupMembers.length) {
    return {
      groupScore: 72,
      memberScores: [],
      fairnessPenalty: 0,
      conflictLevel: "none"
    };
  }

  const memberScores = groupMembers.map((member) => {
    const score = preferenceFit(place, {
      userPreferences: {
        interests: member.interests || [],
        moods: member.moods || []
      },
      travelStyle: member.travelStyle || {}
    });

    return {
      memberId: member.id || member.name,
      score: Number(score.toFixed(2)),
      matchedPreferences: matchedPreferences(place, member)
    };
  });

  const averageScore = memberScores.reduce((sum, member) => sum + member.score, 0) / memberScores.length;
  const lowestScore = Math.min(...memberScores.map((member) => member.score));
  const fairnessPenalty = Math.max(0, averageScore - lowestScore) * 0.35;
  const groupScore = clamp(averageScore - fairnessPenalty, 0, 100);

  return {
    groupScore: Number(groupScore.toFixed(2)),
    memberScores,
    fairnessPenalty: Number(fairnessPenalty.toFixed(2)),
    conflictLevel: conflictLevel(fairnessPenalty)
  };
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

function explainRecommendation(place, breakdown, { groupSatisfaction, season, month, climatePreference } = {}) {
  const reasons = [];

  if (breakdown.preferenceFit >= 82) reasons.push("matches traveler preferences");
  if (breakdown.budgetFit >= 82) reasons.push(`${place.costBand} budget fit`);
  if (breakdown.groupFit >= 82) reasons.push("fits the group");
  if (breakdown.seasonFit >= 82) {
    if (month && climatePreference) reasons.push(`matches ${month} ${climatePreference} weather`);
    else if (season) reasons.push(`matches ${season} travel preference`);
    else reasons.push("strong seasonal fit");
  }
  if (groupSatisfaction?.groupScore >= 82) reasons.push("high group satisfaction");
  if (groupSatisfaction?.conflictLevel === "low") reasons.push("low group conflict");
  if (breakdown.tripFit >= 82) reasons.push("fits trip length");
  if (breakdown.retrievalFit >= 70) reasons.push("strong retrieval match");

  return reasons.slice(0, 5);
}

function matchedPreferences(place, member = {}) {
  const placeTerms = new Set(tokenize([
    place.category,
    ...(place.mood || []),
    ...(place.best_for || []),
    ...(place.tags || [])
  ].join(" ")));

  return [...(member.interests || []), ...(member.moods || [])]
    .filter((preference) => tokenize(preference).some((term) => placeTerms.has(term)))
    .slice(0, 5);
}

function conflictLevel(fairnessPenalty) {
  if (fairnessPenalty >= 12) return "high";
  if (fairnessPenalty >= 6) return "medium";
  return "low";
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
