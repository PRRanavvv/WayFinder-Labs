import { enrichedTravelPlaces } from "../datasets/enrichedPlaces.js";
import { calculateConfidence } from "../intelligence/confidenceScoring.js";
import {
  analyzeProductionInput,
  assessGroupPlanningEdges,
  detectBudgetConflict,
  resolveLocationMention,
  validateExplanationReasons
} from "../intelligence/productionGuards.js";
import { rankDestinationRecommendations } from "../intelligence/recommendationEngine.js";
import { planDeterministicItinerary, replanDeterministicItinerary } from "../itinerary/deterministicPlanner.js";
import { assessSeasonalFit } from "../itinerary/realtimeIntelligence.js";

export const productionEdgeCaseScenarios = [
  {
    id: "conflict_cheap_luxury_honeymoon",
    category: "user_input",
    description: "Cheap luxury honeymoon trip should detect budget contradiction.",
    evaluate: () => {
      const analysis = analyzeProductionInput({ query: "cheap luxury honeymoon trip" });
      return expect({
        analysis,
        passed: hasConflict(analysis, "budget-luxury") && analysis.confidence < 0.78 && analysis.tradeoffs.length > 0
      });
    }
  },
  {
    id: "conflict_adventure_tired_parents",
    category: "user_input",
    description: "Adventure trip for tired parents should lower confidence.",
    evaluate: () => {
      const analysis = analyzeProductionInput({
        query: "adventure trip for tired parents",
        group: { adults: 2, parents: true }
      });
      return expect({
        analysis,
        passed: hasConflict(analysis, "adventure-fatigue") && analysis.confidence < 0.78
      });
    }
  },
  {
    id: "conflict_quiet_nightlife",
    category: "user_input",
    description: "Quiet destination with great nightlife should explain the vibe tradeoff.",
    evaluate: () => {
      const analysis = analyzeProductionInput({ query: "quiet destination with great nightlife" });
      return expect({
        analysis,
        passed: hasConflict(analysis, "quiet-nightlife") && analysis.tradeoffs.some((item) => item.includes("quiet base"))
      });
    }
  },
  {
    id: "missing_plan_trip",
    category: "user_input",
    description: "Generic trip prompt should ask follow-up questions.",
    evaluate: () => {
      const analysis = analyzeProductionInput({ query: "Plan a trip" });
      return expect({
        analysis,
        passed: analysis.followUpQuestions.length >= 3 && analysis.confidence < 0.7
      });
    }
  },
  {
    id: "missing_somewhere_nice",
    category: "user_input",
    description: "Vague suggestion prompt should not hallucinate assumptions.",
    evaluate: () => {
      const analysis = analyzeProductionInput({ query: "Suggest somewhere nice" });
      return expect({
        analysis,
        passed: analysis.missingInfo.includes("destination or region") && analysis.followUpQuestions.length > 0
      });
    }
  },
  {
    id: "impossible_five_countries_three_days",
    category: "user_input",
    description: "Five countries in three days should be rejected or reframed.",
    evaluate: () => {
      const analysis = analyzeProductionInput({ query: "5 countries in 3 days", days: 3 });
      return expect({
        analysis,
        passed: hasImpossible(analysis, "too-many-countries") && analysis.confidence < 0.6
      });
    }
  },
  {
    id: "impossible_kashmir_goa_kerala_weekend",
    category: "user_input",
    description: "Kashmir + Goa + Kerala in a weekend should be rejected as transit-heavy.",
    evaluate: () => {
      const analysis = analyzeProductionInput({ query: "Kashmir + Goa + Kerala in a weekend" });
      return expect({
        analysis,
        passed: hasImpossible(analysis, "far-region-weekend") && analysis.tradeoffs.length > 0
      });
    }
  },
  {
    id: "group_one_user_dominates",
    category: "group_planning",
    description: "Three beach users should not completely ignore one mountains-only user.",
    evaluate: () => {
      const assessment = assessGroupPlanningEdges([
        { id: "a", interests: ["beach"] },
        { id: "b", interests: ["beach"] },
        { id: "c", interests: ["beach"] },
        { id: "d", interests: ["mountains"] }
      ]);
      return expect({
        assessment,
        passed: assessment.minorityPreferences.includes("mountains") && assessment.compromiseNeeded
      });
    }
  },
  {
    id: "group_no_common_ground",
    category: "group_planning",
    description: "No common ground should trigger compromise scoring.",
    evaluate: () => {
      const assessment = assessGroupPlanningEdges([
        { id: "a", interests: ["trekking"] },
        { id: "b", interests: ["luxury spa"] },
        { id: "c", interests: ["religious tourism"] },
        { id: "d", interests: ["nightlife"] }
      ]);
      return expect({
        assessment,
        passed: assessment.conflictLevel === "high" && assessment.compromiseNeeded
      });
    }
  },
  {
    id: "group_budget_conflict",
    category: "group_planning",
    description: "20k vs 2 lakh budgets should surface mismatch.",
    evaluate: () => {
      const budgetConflict = detectBudgetConflict([
        { id: "a", budget: 20000 },
        { id: "b", budget: 200000 }
      ]);
      return expect({
        budgetConflict,
        passed: budgetConflict.conflicts.some((conflict) => conflict.type === "budget-mismatch")
      });
    }
  },
  {
    id: "itinerary_everything_closed",
    category: "itinerary",
    description: "Everything closed should return no optimal itinerary instead of garbage.",
    evaluate: () => {
      const itinerary = planDeterministicItinerary({
        destination: "Testland",
        days: 1,
        budget: 10000,
        places: testPlaces(),
        openingHours: {
          "*": { closed: true, source: "holiday-hours" }
        },
        weather: { "*": { condition: "heavy rain" } }
      });
      return expect({
        itinerary,
        passed: itinerary.plannerStatus === "no_optimal_itinerary_available"
          && itinerary.totals.scheduledPlaceCount === 0
          && itinerary.confidence < 0.55
      });
    }
  },
  {
    id: "itinerary_flight_delay",
    category: "itinerary",
    description: "Flight delayed eight hours should rebuild day start.",
    evaluate: () => {
      const itinerary = replanDeterministicItinerary({
        itineraryInput: {
          destination: "Kerala",
          days: 4,
          budget: 50000,
          group: { adults: 2, parents: true }
        },
        changes: { flightDelayHours: 8 }
      });
      return expect({
        itinerary,
        passed: itinerary.days[0].dayStartTime === "17:30" && itinerary.confidence < 0.86
      });
    }
  },
  {
    id: "itinerary_skip_day_redistributes",
    category: "itinerary",
    description: "Skipping Day 2 should recalculate remaining days with activities.",
    evaluate: () => {
      const itinerary = replanDeterministicItinerary({
        itineraryInput: {
          destination: "Kerala",
          days: 4,
          budget: 50000,
          group: { adults: 2, parents: true }
        },
        changes: { skipDays: [2] }
      });
      return expect({
        itinerary,
        passed: itinerary.days.length === 3 && itinerary.totals.scheduledPlaceCount >= 3
      });
    }
  },
  {
    id: "retrieval_unknown_destination",
    category: "retrieval",
    description: "Unknown hidden village query should produce nearest matches and confidence warning.",
    evaluate: () => {
      const resolution = resolveLocationMention("hidden village near mountains in Tirthan with no tourists");
      return expect({
        resolution,
        passed: resolution.status === "unknown"
          && resolution.nearestMatches.length > 0
          && Boolean(resolution.confidenceWarning)
      });
    }
  },
  {
    id: "retrieval_ambiguous_paris",
    category: "retrieval",
    description: "Paris should be treated as ambiguous.",
    evaluate: () => {
      const resolution = resolveLocationMention("Paris");
      return expect({
        resolution,
        passed: resolution.status === "ambiguous" && resolution.ambiguousOptions.length === 2
      });
    }
  },
  {
    id: "retrieval_misspellings",
    category: "retrieval",
    description: "Munnar, Manalli, and Goaa should resolve through exact/fuzzy matching.",
    evaluate: () => {
      const munnar = resolveLocationMention("Munnar");
      const manali = resolveLocationMention("Manalli");
      const goa = resolveLocationMention("Goaa");
      return expect({
        munnar,
        manali,
        goa,
        passed: munnar.normalizedDestination === "Munnar"
          && manali.normalizedDestination === "Manali"
          && goa.normalizedDestination === "Goa"
      });
    }
  },
  {
    id: "season_snow_may",
    category: "season_weather",
    description: "Snow destination in May should be flagged as climate contradiction.",
    evaluate: () => {
      const analysis = analyzeProductionInput({ query: "snow destination in May", month: "May" });
      return expect({
        analysis,
        passed: hasConflict(analysis, "season-climate") && analysis.confidence < 0.8
      });
    }
  },
  {
    id: "season_monsoon_requested",
    category: "season_weather",
    description: "Kerala in July with rain preference should not blindly penalize monsoon.",
    evaluate: () => {
      const place = enrichedTravelPlaces.find((item) => item.id === "kerala_002");
      const monsoonWanted = assessSeasonalFit(place, "Jul", { monsoonPreference: true });
      const monsoonUnwanted = assessSeasonalFit(place, "Jul");
      return expect({
        monsoonWanted,
        monsoonUnwanted,
        passed: monsoonWanted.scoreAdjustment > monsoonUnwanted.scoreAdjustment
          && monsoonWanted.reasons.some((reason) => reason.includes("monsoon preference"))
      });
    }
  },
  {
    id: "recommendation_dataset_bias_diversity",
    category: "recommendation",
    description: "Diversity controls should prevent one destination from dominating.",
    evaluate: () => {
      const recommendations = rankDestinationRecommendations({
        places: enrichedTravelPlaces,
        topK: 8,
        diversityControls: { maxPerDestination: 2 }
      });
      const counts = countByDestination(recommendations);
      return expect({
        counts,
        passed: [...counts.values()].every((count) => count <= 2)
      });
    }
  },
  {
    id: "recommendation_visited_destinations",
    category: "recommendation",
    description: "Repeated Goa visitors should not keep receiving Goa.",
    evaluate: () => {
      const recommendations = rankDestinationRecommendations({
        places: enrichedTravelPlaces,
        visitedDestinations: ["Goa"],
        topK: 8
      });
      return expect({
        recommendations: recommendations.map((place) => place.name),
        passed: recommendations.every((place) => place.destination !== "Goa")
      });
    }
  },
  {
    id: "realtime_weather_api_down",
    category: "realtime",
    description: "Weather API failure should gracefully fallback and lower confidence.",
    evaluate: () => {
      const itinerary = planDeterministicItinerary({
        destination: "Kerala",
        days: 3,
        budget: 50000,
        realtimeSignals: { weatherError: true }
      });
      return expect({
        itinerary,
        passed: itinerary.feasibility.valid
          && itinerary.confidenceReasons.some((reason) => reason.includes("weather provider unavailable"))
      });
    }
  },
  {
    id: "realtime_route_timeout",
    category: "realtime",
    description: "Route API timeout should still use local graph fallback.",
    evaluate: () => {
      const itinerary = planDeterministicItinerary({
        destination: "Kerala",
        days: 4,
        budget: 50000,
        realtimeSignals: { routeError: true }
      });
      return expect({
        itinerary,
        passed: itinerary.route.totalTransferMinutes > 0
          && itinerary.confidenceReasons.some((reason) => reason.includes("route provider unavailable"))
      });
    }
  },
  {
    id: "realtime_partial_data",
    category: "realtime",
    description: "Weather available and opening hours unavailable should still function.",
    evaluate: () => {
      const itinerary = planDeterministicItinerary({
        destination: "Kerala",
        days: 3,
        budget: 50000,
        weather: { "*": { condition: "heavy rain" } },
        realtimeSignals: { openingHoursError: true }
      });
      return expect({
        itinerary,
        passed: itinerary.realtimeInsights.dynamicSignalsApplied && itinerary.feasibility.valid
      });
    }
  },
  {
    id: "explainability_no_ai_thinks",
    category: "explainability",
    description: "Reasons must be grounded, never 'AI thinks so'.",
    evaluate: () => {
      const [recommendation] = rankDestinationRecommendations({
        places: enrichedTravelPlaces,
        userPreferences: { interests: ["family", "nature"] },
        topK: 1
      });
      const explanation = validateExplanationReasons(recommendation.recommendationReasons);
      return expect({
        reasons: recommendation.recommendationReasons,
        explanation,
        passed: explanation.valid
      });
    }
  },
  {
    id: "confidence_weak_context",
    category: "confidence",
    description: "Weak retrieval, missing weather, sparse data, and conflicts should drop confidence.",
    evaluate: () => {
      const confidence = calculateConfidence({
        retrievalScore: 32,
        missingInfo: ["destination", "budget"],
        conflicts: ["quiet-nightlife"],
        fallbackWarnings: ["weather provider unavailable"],
        sparseData: true
      });
      return expect({
        confidence,
        passed: confidence.confidence < 0.55 && confidence.confidenceLevel === "low"
      });
    }
  }
];

