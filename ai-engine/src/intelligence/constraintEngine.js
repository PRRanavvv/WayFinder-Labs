import { clamp, normalizeText } from "../retrieval/textUtils.js";

export const defaultConstraintConfig = {
  maxActivitiesPerDay: 3,
  maxDailyFatigue: {
    low: 0.95,
    balanced: 1.35,
    high: 1.75
  },
  maxConsecutiveHighFatigue: 1,
  hardBudgetMultiplier: 1,
  softBudgetWarningRatio: 0.85,
  mealWindows: ["lunch", "evening"],
  highFatigueThreshold: 0.55
};

export function evaluateCandidateConstraints({
  candidate,
  dayState = createEmptyDayState(),
  tripIntent = {},
  slot = {},
  config = defaultConstraintConfig
} = {}) {
  const checks = [
    budgetConstraint(candidate, dayState, tripIntent, config),
    timingConstraint(candidate, slot),
    fatigueConstraint(candidate, dayState, tripIntent, config),
    flowConstraint(candidate, dayState, config),
    mealConstraint(candidate, slot),
    weatherConstraint(candidate, tripIntent),
    groupConstraint(candidate, tripIntent)
  ];

  const hardFailures = checks.filter((check) => check.severity === "hard");
  const warnings = checks.filter((check) => check.severity === "soft");
  const penalty = checks.reduce((sum, check) => sum + check.penalty, 0);

  return {
    feasible: hardFailures.length === 0,
    penalty,
    checks,
    warnings,
    hardFailures,
    constraintScore: clamp(100 - penalty, 0, 100)
  };
}

export function createEmptyDayState() {
  return {
    activities: [],
    totalCost: 0,
    totalFatigue: 0,
    usedTypes: new Set(),
    usedRoles: new Set(),
    consecutiveHighFatigue: 0,
    lastCluster: null
  };
}

export function applyCandidateToDayState(dayState, candidate) {
  const nextState = {
    ...dayState,
    activities: [...dayState.activities, candidate],
    totalCost: dayState.totalCost + (candidate.estimatedCost ?? 0),
    totalFatigue: Number((dayState.totalFatigue + (candidate.fatigue ?? 0)).toFixed(2)),
    usedTypes: new Set(dayState.usedTypes),
    usedRoles: new Set(dayState.usedRoles),
    consecutiveHighFatigue: candidate.fatigue >= defaultConstraintConfig.highFatigueThreshold
      ? dayState.consecutiveHighFatigue + 1
      : 0,
    lastCluster: candidate.cluster
  };

  nextState.usedTypes.add(candidate.type);
  nextState.usedRoles.add(candidate.role);

  return nextState;
}

export function validateOptimizedItinerary({ itinerary = {}, tripIntent = {} } = {}) {
  const dayReports = (itinerary.days || []).map((day) => {
    const totalCost = day.activities.reduce((sum, activity) => sum + (activity.estimatedCost ?? 0), 0);
    const totalFatigue = day.activities.reduce((sum, activity) => sum + (activity.fatigue ?? 0), 0);
    const budgetCap = tripIntent.budgetPerDay ?? Infinity;

    return {
      day: day.day,
      activityCount: day.activities.length,
      totalCost,
      totalFatigue: Number(totalFatigue.toFixed(2)),
      budgetValid: totalCost <= budgetCap,
      pacingValid: totalFatigue <= fatigueLimit(tripIntent),
      timingValid: day.activities.every((activity) => activity.constraintReport?.feasible !== false)
    };
  });

  return {
    valid: dayReports.every((report) => report.budgetValid && report.pacingValid && report.timingValid),
    dayReports
  };
}

function budgetConstraint(candidate, dayState, tripIntent, config) {
  const budgetPerDay = tripIntent.budgetPerDay;
  if (!budgetPerDay) return pass("budget", "No daily budget provided.");

  const projectedCost = dayState.totalCost + (candidate.estimatedCost ?? 0);
  const hardCap = budgetPerDay * config.hardBudgetMultiplier;
  const warningCap = budgetPerDay * config.softBudgetWarningRatio;

  if (projectedCost > hardCap) {
    return hard("budget", `Projected daily cost ${projectedCost} exceeds budget cap ${hardCap}.`, 40);
  }

  if (projectedCost > warningCap) {
    return soft("budget", `Projected daily cost ${projectedCost} is close to the daily budget.`, 12);
  }

  return pass("budget", "Candidate fits current budget envelope.");
}

