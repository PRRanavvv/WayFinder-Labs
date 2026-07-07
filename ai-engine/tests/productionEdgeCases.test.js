import assert from "node:assert/strict";
import {
  productionEdgeCaseScenarios,
  runProductionEdgeCaseBenchmark
} from "../src/index.js";

assert.ok(productionEdgeCaseScenarios.length >= 24);

const categories = new Set(productionEdgeCaseScenarios.map((scenario) => scenario.category));
for (const category of [
  "user_input",
  "group_planning",
  "itinerary",
  "retrieval",
  "season_weather",
  "recommendation",
  "realtime",
  "explainability",
  "confidence"
]) {
  assert.equal(categories.has(category), true, `Missing production edge-case category: ${category}`);
}

const report = await runProductionEdgeCaseBenchmark();

assert.equal(report.failureCount, 0, JSON.stringify(report.failures.slice(0, 5), null, 2));
assert.equal(report.passRate, 1);
assert.ok(report.results.every((result) => Array.isArray(result.failures)));
assert.ok(report.results.some((result) => result.id === "confidence_weak_context"));

console.log("Production edge-case benchmark tests passed");
