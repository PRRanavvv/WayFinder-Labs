import { destinationTravelKnowledge, normalizeMonth } from "../datasets/travelKnowledge.js";
import { normalizeText, tokenize } from "../retrieval/textUtils.js";
import { calculateConfidence } from "./confidenceScoring.js";

const knownLocationNames = [
  "Goa",
  "Munnar",
  "Manali",
  "Kerala",
  "Kashmir",
  "Himachal",
  "Varkala",
  "Alleppey",
  "Kochi",
  "Wayanad",
  "Jaipur",
  "Udaipur",
  "Jaisalmer",
  "Rishikesh",
  "Kasol",
  "Coorg",
  "Gokarna",
  "Hampi",
  "Meghalaya",
  "Paris"
];

const ambiguousLocations = {
  paris: ["Paris, France", "Paris, Texas"]
};

export function analyzeProductionInput({
  query = "",
  destination,
  days,
  budget,
  group = {},
  groupMembers = [],
  visitedDestinations = [],
  month,
  realtimeSignals = {}
} = {}) {
  const text = [query, destination].filter(Boolean).join(" ");
  const tokens = new Set(tokenize(text));
  const conflicts = detectPreferenceConflicts({ text, tokens, group, month });
  const missingInfo = detectMissingTripInfo({ query, destination, days, budget, group });
  const impossibleRequests = detectImpossibleRequests({ text, days });
  const locationResolution = resolveLocationMention(text);
  const groupAssessment = assessGroupPlanningEdges(groupMembers);
  const budgetConflict = detectBudgetConflict(groupMembers);
  const fallbackWarnings = detectRealtimeFallbacks(realtimeSignals);
  const confidenceReport = calculateConfidence({
    base: 0.86,
    missingInfo,
    conflicts: [
      ...conflicts,
      ...impossibleRequests,
      ...budgetConflict.conflicts,
      ...groupAssessment.conflicts
    ],
    fallbackWarnings,
    sparseData: locationResolution.status === "unknown",
    feasible: impossibleRequests.length === 0,
    groupConflictLevel: groupAssessment.conflictLevel
  });

  return {
    conflicts,
    missingInfo,
    followUpQuestions: buildFollowUpQuestions(missingInfo, locationResolution),
    impossibleRequests,
    locationResolution,
    groupAssessment,
    budgetConflict,
    visitedDestinations,
    fallbackWarnings,
    tradeoffs: buildTradeoffs({
      conflicts,
      impossibleRequests,
      groupAssessment,
      budgetConflict
    }),
    ...confidenceReport
  };
}

export function detectPreferenceConflicts({ text = "", tokens = new Set(), group = {}, month } = {}) {
  const normalized = normalizeText(text);
  const conflicts = [];

  if (hasAll(tokens, ["cheap", "luxury"]) || hasAll(tokens, ["budget", "luxury"])) {
    conflicts.push({
      type: "budget-luxury",
      message: "Cheap and luxury pull the recommendation in opposite budget directions.",
      tradeoff: "Prioritize premium-feeling low-cost stays or raise the budget expectation."
    });
  }
  if ((tokens.has("adventure") || tokens.has("trek")) && (tokens.has("tired") || group.parents)) {
    conflicts.push({
      type: "adventure-fatigue",
      message: "Adventure and tired/parent-friendly pacing conflict.",
      tradeoff: "Use low-risk scenic adventure blocks and cap fatigue."
    });
  }
  if ((tokens.has("quiet") || tokens.has("peaceful")) && (tokens.has("nightlife") || tokens.has("party"))) {
    conflicts.push({
      type: "quiet-nightlife",
      message: "Quiet destination and great nightlife are competing vibes.",
      tradeoff: "Stay in a quiet base near, not inside, nightlife zones."
    });
  }
  if ((tokens.has("snow") || normalized.includes("snow destination")) && normalizeMonth(month || findMonthToken(tokens)) === "may") {
    conflicts.push({
      type: "season-climate",
      message: "Snow destination in May is seasonally weak for most India options.",
      tradeoff: "Prefer high-altitude views or shift to winter for reliable snow."
    });
  }

  return conflicts;
}

