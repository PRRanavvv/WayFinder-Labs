import assert from "node:assert/strict";
import { retrievePlaces } from "../src/index.js";

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

console.log("Retrieval tests passed");
