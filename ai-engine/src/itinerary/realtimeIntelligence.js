import {
  climateFitForIntent,
  normalizeMonth,
  temperatureForMonth
} from "../datasets/travelKnowledge.js";
import { clamp, normalizeText } from "../retrieval/textUtils.js";

const severeWeatherTerms = new Set(["heavy_rain", "rain", "storm", "thunderstorm", "cyclone"]);
const lightWeatherTerms = new Set(["drizzle", "light_rain", "showers"]);

export function buildRealtimeContext({
  weather,
  openingHours = {},
  month,
  date,
  realtimeSignals = {}
} = {}) {
  return {
    month: normalizeMonth(month || monthFromDate(date)),
    weatherByLocation: normalizeWeatherInput(weather || realtimeSignals.weather),
    openingHoursByKey: normalizeOpeningHours(openingHours || realtimeSignals.openingHours),
    warnings: realtimeWarnings(realtimeSignals),
    generatedAt: new Date().toISOString(),
    sources: {
      weather: realtimeSignals.weatherSource || "local-signal",
      openingHours: realtimeSignals.openingHoursSource || "static-or-override"
    }
  };
}

export function applyRealtimeIntelligence(place, realtimeContext = {}, constraints = {}) {
  const openingOverride = findOpeningOverride(place, realtimeContext.openingHoursByKey);
  const placeWithHours = applyOpeningOverride(place, openingOverride);
  const weather = resolveWeatherForPlace(placeWithHours, realtimeContext.weatherByLocation);
  const weatherAssessment = assessWeatherImpact(placeWithHours, weather);
  const seasonalAssessment = assessSeasonalFit(placeWithHours, constraints.month || realtimeContext.month, {
    monsoonPreference: constraints.preferences?.weatherPreference === "rain"
      || constraints.preferences?.monsoon === true
      || constraints.season === "monsoon"
  });
  const openingAssessment = assessOpeningAvailability(openingOverride);
  const realtimeScoreAdjustment = clamp(
    weatherAssessment.scoreAdjustment
      + seasonalAssessment.scoreAdjustment
      + openingAssessment.scoreAdjustment,
    -100,
    35
  );

  return {
    ...placeWithHours,
    temporarilyClosed: openingAssessment.closed,
    availabilityStatus: openingAssessment.status,
    realtimeScoreAdjustment,
    realtime: {
      weather,
      weatherAssessment,
      seasonalAssessment,
      openingHours: openingAssessment,
      source: {
        weather: realtimeContext.sources?.weather,
        openingHours: openingOverride?.source || realtimeContext.sources?.openingHours
      }
    }
  };
}

export function buildRealtimeInsights({ candidates = [], plannedDays = [], constraints = {} } = {}) {
  const scheduledIds = new Set(
    plannedDays.flatMap((day) => day.activities)
      .filter((activity) => activity.kind === "place")
      .map((activity) => activity.id)
  );
  const impactedPlaces = candidates
    .filter((place) => place.realtimeScoreAdjustment < 0 || place.temporarilyClosed)
    .map((place) => ({
      id: place.id,
      name: place.name,
      routeLocation: place.routeLocation || place.city,
      scheduled: scheduledIds.has(place.id),
      adjustment: place.realtimeScoreAdjustment,
      reasons: realtimeReasons(place)
    }))
    .slice(0, 8);

  const alternatives = impactedPlaces.map((impacted) => ({
    for: impacted.name,
    alternatives: candidates
      .filter((candidate) => candidate.id !== impacted.id)
      .filter((candidate) => !candidate.temporarilyClosed)
      .filter((candidate) => (candidate.routeLocation || candidate.city) === impacted.routeLocation)
      .filter((candidate) => candidate.realtimeScoreAdjustment >= 0 || candidate.indoorOutdoor !== "outdoor")
      .sort((a, b) => b.itineraryScore - a.itineraryScore)
      .slice(0, 3)
      .map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        reason: bestAlternativeReason(candidate, constraints)
      }))
  })).filter((item) => item.alternatives.length > 0);

  return {
    dynamicSignalsApplied: candidates.some((candidate) => candidate.realtime),
    impactedPlaces,
    alternatives
  };
}

