import { calculateConfidence } from "./confidenceScoring.js";
import { clamp, normalizeText, tokenize } from "../retrieval/textUtils.js";

export const defaultGroupFusionWeights = {
  interest: 1,
  mood: 0.85,
  mustHave: 1.35,
  avoid: 1.15,
  explicitPreference: 1.25
};

export function buildTripDNA(input = {}) {
  return fuseGroupPreferences(input);
}

export function fuseGroupPreferences({
  groupMembers = [],
  explicitPreferences = {},
  tripContext = {},
  weights = defaultGroupFusionWeights
} = {}) {
  const memberProfiles = groupMembers.map(normalizeMemberProfile);
  const explicitProfile = normalizeMemberProfile({
    id: "trip_preferences",
    name: "Trip preferences",
    ...explicitPreferences
  }, {
    source: "explicit"
  });
  const profilesForSignals = explicitProfile.hasSignal
    ? [...memberProfiles, explicitProfile]
    : memberProfiles;
  const memberCount = Math.max(memberProfiles.length, 1);
  const signalCounts = collectSignalCounts(profilesForSignals, weights);
  const consensusTerms = rankTerms(signalCounts.positive)
    .filter((term) => term.supporterCount >= consensusThreshold(memberCount) || term.source === "explicit")
    .slice(0, 8);
  const fallbackTerms = rankTerms(signalCounts.positive).slice(0, 5);
  const softPreferences = (consensusTerms.length ? consensusTerms : fallbackTerms)
    .map((term) => term.term);
  const avoidTerms = rankTerms(signalCounts.avoid).slice(0, 8);
  const budgetProfile = buildBudgetProfile(memberProfiles, tripContext);
  const paceProfile = buildPaceProfile(memberProfiles, explicitPreferences);
  const fairness = buildFairnessProfile(memberProfiles, signalCounts.positive, memberCount);
  const conflicts = detectGroupConflicts({
    positiveTerms: rankTerms(signalCounts.positive),
    avoidTerms,
    budgetProfile,
    paceProfile,
    memberProfiles,
    tripContext
  });
  const hardConstraints = buildHardConstraints({
    avoidTerms,
    budgetProfile,
    memberProfiles,
    tripContext
  });
  const conflictLevel = conflicts.length >= 3
    ? "high"
    : conflicts.length >= 1 || fairness.minorityPreferences.length >= 3
      ? "medium"
      : "low";
  const confidenceReport = calculateConfidence({
    base: 0.88,
    missingInfo: memberProfiles.length ? [] : ["group members"],
    conflicts,
    groupConflictLevel: conflictLevel,
    outputCompleteness: softPreferences.length ? 1 : 0.55
  });
  const groupVibe = buildGroupVibe({ softPreferences, paceProfile, tripContext });

  return {
    stage: "group-preference-fusion-v1",
    generatedAt: new Date().toISOString(),
    inputSummary: {
      memberCount: memberProfiles.length,
      destination: tripContext.destination || null,
      days: tripContext.days || null,
      month: tripContext.month || null
    },
    tripDNA: {
      groupVibe,
      softPreferences,
      hardConstraints,
      dominantPace: paceProfile.dominantPace,
      budgetProfile,
      consensus: {
        terms: softPreferences,
        support: (consensusTerms.length ? consensusTerms : fallbackTerms).map(publicTermReport)
      },
      conflictLevel
    },
    memberProfiles: memberProfiles.map(publicMemberProfile),
    fairness,
    conflicts,
    recommendationHints: buildRecommendationHints({
      softPreferences,
      groupVibe,
      paceProfile,
      budgetProfile,
      tripContext,
      memberProfiles
    }),
    ...confidenceReport
  };
}

