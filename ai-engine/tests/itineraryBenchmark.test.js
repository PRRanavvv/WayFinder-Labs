import assert from "node:assert/strict";
import {
  itineraryBenchmarkScenarios,
  runItineraryBenchmark
} from "../src/index.js";

assert.equal(itineraryBenchmarkScenarios.length, 100);

const categories = new Set(itineraryBenchmarkScenarios.map((scenario) => scenario.category));
for (const category of [
  "parents",
  "honeymoon",
  "solo_backpacker",
  "luxury",
  "low_budget",
  "rainy_season",
  "short_trips",
  "long_trips",
  "opening_overrides",
  "disruptions"
]) {
  assert.equal(
    [...categories].includes(category),
    true,
    `Missing itinerary benchmark category: ${category}`
  );
}

const report = runItineraryBenchmark();

assert.equal(report.scenarioCount, 100);
assert.equal(report.failureCount, 0, JSON.stringify(report.failures.slice(0, 5), null, 2));
assert.equal(report.passRate, 1);
assert.ok(report.results.every((result) => result.scheduledPlaceCount >= 1));
assert.ok(report.results.every((result) => result.routeLocations.length >= 1));
assert.ok(report.results.some((result) => result.dynamicSignalsApplied));

console.log("Itinerary benchmark tests passed");