export function assessWeatherImpact(place, weather) {
  const condition = normalizeWeatherCondition(weather?.condition);
  if (!condition || condition === "clear") {
    return {
      condition: "clear",
      scoreAdjustment: 0,
      riskLevel: "low",
      reasons: []
    };
  }

  const isSevere = severeWeatherTerms.has(condition);
  const isLight = lightWeatherTerms.has(condition);
  const outdoor = place.indoorOutdoor === "outdoor";
  const indoor = place.indoorOutdoor === "indoor";
  const highWalking = place.travelType === "walking" || place.walking_required >= 4;
  const waterOrView = ["beach", "backwater", "lake", "viewpoint", "island"].includes(normalizeText(place.category));

  let adjustment = 0;
  const reasons = [];

  if (isSevere && outdoor) {
    adjustment -= 22;
    reasons.push("heavy weather reduces outdoor fit");
  }
  if (isSevere && highWalking) {
    adjustment -= 10;
    reasons.push("walking-heavy plan is weaker in bad weather");
  }
  if (isSevere && waterOrView) {
    adjustment -= 8;
    reasons.push("views and water activities are weather-sensitive");
  }
  if (isSevere && indoor) {
    adjustment += 14;
    reasons.push("indoor option improves during bad weather");
  }
  if (isLight && outdoor) {
    adjustment -= 8;
    reasons.push("light rain slightly reduces outdoor fit");
  }
  if (isLight && indoor) {
    adjustment += 6;
    reasons.push("indoor option is a stronger weather backup");
  }

  return {
    condition,
    scoreAdjustment: adjustment,
    riskLevel: adjustment <= -25 ? "high" : adjustment < 0 ? "medium" : "low",
    reasons
  };
}

export function assessSeasonalFit(place, month, { monsoonPreference = false } = {}) {
  const normalizedMonth = normalizeMonth(month);
  if (!normalizedMonth) {
    return {
      month: null,
      scoreAdjustment: 0,
      riskLevel: "unknown",
      reasons: []
    };
  }

  const bestMonths = new Set((place.best_months || []).map(normalizeMonth));
  const peakSeason = new Set((place.peak_season || []).map(normalizeMonth));
  const monsoonMonths = new Set((place.monsoon_months || []).map(normalizeMonth));
  const temp = temperatureForMonth(place, normalizedMonth);
  let adjustment = 0;
  const reasons = [];

  if (bestMonths.has(normalizedMonth)) {
    adjustment += 10;
    reasons.push("month is in best travel window");
  }
  if (peakSeason.has(normalizedMonth)) {
    adjustment += 5;
    reasons.push("month is in peak season");
  }
  if (!bestMonths.has(normalizedMonth) && !peakSeason.has(normalizedMonth)) {
    adjustment -= 6;
    reasons.push("month is outside the strongest travel window");
  }
  if (monsoonMonths.has(normalizedMonth)) {
    if (monsoonPreference) {
      adjustment += 6;
      reasons.push("monsoon preference matches rainy-season travel");
    } else {
      adjustment -= 18;
      reasons.push("month falls in monsoon/rain-risk window");
    }
  }

  const climateFit = climateFitForIntent(place, {
    month: normalizedMonth,
    climatePreference: inferClimatePreference(place)
  });
  if (climateFit >= 0.95) {
    adjustment += 4;
    reasons.push("temperature supports the activity");
  } else if (climateFit <= 0.42) {
    adjustment -= 8;
    reasons.push("temperature weakens comfort");
  }

  return {
    month: normalizedMonth,
    temperatureC: temp,
    scoreAdjustment: clamp(adjustment, -24, 18),
    riskLevel: adjustment <= -14 ? "high" : adjustment < 0 ? "medium" : "low",
    reasons
  };
}

