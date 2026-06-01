import assert from "node:assert/strict";
import {
  buildRetrievalRecords,
  buildTravelMetadataChunks,
  createLocalRetrievalPipeline,
  createWayfinderRetrievalPipeline,
  enrichedTravelPlaces,
  retrievalEvaluationCases,
  retrievalEvaluationPrompts,
  retrievePlaces,
  runRetrievalBenchmark,
  validateEnrichedPlace,
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
assert.ok(contextResults[0].retrievalBreakdown.semanticScore >= 0);
assert.ok(contextResults[0].retrievalBreakdown.metadataScore >= 0);
assert.ok(contextResults[0].retrievalBreakdown.keywordScore >= 0);
assert.ok(Array.isArray(contextResults[0].retrievalReasons));

const benchmark = await runRetrievalBenchmark({ pipeline, topK: 3 });

assert.equal(benchmark.caseCount, 3);
assert.equal(benchmark.failureCount, 0);
assert.ok(benchmark.averages.latencyMs >= 0);

assert.equal(enrichedTravelPlaces.length, 33);
assert.equal(retrievalEvaluationPrompts.length, 100);
assert.ok(enrichedTravelPlaces.every((place) => validateEnrichedPlace(place).length === 0));

const chillBeachResults = retrievePlaces({
  places: enrichedTravelPlaces,
  query: "I want a chill beach with fewer crowds and good sunsets",
  interests: ["beach", "chill", "sunset", "fewer crowds"],
  constraints: {
    pace: "slow",
    crowdLevel: "low",
    timeOfDay: "sunset"
  },
  topK: 3
});

assert.equal(chillBeachResults[0].id, "goa_002");
assert.deepEqual(
  new Set(chillBeachResults.map((place) => place.id)),
  new Set(["goa_002", "goa_003", "kerala_001"])
);

const wayfinderPipeline = await createWayfinderRetrievalPipeline();
await wayfinderPipeline.indexPlaces();

const chillBeachContext = await wayfinderPipeline.retrieveContext({
  query: "I want a chill beach with fewer crowds and good sunsets",
  interests: ["beach", "chill", "sunset", "fewer crowds"],
  constraints: {
    pace: "slow",
    crowdLevel: "low",
    timeOfDay: "sunset"
  },
  topK: 6
});

const retrievedBeachIds = new Set(chillBeachContext.map((result) => result.sourceId));
assert.ok(retrievedBeachIds.has("goa_002"));
assert.ok(retrievedBeachIds.has("goa_003"));
assert.ok(retrievedBeachIds.has("kerala_001"));
assert.ok(chillBeachContext[0].retrievalReasons.includes("beach"));
assert.ok(chillBeachContext[0].retrievalReasons.includes("low crowd"));

const wayfinderBenchmark = await runRetrievalBenchmark({
  pipeline: wayfinderPipeline,
  cases: retrievalEvaluationCases,
  topK: 5
});

assert.equal(wayfinderBenchmark.caseCount, 100);
assert.ok(wayfinderBenchmark.failureCount <= 10);

console.log("Retrieval tests passed");