export async function runProductionEdgeCaseBenchmark({
  scenarios = productionEdgeCaseScenarios
} = {}) {
  const results = [];

  for (const scenario of scenarios) {
    try {
      const result = await scenario.evaluate();
      results.push({
        id: scenario.id,
        category: scenario.category,
        description: scenario.description,
        ...result
      });
    } catch (error) {
      results.push({
        id: scenario.id,
        category: scenario.category,
        description: scenario.description,
        passed: false,
        failures: [error.message],
        details: null
      });
    }
  }

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
    passRate: Number(((scenarios.length - failures.length) / scenarios.length).toFixed(4)),
    byCategory,
    failures,
    results
  };
}

function expect({ passed, ...details }) {
  return {
    passed: Boolean(passed),
    failures: passed ? [] : ["Production edge-case expectation failed."],
    details
  };
}

function hasConflict(analysis, type) {
  return analysis.conflicts.some((conflict) => conflict.type === type);
}

function hasImpossible(analysis, type) {
  return analysis.impossibleRequests.some((conflict) => conflict.type === type);
}

function countByDestination(places) {
  return places.reduce((counts, place) => {
    const destination = place.destination || place.city || place.name;
    counts.set(destination, (counts.get(destination) || 0) + 1);
    return counts;
  }, new Map());
}

function testPlaces() {
  return [
    makeTestPlace({ id: "closed_museum", name: "Closed Museum", indoorOutdoor: "indoor" }),
    makeTestPlace({ id: "closed_view", name: "Closed Viewpoint", category: "Viewpoint" })
  ];
}

function makeTestPlace(overrides = {}) {
  return {
    id: "test_place",
    name: "Test Place",
    city: "Test City",
    state: "Testland",
    region: "Testland",
    destination: "Test City",
    routeLocation: "Test City",
    country: "India",
    category: "Park",
    mood: ["calm"],
    ideal_for: ["family"],
    budget_level: 1,
    best_months: ["Jan"],
    visit_duration_hours: 2,
    visitDuration: 2,
    visitDurationHours: 2,
    crowd_level: 1,
    walking_required: 2,
    family_friendly: true,
    nightlife_score: 1,
    adventure_score: 1,
    cultural_score: 1,
    day_windows: ["morning", "afternoon"],
    openingTime: "09:00",
    closingTime: "18:00",
    fatigueScore: 2,
    travelType: "walking",
    idealTime: "morning",
    cost_estimate_inr: 500,
    estimatedCost: 500,
    clusterPriority: 75,
    indoorOutdoor: "outdoor",
    ...overrides
  };
}
