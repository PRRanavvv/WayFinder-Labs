import { enrichedTravelPlaces } from "../datasets/enrichedPlaces.js";
import { clamp, normalizeText } from "../retrieval/textUtils.js";
import {
  estimateTravelMinutes,
  optimizeRouteOrder,
  placeMatchesDestination,
  resolveDestinationProfile
} from "./travelGraph.js";

export const defaultItineraryPlannerConfig = {
  dayStartTime: "09:00",
  dayEndTime: "19:00",
  parentDayStartTime: "09:30",
  parentDayEndTime: "18:30",
  earlyTransferStartTime: "07:30",
  transferBufferMinutes: 30,
  intraLocationTransferMinutes: 18,
  maxActivitiesPerDay: 3,
  parentMaxActivitiesPerDay: 2,
  backpackerMaxActivitiesPerDay: 4,
  longTransferThresholdMinutes: 150,
  parentMaxFatigue: 6,
  defaultMaxFatigue: 8,
  backpackerMaxFatigue: 10,
  parentMaxWalkingHours: 3.2,
  defaultMaxWalkingHours: 5,
  backpackerMaxWalkingHours: 7,
  groupCostMultiplierCap: 4
};

export function planDeterministicItinerary({
  destination = "Kerala",
  days = 1,
  budget,
  group = {},
  preferences = {},
  weather,
  places = enrichedTravelPlaces,
  blockedPlaceIds = [],
  config = {}
} = {}) {
  const plannerConfig = { ...defaultItineraryPlannerConfig, ...config };
  const normalizedDays = Math.max(1, Math.floor(Number(days) || 1));
  const constraints = deriveTripConstraints({
    destination,
    days: normalizedDays,
    budget,
    group,
    preferences,
    weather,
    config: plannerConfig
  });
  const blockedIds = new Set(blockedPlaceIds);
  const candidates = places
    .filter((place) => !blockedIds.has(place.id))
    .filter((place) => placeMatchesDestination(place, destination))
    .filter((place) => isHardGroupCompatible(place, constraints))
    .map((place) => ({
      ...place,
      itineraryScore: scoreItineraryPlace(place, constraints)
    }))
    .sort((a, b) => b.itineraryScore - a.itineraryScore);

  const routeLocations = selectRouteLocations({
    candidates,
    destination,
    days: normalizedDays
  });
  const dayLocationPlan = distributeLocationsAcrossDays(routeLocations, normalizedDays);

  const usedPlaceIds = new Set();
  const skippedCandidates = [];
  const decisionTrace = [];
  const plannedDays = dayLocationPlan.map((routeLocation, index) => {
    const previousLocation = index > 0 ? dayLocationPlan[index - 1] : null;
    const day = planSingleDay({
      dayNumber: index + 1,
      destination,
      routeLocation,
      previousLocation,
      candidates,
      usedPlaceIds,
      constraints,
      skippedCandidates,
      decisionTrace
    });

    day.activities
      .filter((activity) => activity.kind === "place")
      .forEach((activity) => usedPlaceIds.add(activity.id));

    return day;
  });

  const route = buildRouteSummary(plannedDays, { destination });
  const totals = calculateItineraryTotals(plannedDays);
  const itinerary = {
    stage: "itinerary-intelligence-v1",
    destination,
    generatedAt: new Date().toISOString(),
    input: {
      destination,
      days: normalizedDays,
      budget,
      group,
      preferences,
      weather
    },
    constraints,
    route,
    days: plannedDays,
    ...buildDayAliases(plannedDays),
    totals,
    skippedCandidates,
    decisionTrace,
    notes: [
      "Deterministic planner output: no LLM schedule generation.",
      "LLMs can explain or refine this schedule later, but constraints own the plan."
    ]
  };

  return {
    ...itinerary,
    feasibility: validateDeterministicItinerary(itinerary)
  };
}

export function buildDeterministicItinerary(input = {}) {
  return planDeterministicItinerary(input);
}

