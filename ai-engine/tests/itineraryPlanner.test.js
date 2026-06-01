import assert from "node:assert/strict";
import {
  enrichedTravelPlaces,
  planDeterministicItinerary,
  replanDeterministicItinerary,
  requiredEnrichedPlaceFields,
  validateDeterministicItinerary
} from "../src/index.js";

const keralaPlan = planDeterministicItinerary({
  destination: "Kerala",
  days: 4,
  budget: 50000,
  group: {
    adults: 2,
    parents: true
  }
});

assert.equal(keralaPlan.stage, "itinerary-intelligence-v1");
assert.equal(keralaPlan.days.length, 4);
assert.equal(keralaPlan.day1, keralaPlan.days[0].activities);
assert.equal(keralaPlan.day4, keralaPlan.days[3].activities);
assert.equal(keralaPlan.feasibility.valid, true);
assert.equal(keralaPlan.feasibility.routeValid, true);
assert.deepEqual(keralaPlan.route.routeLocations, ["Kochi", "Munnar", "Alleppey", "Varkala"]);
assert.ok(keralaPlan.route.transfers.every((transfer) => transfer.estimatedMinutes > 0));
assert.ok(keralaPlan.totals.totalCost <= 50000);

const scheduledNames = keralaPlan.days
  .flatMap((day) => day.activities)
  .filter((activity) => activity.kind === "place")
  .map((activity) => activity.name);

assert.ok(scheduledNames.includes("Fort Kochi"));
assert.ok(scheduledNames.includes("Munnar Tea Gardens"));
assert.ok(scheduledNames.includes("Alleppey Backwaters"));
assert.ok(scheduledNames.includes("Varkala Cliff"));
assert.equal(scheduledNames.includes("Edakkal Caves"), false);

for (const day of keralaPlan.days) {
  assert.ok(day.totalFatigue <= keralaPlan.constraints.maxDailyFatigue);
  assert.ok(day.totalWalkingHours <= keralaPlan.constraints.maxDailyWalkingHours);
  assert.ok(day.totalCost <= keralaPlan.constraints.dailyBudgetCap);

  for (const activity of day.activities.filter((item) => item.kind === "place")) {
    assert.ok(toMinutes(activity.startTime) >= toMinutes(activity.openingTime));
    assert.ok(toMinutes(activity.endTime) <= toMinutes(activity.closingTime));
    assert.ok(toMinutes(activity.endTime) <= toMinutes(day.dayEndTime));
  }
}

for (const place of enrichedTravelPlaces) {
  const missingFields = requiredEnrichedPlaceFields.filter((field) => place[field] === undefined);
  assert.deepEqual(missingFields, [], `${place.name} is missing itinerary fields`);
}

const closedLocationPlan = planDeterministicItinerary({
  destination: "Testland",
  days: 1,
  budget: 10000,
  group: { adults: 2 },
  places: [
    makeTestPlace({
      id: "closed_stop",
      name: "Closed Stop",
      visitDuration: 2,
      openingTime: "09:00",
      closingTime: "10:00",
      clusterPriority: 100
    }),
    makeTestPlace({
      id: "open_stop",
      name: "Open Stop",
      visitDuration: 1,
      openingTime: "09:00",
      closingTime: "18:00",
      clusterPriority: 80
    })
  ]
});

const closedPlanNames = closedLocationPlan.day1
  .filter((activity) => activity.kind === "place")
  .map((activity) => activity.name);
assert.deepEqual(closedPlanNames, ["Open Stop"]);
assert.ok(closedLocationPlan.skippedCandidates.some((candidate) => (
  candidate.name === "Closed Stop" && candidate.reason.includes("closing time")
)));
assert.equal(validateDeterministicItinerary(closedLocationPlan).valid, true);

const walkingHeavyPlan = planDeterministicItinerary({
  destination: "Testland",
  days: 1,
  budget: 10000,
  group: {
    adults: 2,
    parents: true
  },
  places: [
    makeTestPlace({ id: "walk_1", name: "Long Walk One", fatigueScore: 5, walking_required: 5 }),
    makeTestPlace({ id: "walk_2", name: "Long Walk Two", fatigueScore: 5, walking_required: 5 }),
    makeTestPlace({ id: "walk_3", name: "Long Walk Three", fatigueScore: 5, walking_required: 5 })
  ]
});

const walkingPlaces = walkingHeavyPlan.day1.filter((activity) => activity.kind === "place");
assert.equal(walkingPlaces.length, 1);
assert.ok(walkingHeavyPlan.days[0].totalFatigue <= walkingHeavyPlan.constraints.maxDailyFatigue);
assert.ok(walkingHeavyPlan.days[0].totalWalkingHours <= walkingHeavyPlan.constraints.maxDailyWalkingHours);
assert.ok(walkingHeavyPlan.skippedCandidates.some((candidate) => candidate.reason.includes("max fatigue")));

const replanned = replanDeterministicItinerary({
  itineraryInput: {
    destination: "Kerala",
    days: 4,
    budget: 50000,
    group: {
      adults: 2,
      parents: true
    }
  },
  changes: {
    skipDays: [2],
    weather: { condition: "rain" }
  }
});

assert.equal(replanned.days.length, 3);
assert.equal(replanned.constraints.weatherMode, "rain");
assert.equal(replanned.feasibility.valid, true);

console.log("Itinerary planner tests passed");

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
    visit_duration_hours: overrides.visitDuration ?? 2,
    visitDuration: overrides.visitDuration ?? 2,
    visitDurationHours: overrides.visitDuration ?? 2,
    crowd_level: 1,
    walking_required: overrides.walking_required ?? 3,
    family_friendly: true,
    nightlife_score: 1,
    adventure_score: 1,
    cultural_score: 1,
    day_windows: ["morning", "afternoon"],
    openingTime: "09:00",
    closingTime: "18:00",
    fatigueScore: overrides.fatigueScore ?? 3,
    travelType: "walking",
    idealTime: "morning",
    cost_estimate_inr: 500,
    estimatedCost: 500,
    clusterPriority: 75,
    indoorOutdoor: "outdoor",
    ...overrides
  };
}

function toMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}