function normalizeWeatherInput(weather) {
  if (!weather) return {};
  if (typeof weather === "string") {
    return {
      "*": {
        condition: normalizeWeatherCondition(weather)
      }
    };
  }
  if (weather.condition) {
    return {
      "*": {
        ...weather,
        condition: normalizeWeatherCondition(weather.condition)
      }
    };
  }

  return Object.fromEntries(
    Object.entries(weather).map(([key, value]) => [
      normalizeText(key),
      typeof value === "string"
        ? { condition: normalizeWeatherCondition(value) }
        : { ...value, condition: normalizeWeatherCondition(value?.condition) }
    ])
  );
}

function normalizeOpeningHours(openingHours = {}) {
  return Object.fromEntries(
    Object.entries(openingHours).map(([key, value]) => [
      normalizeText(key),
      {
        ...value,
        source: value?.source || "opening-hours-override"
      }
    ])
  );
}

function findOpeningOverride(place, openingHoursByKey = {}) {
  return [
    place.id,
    place.name,
    place.routeLocation,
    place.city,
    "*"
  ].map(normalizeText)
    .map((key) => openingHoursByKey[key])
    .find(Boolean);
}

function applyOpeningOverride(place, openingOverride) {
  if (!openingOverride) return place;
  return {
    ...place,
    openingTime: openingOverride.openingTime || openingOverride.open || place.openingTime,
    closingTime: openingOverride.closingTime || openingOverride.close || place.closingTime,
    openingHoursSource: openingOverride.source,
    openingHoursOverrideApplied: true
  };
}

function assessOpeningAvailability(openingOverride) {
  if (!openingOverride) {
    return {
      status: "assumed-open",
      closed: false,
      scoreAdjustment: 0,
      reasons: []
    };
  }

  if (openingOverride.closed) {
    return {
      status: "closed",
      closed: true,
      scoreAdjustment: -100,
      reasons: ["live opening-hours source says closed"]
    };
  }

  return {
    status: "open-override",
    closed: false,
    scoreAdjustment: 0,
    openingTime: openingOverride.openingTime || openingOverride.open,
    closingTime: openingOverride.closingTime || openingOverride.close,
    reasons: ["opening hours overridden by external source"]
  };
}

function resolveWeatherForPlace(place, weatherByLocation = {}) {
  return [
    place.id,
    place.name,
    place.routeLocation,
    place.city,
    place.destination,
    "*"
  ].map(normalizeText)
    .map((key) => weatherByLocation[key])
    .find(Boolean) || { condition: "clear" };
}

function normalizeWeatherCondition(condition) {
  return normalizeText(condition).replace(/\s+/g, "_") || "clear";
}

function inferClimatePreference(place) {
  const category = normalizeText(place.category);
  const climateTags = new Set((place.climate_tags || []).map(normalizeText));
  if (climateTags.has("cool") || climateTags.has("mountains") || climateTags.has("snow")) return "cool";
  if (["mountain", "trek", "nature", "valley"].includes(category)) return "cool";
  if (["beach", "island", "backwater"].includes(category)) return "warm";
  return undefined;
}

function realtimeReasons(place) {
  return [
    ...(place.realtime?.weatherAssessment?.reasons || []),
    ...(place.realtime?.seasonalAssessment?.reasons || []),
    ...(place.realtime?.openingHours?.reasons || [])
  ].slice(0, 4);
}

function bestAlternativeReason(place, constraints) {
  if (place.indoorOutdoor === "indoor") return "stronger indoor backup";
  if (place.realtime?.seasonalAssessment?.scoreAdjustment > 0) return `better ${constraints.month || "season"} fit`;
  if (place.fatigueScore <= 2) return "lower fatigue replacement";
  return "higher deterministic fit under current signals";
}

function monthFromDate(date) {
  if (!date) return null;
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return null;
  return parsedDate.toLocaleString("en", { month: "short" });
}

function realtimeWarnings(realtimeSignals = {}) {
  return [
    realtimeSignals.weatherError ? "weather provider unavailable" : null,
    realtimeSignals.openingHoursError ? "opening-hours provider unavailable" : null,
    realtimeSignals.routeError ? "route provider unavailable" : null
  ].filter(Boolean);
}
