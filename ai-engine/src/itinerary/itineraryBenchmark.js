import {
  planDeterministicItinerary,
  replanDeterministicItinerary,
  validateDeterministicItinerary
} from "./deterministicPlanner.js";

export const itineraryBenchmarkScenarios = buildItineraryBenchmarkScenarios();

export function runItineraryBenchmark({
  scenarios = itineraryBenchmarkScenarios,
  places
} = {}) {
  const results = scenarios.map((scenario) => {
    const itinerary = scenario.replanChanges
      ? replanDeterministicItinerary({
        itineraryInput: scenario.input,
        changes: scenario.replanChanges,
        places
      })
      : planDeterministicItinerary({
        ...scenario.input,
        places
      });
    const validation = validateDeterministicItinerary(itinerary);
    const failures = collectItineraryFailures({ scenario, itinerary, validation });

    return {
      id: scenario.id,
      category: scenario.category,
      description: scenario.description,
      passed: failures.length === 0,
      failures,
      scheduledPlaceCount: itinerary.totals.scheduledPlaceCount,
      routeLocations: itinerary.route.routeLocations,
      totalCost: itinerary.totals.totalCost,
      maxDailyFatigue: itinerary.constraints.maxDailyFatigue,
      maxDailyWalkingHours: itinerary.constraints.maxDailyWalkingHours,
      dynamicSignalsApplied: itinerary.realtimeInsights.dynamicSignalsApplied
    };
  });

  const failures = results.filter((result) => !result.passed);
  const byCategory = results.reduce((summary, result) => {
    const current = summary[result.category] || { count: 0, failures: 0 };
    summary[result.category] = {
      count: current.count + 1,
      failures: current.failures + (result.passed ? 0 : 1)
    };
    return summary;
  }, {});

  return {
    scenarioCount: scenarios.length,
    failureCount: failures.length,
    passRate: Number(((results.length - failures.length) / Math.max(results.length, 1)).toFixed(4)),
    byCategory,
    failures,
    results
  };
}

function collectItineraryFailures({ scenario, itinerary, validation }) {
  const failures = [];
  const minimumScheduledPlaces = scenario.expectations?.minimumScheduledPlaces ?? 1;

  if (!validation.valid) {
    failures.push({
      type: "feasibility",
      message: "Itinerary contains impossible schedule, budget, fatigue, walking, or opening-hour violations.",
      dayReports: validation.dayReports.filter((report) => !report.valid)
    });
  }
  if (!validation.routeValid || !itinerary.route.backtrackingAvoided) {
    failures.push({
      type: "route-backtracking",
      message: "Route repeats a location after moving away from it."
    });
  }
  if (itinerary.totals.scheduledPlaceCount < minimumScheduledPlaces) {
    failures.push({
      type: "minimum-scheduled-places",
      message: `Scheduled ${itinerary.totals.scheduledPlaceCount}; expected at least ${minimumScheduledPlaces}.`
    });
  }
  if (scenario.expectations?.requiresDynamicSignals && !itinerary.realtimeInsights.dynamicSignalsApplied) {
    failures.push({
      type: "dynamic-signals",
      message: "Scenario expected weather/opening-hours/seasonal signals to affect planning."
    });
  }

  return failures;
}