export function replanDeterministicItinerary({
  itineraryInput = {},
  changes = {},
  places = enrichedTravelPlaces
} = {}) {
  const skipDays = new Set(changes.skipDays || []);
  const nextDays = Math.max(1, (itineraryInput.days || 1) - skipDays.size);
  const blockedPlaceIds = [
    ...(itineraryInput.blockedPlaceIds || []),
    ...(changes.blockedPlaceIds || [])
  ];
  const weather = changes.weather || itineraryInput.weather;
  const preferences = {
    ...(itineraryInput.preferences || {}),
    ...(changes.preferences || {})
  };

  if (normalizeText(weather?.condition || weather) === "rain") {
    preferences.indoorBias = true;
  }

  return planDeterministicItinerary({
    ...itineraryInput,
    days: nextDays,
    preferences,
    weather,
    blockedPlaceIds,
    places
  });
}

export function validateDeterministicItinerary(itinerary = {}) {
  const dayReports = (itinerary.days || []).map((day) => {
    const violations = [];
    const placeActivities = day.activities.filter((activity) => activity.kind === "place");

    for (const activity of placeActivities) {
      if (toMinutes(activity.startTime) < toMinutes(activity.openingTime)) {
        violations.push(`${activity.name} starts before opening time.`);
      }
      if (toMinutes(activity.endTime) > toMinutes(activity.closingTime)) {
        violations.push(`${activity.name} ends after closing time.`);
      }
      if (toMinutes(activity.endTime) > toMinutes(day.dayEndTime)) {
        violations.push(`${activity.name} exceeds the day limit.`);
      }
    }

    if (day.totalFatigue > itinerary.constraints.maxDailyFatigue) {
      violations.push(`Daily fatigue ${day.totalFatigue} exceeds limit ${itinerary.constraints.maxDailyFatigue}.`);
    }
    if (day.totalWalkingHours > itinerary.constraints.maxDailyWalkingHours) {
      violations.push(`Walking ${day.totalWalkingHours}h exceeds limit ${itinerary.constraints.maxDailyWalkingHours}h.`);
    }
    if (day.totalCost > itinerary.constraints.dailyBudgetCap) {
      violations.push(`Daily cost ${day.totalCost} exceeds budget cap ${itinerary.constraints.dailyBudgetCap}.`);
    }

    return {
      day: day.day,
      routeLocation: day.routeLocation,
      activityCount: placeActivities.length,
      totalCost: day.totalCost,
      totalFatigue: day.totalFatigue,
      totalWalkingHours: day.totalWalkingHours,
      valid: violations.length === 0,
      violations
    };
  });

  return {
    valid: dayReports.every((report) => report.valid),
    dayReports,
    routeValid: hasNoBacktracking(itinerary.days || [])
  };
}

function deriveTripConstraints({ destination, days, budget, group, preferences, weather, config }) {
  const travelerType = resolveTravelerType(group, preferences);
  const groupSize = Math.max(1, Number(group.adults || 1) + Number(group.children || 0));
  const costMultiplier = Math.min(groupSize, config.groupCostMultiplierCap);
  const dailyBudgetCap = budget ? Math.round(Number(budget) / days) : Infinity;

  return {
    destination,
    days,
    totalBudget: budget ?? null,
    dailyBudgetCap,
    group,
    groupSize,
    costMultiplier,
    travelerType,
    maxDailyFatigue: resolveMaxFatigue(travelerType, config),
    maxDailyWalkingHours: resolveMaxWalkingHours(travelerType, config),
    maxActivitiesPerDay: resolveMaxActivitiesPerDay(travelerType, config),
    dayStartTime: travelerType === "parents" ? config.parentDayStartTime : config.dayStartTime,
    dayEndTime: travelerType === "parents" ? config.parentDayEndTime : config.dayEndTime,
    transferBufferMinutes: config.transferBufferMinutes,
    intraLocationTransferMinutes: config.intraLocationTransferMinutes,
    earlyTransferStartTime: config.earlyTransferStartTime,
    longTransferThresholdMinutes: config.longTransferThresholdMinutes,
    weatherMode: normalizeText(weather?.condition || weather),
    preferences
  };
}