export function scorePlaceAgainstTripDNA(place = {}, fusion = {}) {
  const tripDNA = fusion.tripDNA || fusion;
  const softPreferences = tripDNA.softPreferences || [];
  const hardAvoids = (tripDNA.hardConstraints || [])
    .filter((constraint) => constraint.type === "avoid")
    .flatMap((constraint) => constraint.values || []);
  const placeTerms = new Set(tokenize([
    place.name,
    place.category,
    place.role,
    place.summary,
    place.semantic_summary,
    ...(place.mood || []),
    ...(place.tags || []),
    ...(place.ideal_for || place.bestFor || []),
    ...(place.retrieval_terms || place.retrievalTerms || [])
  ].join(" ")));
  const matchedPreferences = softPreferences
    .filter((preference) => tokenize(preference).some((term) => placeTerms.has(term)));
  const avoidedMatches = hardAvoids
    .filter((avoid) => tokenize(avoid).some((term) => placeTerms.has(term)));
  const consensusFit = softPreferences.length
    ? matchedPreferences.length / softPreferences.length
    : 0.55;
  const avoidPenalty = avoidedMatches.length * 0.18;
  const fairnessBoost = (fusion.fairness?.representationTargets || [])
    .some((target) => tokenize(target.preference).some((term) => placeTerms.has(term)))
    ? 0.08
    : 0;
  const score = clamp((consensusFit + fairnessBoost - avoidPenalty) * 100, 0, 100);

  return {
    placeId: place.id || null,
    name: place.name || null,
    score: Number(score.toFixed(2)),
    matchedPreferences,
    avoidedMatches,
    fairnessBoostApplied: fairnessBoost > 0
  };
}

function normalizeMemberProfile(member = {}, { source = "member" } = {}) {
  const interests = normalizeList(member.interests);
  const moods = normalizeList(member.moods);
  const mustHave = normalizeList(member.mustHave || member.must_haves || member.musts);
  const avoid = normalizeList(member.avoid || member.dislikes || member.blockedPreferences);
  const constraints = normalizeConstraints(member.constraints || {});
  const pace = normalizeText(member.pace || member.travelPace || member.travelStyle?.pace);
  const travelStyle = normalizeText(member.travelStyle?.primaryIntent || member.travelStyle || member.style);
  const id = member.id || member.name || source;

  return {
    id,
    name: member.name || id,
    source,
    interests,
    moods,
    mustHave,
    avoid,
    constraints,
    pace,
    travelStyle,
    budget: normalizeBudget(member.budget || member.maxBudget || member.budgetInr),
    hasSignal: [
      interests,
      moods,
      mustHave,
      avoid,
      Object.keys(constraints),
      pace ? [pace] : []
    ].some((values) => values.length)
  };
}

function normalizeList(value) {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values
    .flatMap((item) => String(item || "").split(/[,/]/))
    .map((item) => normalizeText(item))
    .filter(Boolean))];
}

function normalizeConstraints(constraints = {}) {
  return Object.fromEntries(Object.entries(constraints)
    .filter(([, value]) => value !== undefined && value !== null && value !== false)
    .map(([key, value]) => [normalizeText(key), value === true ? true : normalizeText(value)]));
}

function normalizeBudget(value) {
  const budget = Number(value);
  return Number.isFinite(budget) && budget > 0 ? budget : null;
}

function collectSignalCounts(profiles, weights) {
  const positive = new Map();
  const avoid = new Map();

  for (const profile of profiles) {
    addTerms(positive, profile.interests, profile, weights.interest);
    addTerms(positive, profile.moods, profile, weights.mood);
    addTerms(positive, profile.mustHave, profile, weights.mustHave);
    if (profile.travelStyle) addTerms(positive, [profile.travelStyle], profile, weights.interest);
    addTerms(avoid, profile.avoid, profile, weights.avoid);

    if (profile.source === "explicit") {
      for (const report of positive.values()) {
        if (report.memberIds.has(profile.id)) report.score *= weights.explicitPreference;
      }
    }
  }

  return { positive, avoid };
}

function addTerms(target, terms, profile, weight) {
  for (const term of terms) {
    const current = target.get(term) || {
      term,
      score: 0,
      memberIds: new Set(),
      names: new Set(),
      source: profile.source
    };
    current.score += weight;
    current.memberIds.add(profile.id);
    current.names.add(profile.name);
    if (profile.source === "explicit") current.source = "explicit";
    target.set(term, current);
  }
}

function rankTerms(signalMap) {
  return [...signalMap.values()]
    .map((term) => ({
      ...term,
      supporterCount: term.memberIds.size,
      members: [...term.names],
      score: Number(term.score.toFixed(2))
    }))
    .sort((a, b) => b.supporterCount - a.supporterCount || b.score - a.score || a.term.localeCompare(b.term));
}