function buildItineraryBenchmarkScenarios() {
  return [
    ...buildCategory("parents", [
      ["Kerala", 4, 50000, "Dec"],
      ["Goa", 3, 36000, "Jan"],
      ["Rajasthan", 4, 65000, "Feb"],
      ["Karnataka", 4, 52000, "Dec"],
      ["Jaipur", 2, 22000, "Jan"],
      ["Udaipur", 2, 28000, "Feb"],
      ["Coorg", 2, 30000, "Dec"],
      ["Alleppey", 2, 26000, "Jan"],
      ["Varkala", 2, 24000, "Feb"],
      ["Delhi", 1, 12000, "Dec"]
    ], ({ destination, days, budget, month }, index) => ({
      id: `parents_${index}`,
      description: `${destination} parent-friendly fatigue plan`,
      input: {
        destination,
        days,
        budget,
        month,
        group: { adults: 2, parents: true },
        preferences: { interests: ["family", "slow"], vibe: "relaxed" }
      }
    })),
    ...buildCategory("honeymoon", [
      ["Kerala", 4, 70000, "Jan"],
      ["Goa", 3, 52000, "Dec"],
      ["Udaipur", 3, 60000, "Feb"],
      ["Jaisalmer", 3, 68000, "Jan"],
      ["Havelock Island", 3, 90000, "Feb"],
      ["Shaheed Dweep", 3, 78000, "Feb"],
      ["Coorg", 3, 56000, "Dec"],
      ["Varkala", 2, 38000, "Jan"],
      ["Alleppey", 2, 42000, "Dec"],
      ["Gokarna", 2, 30000, "Jan"]
    ], ({ destination, days, budget, month }, index) => ({
      id: `honeymoon_${index}`,
      description: `${destination} romantic couple plan`,
      input: {
        destination,
        days,
        budget,
        month,
        group: { adults: 2 },
        preferences: { groupType: "couples", interests: ["romantic", "sunset"], vibe: "slow" }
      }
    })),
    ...buildCategory("solo_backpacker", [
      ["Goa", 3, 18000, "Jan"],
      ["Kasol", 3, 15000, "May"],
      ["Rishikesh", 2, 14000, "Apr"],
      ["Hampi", 2, 12000, "Dec"],
      ["Gokarna", 2, 11000, "Jan"],
      ["Varkala", 2, 14000, "Feb"],
      ["Ziro", 3, 18000, "Oct"],
      ["McLeod Ganj", 2, 12000, "May"],
      ["Manali", 2, 18000, "Dec"],
      ["Kerala", 4, 28000, "Jan"]
    ], ({ destination, days, budget, month }, index) => ({
      id: `solo_backpacker_${index}`,
      description: `${destination} solo backpacker plan`,
      input: {
        destination,
        days,
        budget,
        month,
        group: { adults: 1, backpackers: true },
        preferences: { travelStyle: "backpacker", interests: ["budget", "nature", "social"] }
      }
    })),
    ...buildCategory("luxury", [
      ["Kerala", 5, 120000, "Dec"],
      ["Goa", 4, 90000, "Jan"],
      ["Rajasthan", 5, 130000, "Feb"],
      ["Udaipur", 3, 90000, "Jan"],
      ["Jaisalmer", 3, 95000, "Dec"],
      ["Havelock Island", 4, 150000, "Feb"],
      ["Coorg", 3, 85000, "Dec"],
      ["Alleppey", 3, 90000, "Jan"],
      ["Varkala", 3, 70000, "Feb"],
      ["Manali", 3, 80000, "Dec"]
    ], ({ destination, days, budget, month }, index) => ({
      id: `luxury_${index}`,
      description: `${destination} premium comfort plan`,
      input: {
        destination,
        days,
        budget,
        month,
        group: { adults: 2 },
        preferences: { interests: ["premium", "scenic", "comfort"], vibe: "slow" }
      }
    })),
    ...buildCategory("low_budget", [
      ["Goa", 3, 15000, "Jan"],
      ["Jaipur", 2, 9000, "Dec"],
      ["Delhi", 1, 3000, "Jan"],
      ["Hampi", 2, 8000, "Jan"],
      ["Gokarna", 2, 7000, "Feb"],
      ["Kasol", 2, 7000, "May"],
      ["Rishikesh", 2, 9000, "Apr"],
      ["Varkala", 2, 9000, "Feb"],
      ["Madurai", 1, 4000, "Jan"],
      ["Kerala", 4, 32000, "Jan"]
    ], ({ destination, days, budget, month }, index) => ({
      id: `low_budget_${index}`,
      description: `${destination} low-budget itinerary`,
      input: {
        destination,
        days,
        budget,
        month,
        group: { adults: 1 },
        preferences: { interests: ["budget", "local"], travelStyle: "backpacker" }
      }
    })),
    ...buildCategory("rainy_season", [
      ["Kerala", 4, 60000, "Jun"],
      ["Goa", 3, 45000, "Jul"],
      ["Karnataka", 4, 52000, "Jul"],
      ["Coorg", 2, 32000, "Jul"],
      ["Varkala", 2, 28000, "Jun"],
      ["Alleppey", 2, 34000, "Aug"],
      ["Munnar", 2, 26000, "Jul"],
      ["Mumbai", 1, 10000, "Jul"],
      ["Hampi", 2, 16000, "Aug"],
      ["Gokarna", 2, 18000, "Jul"]
    ], ({ destination, days, budget, month }, index) => ({
      id: `rainy_season_${index}`,
      description: `${destination} rainy-season weather-aware plan`,
      input: {
        destination,
        days,
        budget,
        month,
        weather: { "*": { condition: "heavy rain" } },
        group: { adults: 2 },
        preferences: { interests: ["indoor", "slow"], indoorBias: true }
      },
      expectations: {
        requiresDynamicSignals: true
      }
    })),
    ...buildCategory("short_trips", [
      ["Goa", 1, 12000, "Jan"],
      ["Jaipur", 1, 9000, "Dec"],
      ["Udaipur", 1, 12000, "Feb"],
      ["Varkala", 1, 10000, "Jan"],
      ["Alleppey", 1, 12000, "Dec"],
      ["Munnar", 1, 9000, "Jan"],
      ["Rishikesh", 1, 7000, "Apr"],
      ["Delhi", 1, 4000, "Jan"],
      ["Madurai", 1, 5000, "Jan"],
      ["Hampi", 1, 7000, "Dec"]
    ], ({ destination, days, budget, month }, index) => ({
      id: `short_trips_${index}`,
      description: `${destination} compressed short trip`,
      input: {
        destination,
        days,
        budget,
        month,
        group: { adults: 2 },
        preferences: { compressRemaining: true }
      }
    })),
    ...buildCategory("long_trips", [
      ["Kerala", 7, 95000, "Dec"],
      ["Goa", 5, 65000, "Jan"],
      ["Rajasthan", 6, 100000, "Feb"],
      ["Karnataka", 6, 80000, "Dec"],
      ["Andaman and Nicobar Islands", 5, 125000, "Feb"],
      ["Himachal Pradesh", 5, 85000, "May"],
      ["Maharashtra", 4, 52000, "Jan"],
      ["Meghalaya", 4, 56000, "Feb"],
      ["Kerala", 6, 85000, "Aug"],
      ["Goa", 5, 62000, "Jul"]
    ], ({ destination, days, budget, month }, index) => ({
      id: `long_trips_${index}`,
      description: `${destination} longer multi-day plan`,
      input: {
        destination,
        days,
        budget,
        month,
        group: { adults: 2, backpackers: destination === "Meghalaya" },
        preferences: { interests: ["balanced", "scenic"] }
      }
    })),
    ...buildCategory("opening_overrides", [
      ["Goa", 3, 42000, "Jan", "goa_001"],
      ["Kerala", 4, 60000, "Dec", "kerala_004"],
      ["Rajasthan", 4, 70000, "Feb", "rajasthan_001"],
      ["Karnataka", 4, 60000, "Dec", "karnataka_001"],
      ["Jaipur", 2, 24000, "Jan", "rajasthan_002"],
      ["Goa", 2, 36000, "Feb", "goa_007"],
      ["Goa", 2, 28000, "Feb", "goa_003"],
      ["Kerala", 3, 50000, "Jan", "kerala_002"],
      ["Rajasthan", 3, 52000, "Dec", "rajasthan_003"],
      ["Karnataka", 3, 46000, "Jan", "karnataka_003"]
    ], ({ destination, days, budget, month, closedId }, index) => ({
      id: `opening_overrides_${index}`,
      description: `${destination} with live opening-hours override`,
      input: {
        destination,
        days,
        budget,
        month,
        openingHours: {
          [closedId]: {
            closed: true,
            source: "mock-places-api"
          }
        },
        group: { adults: 2 },
        preferences: { interests: ["balanced"] }
      },
      expectations: {
        requiresDynamicSignals: true
      }
    })),
    ...buildCategory("disruptions", [
      ["Kerala", 4, 65000, "Dec", { skipDays: [2] }],
      ["Goa", 3, 42000, "Jan", { flightDelayHours: 5 }],
      ["Rajasthan", 4, 72000, "Feb", { parentsTired: true }],
      ["Karnataka", 4, 62000, "Dec", { weather: { "*": { condition: "rain" } } }],
      ["Udaipur", 2, 36000, "Jan", { flightDelayMinutes: 180 }],
      ["Alleppey", 2, 36000, "Dec", { parentsTired: true }],
      ["Varkala", 2, 32000, "Jan", { skipDays: [1] }],
      ["Jaipur", 2, 26000, "Jan", { openingHours: { rajasthan_002: { closed: true } } }],
      ["Goa", 3, 42000, "Jul", { weather: { "*": { condition: "heavy rain" } } }],
      ["Kerala", 5, 76000, "Aug", { parentsTired: true, weather: { "*": { condition: "rain" } } }]
    ], ({ destination, days, budget, month, changes }, index) => ({
      id: `disruptions_${index}`,
      description: `${destination} dynamic replanning disruption`,
      input: {
        destination,
        days,
        budget,
        month,
        group: { adults: 2, parents: index % 3 === 0 },
        preferences: { interests: ["balanced", "low fatigue"] }
      },
      replanChanges: changes,
      expectations: {
        minimumScheduledPlaces: 1
      }
    }))
  ];
}

function buildCategory(category, rows, factory) {
  return rows.map((row, index) => {
    const [destination, days, budget, month, extra] = row;
    const scenario = factory({
      destination,
      days,
      budget,
      month,
      closedId: extra,
      changes: extra
    }, index + 1);
    return {
      category,
      expectations: {
        minimumScheduledPlaces: 1,
        ...(scenario.expectations || {})
      },
      ...scenario
    };
  });
}