function resolveTravelerType(group = {}, preferences = {}) {
  if (group.parents) return "parents";
  if (normalizeText(preferences.travelStyle) === "backpacker" || group.backpackers) return "backpackers";
  return "balanced";
}

function resolveMaxFatigue(travelerType, config) {
  if (travelerType === "parents") return config.parentMaxFatigue;
  if (travelerType === "backpackers") return config.backpackerMaxFatigue;
  return config.defaultMaxFatigue;
}

function resolveMaxWalkingHours(travelerType, config) {
  if (travelerType === "parents") return config.parentMaxWalkingHours;
  if (travelerType === "backpackers") return config.backpackerMaxWalkingHours;
  return config.defaultMaxWalkingHours;
}

function resolveMaxActivitiesPerDay(travelerType, config) {
  if (travelerType === "parents") return config.parentMaxActivitiesPerDay;
  if (travelerType === "backpackers") return config.backpackerMaxActivitiesPerDay;
  return config.maxActivitiesPerDay;
}

function isHardGroupCompatible(place, constraints) {
  if (constraints.group.parents && place.family_friendly === false) return false;
  return true;
}

function scoreItineraryPlace(place, constraints) {
  const idealFor = new Set((place.ideal_for || place.bestFor || []).map(normalizeText));
  const requestedGroup = constraints.group.parents ? "family" : normalizeText(constraints.preferences.groupType);
  const estimatedCost = estimateGroupCost(place, constraints);
  const budgetPressure = constraints.dailyBudgetCap === Infinity
    ? 0
    : estimatedCost / constraints.dailyBudgetCap;

  let score = 48;
  score += (place.clusterPriority || 70) * 0.22;
  score += place.family_friendly ? 6 : -8;
  score += idealFor.has(requestedGroup) ? 14 : 0;
  score += constraints.group.parents && place.fatigueScore <= 2 ? 16 : 0;
  score += constraints.group.parents && place.fatigueScore === 3 ? 10 : 0;
  score -= constraints.group.parents && place.fatigueScore >= 4 ? 28 : 0;
  score += place.budget_level <= 2 ? 9 : 3;
  score -= budgetPressure > 0.7 ? 18 : 0;
  score -= budgetPressure > 1 ? 40 : 0;
  score -= place.walking_required >= 4 ? 8 : 0;
  score -= weatherPenalty(place, constraints);
  score += preferenceBonus(place, constraints.preferences);

  return Number(clamp(score, 0, 100).toFixed(2));
}

function preferenceBonus(place, preferences = {}) {
  const preferenceTerms = [
    ...(preferences.interests || []),
    ...(preferences.moods || []),
    preferences.vibe,
    preferences.travelStyle
  ].filter(Boolean).map(normalizeText);

  if (!preferenceTerms.length) return 0;

  const placeTerms = new Set([
    place.category,
    ...(place.mood || []),
    ...(place.tags || []),
    ...(place.retrieval_terms || place.retrievalTerms || [])
  ].map(normalizeText));
  return preferenceTerms.filter((term) => placeTerms.has(term)).length * 4;
}

function weatherPenalty(place, constraints) {
  if (constraints.weatherMode !== "rain" && !constraints.preferences.indoorBias) return 0;
  if (place.indoorOutdoor === "indoor") return -8;
  if (place.travelType === "walking" && place.fatigueScore >= 4) return 18;
  return place.indoorOutdoor === "outdoor" ? 10 : 0;
}