function timingConstraint(candidate, slot) {
  if (!slot.window) return pass("timing", "No slot window requested.");

  const windows = (candidate.openingWindows || candidate.dayWindows || []).map(normalizeText);
  const requestedWindow = normalizeText(slot.window);

  if (windows.includes(requestedWindow)) {
    return pass("timing", "Candidate is available in the requested window.");
  }

  if (requestedWindow === "afternoon" && windows.includes("late afternoon")) {
    return soft("timing", "Candidate fits a nearby late-afternoon window.", 8);
  }

  if (requestedWindow === "evening" && windows.includes("early evening")) {
    return soft("timing", "Candidate fits a nearby early-evening window.", 8);
  }

  return soft("timing", "Candidate timing is imperfect for this slot.", 18);
}

function fatigueConstraint(candidate, dayState, tripIntent, config) {
  const projectedFatigue = dayState.totalFatigue + (candidate.fatigue ?? 0);
  const limit = fatigueLimit(tripIntent, config);

  if (projectedFatigue > limit) {
    return hard("fatigue", `Projected fatigue ${projectedFatigue.toFixed(2)} exceeds limit ${limit}.`, 35);
  }

  if (projectedFatigue > limit * 0.82) {
    return soft("fatigue", "Candidate makes the day feel close to fatigue capacity.", 12);
  }

  return pass("fatigue", "Candidate fits the current pacing envelope.");
}

function flowConstraint(candidate, dayState, config) {
  const isHighFatigue = (candidate.fatigue ?? 0) >= config.highFatigueThreshold;

  if (isHighFatigue && dayState.consecutiveHighFatigue >= config.maxConsecutiveHighFatigue) {
    return hard("activity-flow", "Avoids consecutive fatigue-heavy activities.", 28);
  }

  if (dayState.usedRoles.has(candidate.role)) {
    return soft("activity-flow", "Role repeats within the same day.", 10);
  }

  if (dayState.usedTypes.has(candidate.type)) {
    return soft("activity-flow", "Activity type repeats within the same day.", 8);
  }

  return pass("activity-flow", "Candidate preserves activity flow.");
}

function mealConstraint(candidate, slot) {
  if (slot.kind !== "meal") return pass("meal", "Slot is not meal-sensitive.");
  if (candidate.type === "food") return pass("meal", "Food candidate fits the meal slot.");
  return soft("meal", "Non-food candidate placed in a meal-sensitive slot.", 16);
}

function weatherConstraint(candidate, tripIntent) {
  const weather = tripIntent.constraints?.weather;
  if (!weather) return pass("weather", "No weather constraint provided.");

  if (weather === "indoor" && candidate.indoorOutdoor === "outdoor") {
    return soft("weather", "Outdoor candidate is weaker during indoor/weather-safe planning.", 16);
  }

  return pass("weather", "Candidate fits weather constraints.");
}

function groupConstraint(candidate, tripIntent) {
  const groupType = tripIntent.constraints?.groupType;
  if (!groupType) return pass("group", "No group constraint provided.");

  const groupFit = (candidate.groupFit || []).map(normalizeText);
  if (groupFit.includes(normalizeText(groupType))) return pass("group", "Candidate fits group context.");

  return soft("group", "Candidate is not an ideal group-context match.", 12);
}

function fatigueLimit(tripIntent, config = defaultConstraintConfig) {
  const energyLevel = tripIntent.constraints?.energyLevel || "balanced";
  return config.maxDailyFatigue[energyLevel] ?? config.maxDailyFatigue.balanced;
}

function pass(type, message) {
  return { type, status: "pass", severity: "none", penalty: 0, message };
}

function soft(type, message, penalty) {
  return { type, status: "warn", severity: "soft", penalty, message };
}

function hard(type, message, penalty) {
  return { type, status: "fail", severity: "hard", penalty, message };
}