export function detectMissingTripInfo({ query = "", destination, days, budget, group = {} } = {}) {
  const normalized = normalizeText(query);
  const missing = [];
  const generic = ["plan a trip", "suggest somewhere nice", "trip", "vacation"].includes(normalized)
    || normalized.split(/\s+/).filter(Boolean).length <= 3;

  if (generic && !destination) missing.push("destination or region");
  if (generic && !days) missing.push("trip length");
  if (generic && !budget) missing.push("budget");
  if (generic && !group.adults && !group.groupType) missing.push("traveler group");

  return missing;
}

export function detectImpossibleRequests({ text = "", days } = {}) {
  const normalized = normalizeText(text);
  const requestedDays = Number(days) || (normalized.includes("weekend") ? 2 : null);
  const conflicts = [];

  const countryMatch = normalized.match(/(\d+)\s+countries?/);
  if (countryMatch && requestedDays && Number(countryMatch[1]) > requestedDays) {
    conflicts.push({
      type: "too-many-countries",
      message: `${countryMatch[1]} countries in ${requestedDays} days is not realistic.`,
      alternative: "Pick one country or turn it into a highlights shortlist."
    });
  }

  const farRegions = ["kashmir", "goa", "kerala"].filter((region) => normalized.includes(region));
  if (farRegions.length >= 3 && requestedDays && requestedDays <= 3) {
    conflicts.push({
      type: "far-region-weekend",
      message: `${farRegions.join(" + ")} in ${requestedDays} days would be mostly transit.`,
      alternative: "Choose one region for the weekend and save the others for separate trips."
    });
  }

  return conflicts;
}

export function resolveLocationMention(text = "") {
  const tokens = tokenize(text)
    .filter((token) => token.length >= 3 && !locationStopwords.has(token));
  const matches = [];

  for (const token of tokens) {
    const exact = knownLocationNames.find((name) => normalizeText(name) === normalizeText(token));
    if (exact) matches.push({ input: token, resolved: exact, confidence: 1, method: "exact" });

    const fuzzy = token.length >= 4
      ? knownLocationNames
      .map((name) => ({
        input: token,
        resolved: name,
        distance: levenshtein(normalizeText(token), normalizeText(name))
      }))
      .filter((item) => item.distance > 0 && item.distance <= 2)
      .sort((a, b) => a.distance - b.distance)[0]
      : null;

    if (fuzzy) {
      matches.push({
        input: token,
        resolved: fuzzy.resolved,
        confidence: Number((1 - fuzzy.distance / Math.max(token.length, fuzzy.resolved.length)).toFixed(2)),
        method: "fuzzy"
      });
    }
  }

  const ambiguous = tokens
    .map((token) => ambiguousLocations[normalizeText(token)])
    .find(Boolean);

  if (ambiguous) {
    return {
      status: "ambiguous",
      ambiguousOptions: ambiguous,
      confidenceWarning: "Location name is ambiguous; ask the user to clarify."
    };
  }

  const uniqueMatches = dedupeMatches(matches);
  if (uniqueMatches.length) {
    return {
      status: "resolved",
      matches: uniqueMatches,
      normalizedDestination: uniqueMatches[0].resolved,
      confidenceWarning: uniqueMatches[0].method === "fuzzy" ? "Location spelling was corrected." : null
    };
  }

  return {
    status: "unknown",
    nearestMatches: nearestLocations(tokens),
    confidenceWarning: "Destination is not represented clearly in the current dataset."
  };
}

export function assessGroupPlanningEdges(groupMembers = []) {
  if (!groupMembers.length) {
    return {
      conflictLevel: "none",
      conflicts: [],
      minorityPreferences: [],
      compromiseNeeded: false
    };
  }

  const interestCounts = new Map();
  for (const member of groupMembers) {
    for (const interest of member.interests || []) {
      const key = normalizeText(interest);
      interestCounts.set(key, (interestCounts.get(key) || 0) + 1);
    }
  }

  const minorityPreferences = [...interestCounts.entries()]
    .filter(([, count]) => count === 1 && groupMembers.length >= 3)
    .map(([interest]) => interest);
  const noCommonGround = [...interestCounts.values()].every((count) => count === 1) && groupMembers.length >= 3;
  const conflicts = [];

  if (minorityPreferences.length) {
    conflicts.push({
      type: "minority-preference",
      message: "At least one traveler has a preference the group majority may override.",
      tradeoff: "Reserve at least one activity or destination reason for minority preferences."
    });
  }
  if (noCommonGround) {
    conflicts.push({
      type: "no-common-ground",
      message: "Group preferences have no obvious shared interest.",
      tradeoff: "Use compromise scoring rather than averaging everyone into noise."
    });
  }

  return {
    conflictLevel: noCommonGround ? "high" : minorityPreferences.length ? "medium" : "low",
    conflicts,
    minorityPreferences,
    compromiseNeeded: conflicts.length > 0
  };
}