function selectRouteLocations({ candidates, destination, days }) {
  const bestByLocation = new Map();
  for (const candidate of candidates) {
    const routeLocation = candidate.routeLocation || candidate.city || candidate.destination;
    const current = bestByLocation.get(routeLocation);
    if (!current || candidate.itineraryScore > current.itineraryScore) {
      bestByLocation.set(routeLocation, candidate);
    }
  }

  const selectedLocations = [...bestByLocation.entries()]
    .sort((a, b) => b[1].itineraryScore - a[1].itineraryScore)
    .slice(0, Math.max(1, Math.min(days, bestByLocation.size)))
    .map(([location]) => location);

  const profile = resolveDestinationProfile(destination);
  const withGateway = profile?.gatewayLocation && bestByLocation.has(profile.gatewayLocation)
    ? [profile.gatewayLocation, ...selectedLocations.filter((location) => location !== profile.gatewayLocation)]
    : selectedLocations;

  return optimizeRouteOrder(withGateway, {
    destination,
    startLocation: profile?.gatewayLocation
  });
}

function distributeLocationsAcrossDays(routeLocations, days) {
  if (!routeLocations.length) return Array.from({ length: days }, () => null);
  return Array.from({ length: days }, (_, index) => {
    const routeIndex = Math.min(
      Math.floor(index * routeLocations.length / days),
      routeLocations.length - 1
    );
    return routeLocations[routeIndex];
  });
}

function planSingleDay({
  dayNumber,
  destination,
  routeLocation,
  previousLocation,
  candidates,
  usedPlaceIds,
  constraints,
  skippedCandidates,
  decisionTrace
}) {
  const dayStartMinutes = toMinutes(constraints.dayStartTime);
  const dayEndMinutes = toMinutes(constraints.dayEndTime);
  const state = {
    currentMinutes: dayStartMinutes,
    totalCost: 0,
    totalFatigue: 0,
    totalWalkingHours: 0,
    activities: []
  };

  addTransferIfNeeded({
    state,
    dayNumber,
    destination,
    previousLocation,
    routeLocation,
    constraints
  });

  const dayCandidates = candidates
    .filter((candidate) => !usedPlaceIds.has(candidate.id))
    .sort((a, b) => candidateRouteSort(a, b, routeLocation));

  for (const candidate of dayCandidates) {
    if (state.activities.filter((activity) => activity.kind === "place").length >= constraints.maxActivitiesPerDay) {
      break;
    }

    const attempt = trySchedulePlace({
      place: candidate,
      routeLocation,
      state,
      constraints
    });

    if (!attempt.feasible) {
      skippedCandidates.push({
        day: dayNumber,
        id: candidate.id,
        name: candidate.name,
        reason: attempt.reason
      });
      continue;
    }

    state.activities.push(attempt.activity);
    state.currentMinutes = attempt.nextCurrentMinutes;
    state.totalCost += attempt.activity.estimatedGroupCost;
    state.totalFatigue = Number((state.totalFatigue + attempt.activity.fatigueScore).toFixed(2));
    state.totalWalkingHours = Number((state.totalWalkingHours + attempt.activity.walkingHours).toFixed(2));

    decisionTrace.push({
      day: dayNumber,
      selected: candidate.name,
      reason: "Selected highest-scoring feasible place for the active route location.",
      routeLocation,
      score: candidate.itineraryScore
    });
  }

  return {
    day: dayNumber,
    title: `Day ${dayNumber}`,
    routeLocation,
    dayStartTime: constraints.dayStartTime,
    dayEndTime: constraints.dayEndTime,
    totalCost: state.totalCost,
    totalFatigue: state.totalFatigue,
    totalWalkingHours: state.totalWalkingHours,
    activities: state.activities
  };
}

