import assert from "node:assert/strict";
import {
  buildRetrievalRecords,
  buildTravelMetadataChunks,
  createLocalRetrievalPipeline,
  retrievePlaces,
  runRetrievalBenchmark,
  validateChunks
} from "../src/index.js";

const slowRecoveryResults = retrievePlaces({
  query: "slow local food plan with recovery breaks",
  interests: ["food"],
  constraints: {
    pace: "slow",
    energyLevel: "low",
    timeOfDay: "afternoon"
  },
  topK: 3
});

assert.equal(slowRecoveryResults.length, 3);
assert.equal(slowRecoveryResults[0].role, "recovery");
assert.ok(slowRecoveryResults[0].retrievalScore >= slowRecoveryResults[1].retrievalScore);

const heritageResults = retrievePlaces({
  query: "heritage architecture and photography in the old city",
  interests: ["heritage", "photography"],
  constraints: {
    energyLevel: "high",
    timeOfDay: "morning"
  },
  topK: 2
});

assert.equal(heritageResults.length, 2);
assert.equal(heritageResults[0].id, "demo-heritage-1");
assert.ok(heritageResults[0].retrievalReason.includes("heritage"));

const chunks = buildTravelMetadataChunks();
const chunkValidation = validateChunks(chunks);

assert.equal(chunkValidation.valid, true);
assert.equal(chunks.length, 12);

const records = await buildRetrievalRecords();

assert.equal(records.length, chunks.length);
assert.equal(records[0].embedding.length, 64);
assert.ok(records.every((record) => record.metadata.sourceVisibility === "public-demo"));

const pipeline = await createLocalRetrievalPipeline();
await pipeline.indexPlaces();

const contextResults = await pipeline.retrieveContext({
  query: "heritage architecture photography",
  interests: ["heritage", "photography"],
  constraints: {
    timeOfDay: "morning"
  },
  topK: 3
});

assert.ok(contextResults.length > 0);
assert.equal(contextResults[0].sourceId, "demo-heritage-1");
assert.ok(contextResults[0].retrievalScore > 0);

const benchmark = await runRetrievalBenchmark({ pipeline, topK: 3 });

assert.equal(benchmark.caseCount, 3);
assert.equal(benchmark.failureCount, 0);
assert.ok(benchmark.averages.latencyMs >= 0);

console.log("Retrieval tests passed");