export function detectBudgetConflict(groupMembers = []) {
  const budgets = groupMembers
    .map((member) => Number(member.budget))
    .filter((budget) => Number.isFinite(budget) && budget > 0);

  if (budgets.length < 2) return { conflicts: [], minBudget: null, maxBudget: null };

  const minBudget = Math.min(...budgets);
  const maxBudget = Math.max(...budgets);
  const ratio = maxBudget / minBudget;

  if (ratio >= 3) {
    return {
      minBudget,
      maxBudget,
      conflicts: [{
        type: "budget-mismatch",
        message: `Group budgets range from ${minBudget} to ${maxBudget}.`,
        tradeoff: "Rank by the lower shared budget and flag premium upgrades separately."
      }]
    };
  }

  return { conflicts: [], minBudget, maxBudget };
}

export function validateExplanationReasons(reasons = []) {
  const joined = reasons.join(" ").toLowerCase();
  return {
    valid: reasons.length > 0 && !joined.includes("ai thinks so"),
    reasonCount: reasons.length,
    invalidPhraseFound: joined.includes("ai thinks so")
  };
}

export function detectRealtimeFallbacks(realtimeSignals = {}) {
  const warnings = [];
  if (realtimeSignals.weatherError) warnings.push("weather provider unavailable");
  if (realtimeSignals.routeError) warnings.push("route provider unavailable");
  if (realtimeSignals.openingHoursError) warnings.push("opening-hours provider unavailable");
  return warnings;
}

function buildFollowUpQuestions(missingInfo, locationResolution) {
  const questions = [];
  if (locationResolution.status === "ambiguous") questions.push("Which location did you mean?");
  if (missingInfo.includes("destination or region")) questions.push("Which destination or region are you considering?");
  if (missingInfo.includes("trip length")) questions.push("How many days do you have?");
  if (missingInfo.includes("budget")) questions.push("What budget range should WayFinder respect?");
  if (missingInfo.includes("traveler group")) questions.push("Who is traveling?");
  return questions.slice(0, 4);
}

function buildTradeoffs({ conflicts, impossibleRequests, groupAssessment, budgetConflict }) {
  return [
    ...conflicts,
    ...impossibleRequests,
    ...groupAssessment.conflicts,
    ...budgetConflict.conflicts
  ].map((conflict) => conflict.tradeoff || conflict.alternative || conflict.message);
}

function hasAll(tokens, values) {
  return values.every((value) => tokens.has(normalizeText(value)));
}

function findMonthToken(tokens) {
  for (const month of Object.keys(destinationTravelKnowledge.Delhi.avg_temp_monthly)) {
    if (tokens.has(month)) return month;
  }
  return null;
}

function dedupeMatches(matches) {
  const byResolved = new Map();
  for (const match of matches) {
    const current = byResolved.get(match.resolved);
    if (!current || match.confidence > current.confidence) byResolved.set(match.resolved, match);
  }
  return [...byResolved.values()].sort((a, b) => b.confidence - a.confidence);
}

function nearestLocations(tokens) {
  const meaningfulTokens = tokens.filter((token) => token.length >= 4 && !locationStopwords.has(token));
  return meaningfulTokens
    .flatMap((token) => knownLocationNames.map((name) => ({
      input: token,
      destination: name,
      distance: levenshtein(normalizeText(token), normalizeText(name))
    })))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map((item) => item.destination);
}

const locationStopwords = new Set([
  "and",
  "for",
  "near",
  "with",
  "from",
  "into",
  "trip",
  "days",
  "day",
  "not",
  "too",
  "the"
]);

function levenshtein(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      matrix[i][j] = a[i - 1] === b[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
    }
  }

  return matrix[a.length][b.length];
}