function addTransferIfNeeded({ state, dayNumber, destination, previousLocation, routeLocation, constraints }) {
  if (!previousLocation || !routeLocation || previousLocation === routeLocation) return;

  const travelMinutes = estimateTravelMinutes(previousLocation, routeLocation, { destination });
  const transferStart = travelMinutes >= constraints.longTransferThresholdMinutes
    ? toMinutes(constraints.earlyTransferStartTime)
    : state.currentMinutes;
  const transferEnd = transferStart + travelMinutes;

  state.activities.push({
    kind: "transfer",
    day: dayNumber,
    from: previousLocation,
    to: routeLocation,
    startTime: fromMinutes(transferStart),
    endTime: fromMinutes(transferEnd),
    durationMinutes: travelMinutes,
    travelType: "driving",
    fatigueScore: transferFatigue(travelMinutes),
    reason: "Route optimization keeps movement forward instead of bouncing between clusters."
  });

  state.currentMinutes = Math.max(
    state.currentMinutes,
    transferEnd + constraints.transferBufferMinutes
  );
  state.totalFatigue = Number((state.totalFatigue + transferFatigue(travelMinutes)).toFixed(2));
}

function candidateRouteSort(a, b, routeLocation) {
  const aInRoute = (a.routeLocation || a.city) === routeLocation ? 1 : 0;
  const bInRoute = (b.routeLocation || b.city) === routeLocation ? 1 : 0;
  if (aInRoute !== bInRoute) return bInRoute - aInRoute;
  return b.itineraryScore - a.itineraryScore;
}

function trySchedulePlace({ place, routeLocation, state, constraints }) {
  if ((place.routeLocation || place.city) !== routeLocation) {
    return {
      feasible: false,
      reason: "Skipped to avoid cross-cluster backtracking inside the day."
    };
  }

  const durationMinutes = Math.round((place.visitDuration ?? place.visit_duration_hours ?? 1) * 60);
  const openingMinutes = toMinutes(place.openingTime || "09:00");
  const closingMinutes = toMinutes(place.closingTime || "18:00");
  const preferredStart = preferredStartMinutes(place.idealTime);
  const earliestStart = Math.max(state.currentMinutes, openingMinutes);
  const startMinutes = preferredStart >= earliestStart
    && preferredStart + durationMinutes <= closingMinutes
    && preferredStart + durationMinutes <= toMinutes(constraints.dayEndTime)
    ? preferredStart
    : earliestStart;
  const endMinutes = startMinutes + durationMinutes;
  const estimatedGroupCost = estimateGroupCost(place, constraints);
  const fatigueScore = Number(place.fatigueScore ?? place.walking_required ?? 1);
  const walkingHours = estimateWalkingHours(place, durationMinutes);

  if (endMinutes > closingMinutes) {
    return {
      feasible: false,
      reason: `${place.name} would end after closing time.`
    };
  }
  if (endMinutes > toMinutes(constraints.dayEndTime)) {
    return {
      feasible: false,
      reason: `${place.name} would exceed the day limit.`
    };
  }
  if (state.totalFatigue + fatigueScore > constraints.maxDailyFatigue) {
    return {
      feasible: false,
      reason: `${place.name} would exceed max fatigue ${constraints.maxDailyFatigue}.`
    };
  }
  if (state.totalWalkingHours + walkingHours > constraints.maxDailyWalkingHours) {
    return {
      feasible: false,
      reason: `${place.name} would exceed walking limit ${constraints.maxDailyWalkingHours}h.`
    };
  }
  if (state.totalCost + estimatedGroupCost > constraints.dailyBudgetCap) {
    return {
      feasible: false,
      reason: `${place.name} would exceed daily budget cap ${constraints.dailyBudgetCap}.`
    };
  }

  return {
    feasible: true,
    nextCurrentMinutes: endMinutes + constraints.intraLocationTransferMinutes,
    activity: {
      kind: "place",
      id: place.id,
      name: place.name,
      category: place.category,
      destination: place.city,
      routeLocation: place.routeLocation || place.city,
      startTime: fromMinutes(startMinutes),
      endTime: fromMinutes(endMinutes),
      visitDuration: Number((durationMinutes / 60).toFixed(2)),
      durationMinutes,
      openingTime: place.openingTime || "09:00",
      closingTime: place.closingTime || "18:00",
      fatigueScore,
      walkingHours,
      travelType: place.travelType,
      idealTime: place.idealTime,
      estimatedCost: place.estimatedCost,
      estimatedGroupCost,
      itineraryScore: place.itineraryScore,
      reasons: buildActivityReasons(place, constraints)
    }
  };
}