function consensusThreshold(memberCount) {
  if (memberCount <= 1) return 1;
  if (memberCount === 2) return 1;
  return Math.ceil(memberCount / 2);
}

function publicTermReport(term) {
  return {
    term: term.term,
    supporterCount: term.supporterCount,
    members: term.members,
    score: term.score
  };
}

function buildBudgetProfile(memberProfiles, tripContext = {}) {
  const memberBudgets = memberProfiles.map((member) => member.budget).filter(Boolean);
  const tripBudget = normalizeBudget(tripContext.budget);
  const budgets = [...memberBudgets, tripBudget].filter(Boolean).sort((a, b) => a - b);
  if (!budgets.length) {
    return {
      status: "unknown",
      min: null,
      max: null,
      median: null,
      sharedCap: null,
      spreadRatio: null
    };
  }

  const median = budgets[Math.floor(budgets.length / 2)];
  const min = budgets[0];
  const max = budgets[budgets.length - 1];

  return {
    status: max / min >= 2 ? "spread" : "aligned",
    min,
    max,
    median,
    sharedCap: min,
    spreadRatio: Number((max / min).toFixed(2))
  };
}

function buildPaceProfile(memberProfiles, explicitPreferences = {}) {
  const paceCounts = new Map();
  const explicitPace = normalizeText(explicitPreferences.pace || explicitPreferences.travelPace);

  for (const pace of [...memberProfiles.map((member) => member.pace), explicitPace].filter(Boolean)) {
    paceCounts.set(pace, (paceCounts.get(pace) || 0) + 1);
  }

  const ranked = [...paceCounts.entries()].sort((a, b) => b[1] - a[1]);
  return {
    dominantPace: ranked[0]?.[0] || "balanced",
    paceCounts: Object.fromEntries(ranked),
    hasConflict: ranked.length >= 2 && ranked[0][1] === ranked[1][1]
  };
}

function buildFairnessProfile(memberProfiles, positiveSignals, memberCount) {
  const rankedTerms = rankTerms(positiveSignals);
  const minorityPreferences = rankedTerms
    .filter((term) => term.supporterCount === 1 && memberCount >= 3)
    .map(publicTermReport);
  const representationTargets = minorityPreferences
    .slice(0, 4)
    .map((term) => ({
      preference: term.term,
      member: term.members[0],
      reason: "Keep at least one visible win for a minority preference."
    }));
  const underrepresentedMembers = memberProfiles
    .filter((member) => minorityPreferences.some((term) => term.members.includes(member.name)))
    .map((member) => member.name);

  return {
    minorityPreferences,
    representationTargets,
    underrepresentedMembers: [...new Set(underrepresentedMembers)],
    fairnessRule: memberCount >= 3
      ? "Do not average minority travelers out of the plan."
      : "Small-group plan can optimize for direct consensus."
  };
}

