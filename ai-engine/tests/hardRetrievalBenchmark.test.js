import assert from "node:assert/strict";
import {
  analyzeBenchmarkLeakage,
  createWayfinderRetrievalPipeline,
  extractTravelIntent,
  hardRetrievalEvaluationCases,
  hardRetrievalEvaluationPrompts,
  runRetrievalBenchmark
} from "../src/index.js";

assert.equal(hardRetrievalEvaluationPrompts.length, 220);

const leakage = analyzeBenchmarkLeakage({
  prompts: hardRetrievalEvaluationPrompts
});

assert.equal(leakage.leakageFree, true);
assert.equal(leakage.exactDestinationLeakCount, 0);
assert.equal(leakage.exactPlaceLeakCount, 0);
assert.ok(leakage.messySignalCount >= 100);
assert.ok(leakage.contradictionCount >= 4);

const excludedIntent = extractTravelIntent({
  query: "we've already been to Goa twice"
});

assert.deepEqual(excludedIntent.excludedDestinations, ["Goa"]);

const pipeline = await createWayfinderRetrievalPipeline();
await pipeline.indexPlaces();

const exclusionResults = await pipeline.retrieveContext({
  query: "we've already been to Goa twice",
  topK: 5
});

assert.ok(exclusionResults.length > 0);
assert.ok(exclusionResults.every((result) => result.metadata.destination !== "Goa"));

const sampleCases = hardRetrievalEvaluationCases.slice(0, 20);
const sampleReport = await runRetrievalBenchmark({
  pipeline,
  cases: sampleCases,
  topK: 5
});

assert.equal(sampleReport.failureCount, 0);

console.log("Hard retrieval benchmark tests passed");