function buildActivityReasons(place, constraints) {
  const reasons = [];
  if (constraints.group.parents && place.fatigueScore <= 3) reasons.push("fits parent-friendly fatigue limits");
  if (place.family_friendly) reasons.push("family friendly");
  if (place.idealTime) reasons.push(`best around ${place.idealTime}`);
  if (place.budget_level <= 2) reasons.push("keeps activity budget controlled");
  if (place.routeLocation || place.city) reasons.push(`fits the ${place.routeLocation || place.city} route cluster`);
  return reasons.slice(0, 4);
}

function estimateGroupCost(place, constraints) {
  return Math.round((place.estimatedCost ?? place.cost_estimate_inr ?? 0) * constraints.costMultiplier);
}

function estimateWalkingHours(place, durationMinutes) {
  if (place.travelType === "boat" || place.travelType === "driving") return 0.25;
  const walkingRatio = place.travelType === "mixed" ? 0.45 : 0.75;
  return Number((durationMinutes / 60 * walkingRatio * ((place.walking_required ?? 2) / 5)).toFixed(2));
}

function transferFatigue(travelMinutes) {
  if (travelMinutes >= 300) return 1.4;
  if (travelMinutes >= 180) return 1.1;
  if (travelMinutes >= 90) return 0.7;
  return 0.3;
}

function preferredStartMinutes(idealTime) {
  const normalized = normalizeText(idealTime);
  const startTimes = {
    morning: "09:00",
    lunch: "13:00",
    afternoon: "14:00",
    "late afternoon": "15:30",
    sunset: "16:30",
    evening: "17:30",
    night: "20:00"
  };
  return toMinutes(startTimes[normalized] || "09:00");
}

function buildRouteSummary(days, { destination }) {
  const routeLocations = [...new Set(days.map((day) => day.routeLocation).filter(Boolean))];
  const transfers = [];

  for (let index = 1; index < routeLocations.length; index += 1) {
    const from = routeLocations[index - 1];
    const to = routeLocations[index];
    transfers.push({
      from,
      to,
      estimatedMinutes: estimateTravelMinutes(from, to, { destination })
    });
  }

  return {
    routeLocations,
    transfers,
    totalTransferMinutes: transfers.reduce((sum, transfer) => sum + transfer.estimatedMinutes, 0),
    backtrackingAvoided: hasNoBacktracking(days)
  };
}

function calculateItineraryTotals(days) {
  return {
    totalCost: days.reduce((sum, day) => sum + day.totalCost, 0),
    totalFatigue: Number(days.reduce((sum, day) => sum + day.totalFatigue, 0).toFixed(2)),
    totalWalkingHours: Number(days.reduce((sum, day) => sum + day.totalWalkingHours, 0).toFixed(2)),
    scheduledPlaceCount: days.reduce(
      (sum, day) => sum + day.activities.filter((activity) => activity.kind === "place").length,
      0
    )
  };
}

function buildDayAliases(days) {
  return Object.fromEntries(days.map((day) => [`day${day.day}`, day.activities]));
}

function hasNoBacktracking(days) {
  const seen = new Set();
  let previous = null;

  for (const day of days) {
    if (!day.routeLocation || day.routeLocation === previous) continue;
    if (seen.has(day.routeLocation)) return false;
    seen.add(day.routeLocation);
    previous = day.routeLocation;
  }

  return true;
}

function toMinutes(value) {
  const [hours, minutes] = String(value || "00:00").split(":").map(Number);
  return hours * 60 + (minutes || 0);
}

function fromMinutes(value) {
  const normalized = Math.max(0, Math.round(value));
  const hours = Math.floor(normalized / 60) % 24;
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