function detectGroupConflicts({
  positiveTerms,
  avoidTerms,
  budgetProfile,
  paceProfile,
  memberProfiles,
  tripContext
}) {
  const terms = new Set(positiveTerms.map((term) => term.term));
  const avoids = new Set(avoidTerms.map((term) => term.term));
  const conflicts = [];

  addOppositionConflict(conflicts, terms, ["quiet", "peaceful", "slow", "calm"], ["nightlife", "party", "energetic", "social"], {
    type: "quiet-nightlife",
    message: "The group wants quiet pacing and high-energy social blocks.",
    tradeoff: "Use a quiet base with optional evening zones instead of making nightlife the default."
  });
  addOppositionConflict(conflicts, terms, ["adventure", "trek", "hiking", "wild"], ["low fatigue", "accessible", "parents", "comfort"], {
    type: "adventure-fatigue",
    message: "Adventure interest is competing with low-fatigue or comfort needs.",
    tradeoff: "Prefer scenic low-risk adventure and cap long walking blocks."
  });
  addOppositionConflict(conflicts, terms, ["budget", "cheap", "low cost"], ["luxury", "premium", "comfort"], {
    type: "budget-comfort",
    message: "Budget and premium comfort expectations are both present.",
    tradeoff: "Keep the base plan budget-safe and mark premium upgrades separately."
  });

  if (budgetProfile.status === "spread") {
    conflicts.push({
      type: "budget-spread",
      message: `Group budgets range from ${budgetProfile.min} to ${budgetProfile.max}.`,
      tradeoff: "Rank against the lowest shared cap, then show paid upgrades as opt-ins."
    });
  }
  if (paceProfile.hasConflict) {
    conflicts.push({
      type: "pace-split",
      message: "No single pace dominates the group.",
      tradeoff: "Alternate anchor days with lighter recovery blocks."
    });
  }
  if (avoids.has("crowds") && terms.has("nightlife")) {
    conflicts.push({
      type: "crowd-nightlife",
      message: "Nightlife usually raises crowd exposure.",
      tradeoff: "Pick controlled evening venues over dense party strips."
    });
  }
  if (tripContext.days && memberProfiles.length >= 4 && Number(tripContext.days) <= 2) {
    conflicts.push({
      type: "short-trip-large-group",
      message: "A short trip with a larger group leaves little room for everyone to get a win.",
      tradeoff: "Prioritize two shared anchors and one optional split activity."
    });
  }

  return conflicts;
}

function addOppositionConflict(conflicts, terms, left, right, report) {
  if (left.some((term) => terms.has(term)) && right.some((term) => terms.has(term))) {
    conflicts.push(report);
  }
}

function buildHardConstraints({ avoidTerms, budgetProfile, memberProfiles, tripContext }) {
  const constraints = [];
  if (budgetProfile.sharedCap) {
    constraints.push({
      type: "budget",
      value: budgetProfile.sharedCap,
      source: "lowest shared budget"
    });
  } else if (tripContext.budget) {
    constraints.push({
      type: "budget",
      value: tripContext.budget,
      source: "trip context"
    });
  }
  if (avoidTerms.length) {
    constraints.push({
      type: "avoid",
      values: avoidTerms.map((term) => term.term),
      source: "traveler dislikes"
    });
  }

  const constraintTerms = memberProfiles.flatMap((member) => Object.entries(member.constraints)
    .map(([key, value]) => value === true ? key : `${key}: ${value}`));
  if (constraintTerms.length) {
    constraints.push({
      type: "traveler-constraint",
      values: [...new Set(constraintTerms)],
      source: "member constraints"
    });
  }

  return constraints;
}

function buildGroupVibe({ softPreferences, paceProfile, tripContext }) {
  const pace = paceProfile.dominantPace || "balanced";
  const theme = softPreferences.slice(0, 2).join(" + ") || normalizeText(tripContext.groupType) || "shared";
  return `${pace} ${theme} trip`;
}

function buildRecommendationHints({
  softPreferences,
  groupVibe,
  paceProfile,
  budgetProfile,
  tripContext,
  memberProfiles
}) {
  const familySignals = memberProfiles.some((member) => (
    member.constraints.parents || member.interests.includes("family") || member.mustHave.includes("family")
  ));
  const groupType = normalizeText(tripContext.groupType)
    || (familySignals ? "family" : memberProfiles.length >= 3 ? "friends" : "solo");

  return {
    groupType,
    groupVibe,
    userPreferences: {
      interests: softPreferences,
      moods: softPreferences.filter((term) => ["slow", "quiet", "social", "romantic", "adventurous"].includes(term))
    },
    travelStyle: {
      pace: paceProfile.dominantPace,
      primaryIntent: softPreferences[0] || null
    },
    budgetConstraints: {
      maxBudget: budgetProfile.sharedCap,
      preferredBudget: budgetProfile.median
    },
    rankingNotes: [
      "Use consensus terms for the main route.",
      "Reserve at least one visible win for minority preferences.",
      "Treat hard constraints as filters, not soft scoring hints."
    ]
  };
}

function publicMemberProfile(member) {
  return {
    id: member.id,
    name: member.name,
    interests: member.interests,
    moods: member.moods,
    mustHave: member.mustHave,
    avoid: member.avoid,
    pace: member.pace || null,
    budget: member.budget
  };
}
