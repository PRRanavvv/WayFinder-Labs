import { calculateConfidence } from "../intelligence/confidenceScoring.js";
import { clamp, normalizeText } from "../retrieval/textUtils.js";
import {
  replanDeterministicItinerary,
  validateDeterministicItinerary
} from "./deterministicPlanner.js";

export function replanWithStability({
  previousItinerary,
  itineraryInput = {},
  changes = {},
  places,
  stabilityOptions = {}
} = {}) {
  const nextItinerary = replanDeterministicItinerary({
    itineraryInput,
    changes,
    places
  });

  return stabilizeItinerary({
    previousItinerary,
    nextItinerary,
    changes,
    ...stabilityOptions
  });
}

export function stabilizeItinerary({
  previousItinerary,
  nextItinerary,
  changes = {},
  lockedActivityIds = [],
  acceptedActivityIds = [],
  preserveAccepted = true,
  forceFreshDays = []
} = {}) {
  if (!previousItinerary?.days?.length || !nextItinerary?.days?.length) {
    const stabilityReport = buildEmptyStabilityReport(previousItinerary, nextItinerary);
    return {
      ...nextItinerary,
      stage: "stable-itinerary-replan-v1",
      stabilityReport,
      ...calculateConfidence({
        base: nextItinerary?.confidence || 0.72,
        outputCompleteness: nextItinerary?.days?.length ? 1 : 0.4
      })
    };
  }

  const affectedDays = inferAffectedDays(previousItinerary, changes, forceFreshDays);
  const lockedIds = new Set([...lockedActivityIds, ...acceptedActivityIds].map(String));
  const preservedDays = [];
  const regeneratedDays = [];
  const stableDays = nextItinerary.days.map((nextDay) => {
    const previousDay = findMatchingPreviousDay(previousItinerary.days, nextDay);
    const canPreserve = previousDay
      && !affectedDays.has(nextDay.day)
      && !hasBlockedActivity(previousDay, changes)
      && (preserveAccepted || !hasLockedActivity(previousDay, lockedIds));

    if (canPreserve) {
      preservedDays.push(nextDay.day);
      return recalculateDayTotals({
        ...previousDay,
        stability: {
          preserved: true,
          source: "previous-itinerary",
          reason: "No direct change affected this day, so accepted structure was preserved."
        }
      });
    }

    regeneratedDays.push(nextDay.day);
    return recalculateDayTotals({
      ...nextDay,
      stability: {
        preserved: false,
        source: "fresh-replan",
        reason: affectedDays.has(nextDay.day)
          ? "This day was directly affected by the change set."
          : "No compatible previous day was available."
      }
    });
  });
  const itinerary = {
    ...nextItinerary,
    stage: "stable-itinerary-replan-v1",
    generatedAt: new Date().toISOString(),
    days: stableDays,
    ...buildDayAliases(stableDays),
    totals: calculateTotals(stableDays)
  };
  const stabilityReport = buildStabilityReport({
    previousItinerary,
    itinerary,
    affectedDays,
    preservedDays,
    regeneratedDays,
    lockedActivityIds: [...lockedIds]
  });
  const feasibility = validateDeterministicItinerary({
    ...itinerary,
    constraints: nextItinerary.constraints
  });
  const confidenceReport = calculateConfidence({
    base: nextItinerary.confidence || 0.84,
    feasible: feasibility.valid,
    outputCompleteness: stabilityReport.previousActivityCount
      ? stabilityReport.currentActivityCount / stabilityReport.previousActivityCount
      : 1,
    fallbackWarnings: nextItinerary.confidenceReasons?.filter((reason) => reason.includes("fallback")) || []
  });

  return {
    ...itinerary,
    feasibility,
    stabilityReport,
    ...confidenceReport
  };
}

export function buildStabilityReport({
  previousItinerary,
  itinerary,
  affectedDays = new Set(),
  preservedDays = [],
  regeneratedDays = [],
  lockedActivityIds = []
} = {}) {
  const previousActivities = collectPlaceActivities(previousItinerary?.days || []);
  const currentActivities = collectPlaceActivities(itinerary?.days || []);
  const previousKeys = new Set(previousActivities.map((activity) => activity.key));
  const currentKeys = new Set(currentActivities.map((activity) => activity.key));
  const preservedActivities = currentActivities.filter((activity) => previousKeys.has(activity.key));
  const replacedActivities = previousActivities.filter((activity) => !currentKeys.has(activity.key));
  const newActivities = currentActivities.filter((activity) => !previousKeys.has(activity.key));
  const movedActivities = preservedActivities.filter((activity) => {
    const previous = previousActivities.find((item) => item.key === activity.key);
    return previous && previous.day !== activity.day;
  });
  const stabilityScore = previousActivities.length
    ? preservedActivities.length / previousActivities.length
    : 1;

  return {
    previousActivityCount: previousActivities.length,
    currentActivityCount: currentActivities.length,
    preservedActivityCount: preservedActivities.length,
    replacedActivityCount: replacedActivities.length,
    newActivityCount: newActivities.length,
    movedActivityCount: movedActivities.length,
    stabilityScore: Number(clamp(stabilityScore * 100, 0, 100).toFixed(2)),
    affectedDays: [...affectedDays].sort((a, b) => a - b),
    preservedDays,
    regeneratedDays,
    lockedActivityIds,
    preservedActivities: publicActivities(preservedActivities),
    replacedActivities: publicActivities(replacedActivities),
    newActivities: publicActivities(newActivities),
    movedActivities: publicActivities(movedActivities),
    rule: "Preserve unaffected accepted days; regenerate only directly impacted days."
  };
}

function buildEmptyStabilityReport(previousItinerary, nextItinerary) {
  return {
    previousActivityCount: collectPlaceActivities(previousItinerary?.days || []).length,
    currentActivityCount: collectPlaceActivities(nextItinerary?.days || []).length,
    preservedActivityCount: 0,
    replacedActivityCount: 0,
    newActivityCount: collectPlaceActivities(nextItinerary?.days || []).length,
    movedActivityCount: 0,
    stabilityScore: 0,
    affectedDays: [],
    preservedDays: [],
    regeneratedDays: (nextItinerary?.days || []).map((day) => day.day),
    lockedActivityIds: [],
    preservedActivities: [],
    replacedActivities: [],
    newActivities: publicActivities(collectPlaceActivities(nextItinerary?.days || [])),
    movedActivities: [],
    rule: "No previous itinerary was available, so no structure could be preserved."
  };
}

function inferAffectedDays(previousItinerary, changes, forceFreshDays = []) {
  const affectedDays = new Set(forceFreshDays.map(Number).filter(Boolean));
  const days = previousItinerary.days || [];

  for (const day of changes.affectedDays || []) affectedDays.add(Number(day));
  if (changes.day || changes.dayNumber) affectedDays.add(Number(changes.day || changes.dayNumber));
  if (changes.flightDelayHours || changes.flightDelayMinutes) affectedDays.add(1);
  for (const day of changes.skipDays || []) {
    const dayNumber = Number(day);
    if (dayNumber) {
      for (const existingDay of days) {
        if (existingDay.day >= dayNumber) affectedDays.add(existingDay.day);
      }
    }
  }

  const changedPlaceIds = new Set([
    ...(changes.blockedPlaceIds || []),
    ...Object.entries(changes.openingHours || {})
      .filter(([, value]) => value?.closed || value?.temporarilyClosed)
      .map(([id]) => id)
  ].map(String));
  for (const day of days) {
    if (day.activities?.some((activity) => changedPlaceIds.has(String(activity.id)))) {
      affectedDays.add(day.day);
    }
  }

  const weatherKeys = Object.keys(changes.weather || {});
  if (weatherKeys.includes("*") || normalizeText(changes.weather?.condition).includes("rain")) {
    days.forEach((day) => affectedDays.add(day.day));
  } else {
    for (const key of weatherKeys.map(normalizeText)) {
      for (const day of days) {
        if (normalizeText(day.routeLocation) === key) affectedDays.add(day.day);
      }
    }
  }

  if (changes.forceFullReplan) {
    days.forEach((day) => affectedDays.add(day.day));
  }

  return affectedDays;
}

function findMatchingPreviousDay(previousDays, nextDay) {
  return previousDays.find((day) => day.day === nextDay.day)
    || previousDays.find((day) => day.routeLocation && day.routeLocation === nextDay.routeLocation);
}

function hasBlockedActivity(day, changes) {
  const blockedIds = new Set([
    ...(changes.blockedPlaceIds || []),
    ...Object.entries(changes.openingHours || {})
      .filter(([, value]) => value?.closed || value?.temporarilyClosed)
      .map(([id]) => id)
  ].map(String));
  return day.activities?.some((activity) => blockedIds.has(String(activity.id)));
}

function hasLockedActivity(day, lockedIds) {
  if (!lockedIds.size) return false;
  return day.activities?.some((activity) => lockedIds.has(String(activity.id)));
}

function collectPlaceActivities(days) {
  return days.flatMap((day) => (day.activities || [])
    .filter((activity) => activity.kind === "place")
    .map((activity) => ({
      ...activity,
      day: day.day,
      key: activityKey(activity)
    })));
}

function activityKey(activity) {
  return String(activity.id || normalizeText(activity.name));
}

function publicActivities(activities) {
  return activities.map((activity) => ({
    id: activity.id || null,
    name: activity.name,
    day: activity.day,
    startTime: activity.startTime,
    endTime: activity.endTime
  }));
}

function recalculateDayTotals(day) {
  const placeActivities = (day.activities || []).filter((activity) => activity.kind === "place");
  return {
    ...day,
    totalCost: placeActivities.reduce((sum, activity) => sum + (activity.estimatedGroupCost || 0), 0),
    totalFatigue: Number(placeActivities.reduce((sum, activity) => sum + (activity.fatigueScore || 0), 0).toFixed(2)),
    totalWalkingHours: Number(placeActivities.reduce((sum, activity) => sum + (activity.walkingHours || 0), 0).toFixed(2))
  };
}

function calculateTotals(days) {
  return {
    totalCost: days.reduce((sum, day) => sum + (day.totalCost || 0), 0),
    totalFatigue: Number(days.reduce((sum, day) => sum + (day.totalFatigue || 0), 0).toFixed(2)),
    totalWalkingHours: Number(days.reduce((sum, day) => sum + (day.totalWalkingHours || 0), 0).toFixed(2)),
    scheduledPlaceCount: days.reduce(
      (sum, day) => sum + (day.activities || []).filter((activity) => activity.kind === "place").length,
      0
    )
  };
}

function buildDayAliases(days) {
  return Object.fromEntries(days.map((day) => [`day${day.day}`, day.activities]));
}
