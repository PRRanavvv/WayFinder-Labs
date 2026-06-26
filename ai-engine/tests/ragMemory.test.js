import assert from "node:assert/strict";
import {
  buildRagPlanningContext,
  buildRagPromptContext,
  createMemoryStore,
  createRagMemory,
  extractMemoryCandidates,
  retrieveRelevantMemories
} from "../src/memory/ragMemory.js";

const extracted = extractMemoryCandidates({
  userId: "user_demo",
  groupId: "group_demo",
  messages: [
    {
      role: "user",
      content: "I prefer cheap quiet cafes near metro stations. Last weekend's restaurant was too crowded and expensive."
    },
    {
      role: "user",
      content: "For future trips remember that we like slow food walks."
    }
  ],
  metadata: {
    destination: "Bengaluru"
  }
});

assert.ok(extracted.length >= 2);
assert.ok(extracted.some((candidate) => candidate.type === "preference"));
assert.ok(extracted.some((candidate) => candidate.type === "feedback"));

const preferenceMemory = await createRagMemory({
  userId: "user_demo",
  type: "preference",
  text: "User prefers cheap quiet cafes near metro stations.",
  metadata: {
    destination: "Bengaluru",
    interests: ["food", "cafes"]
  }
});
const feedbackMemory = await createRagMemory({
  userId: "user_demo",
  type: "feedback",
  text: "User said the last restaurant was too crowded and expensive.",
  metadata: {
    destination: "Bengaluru"
  }
});
const unrelatedMemory = await createRagMemory({
  userId: "user_demo",
  type: "place",
  text: "User saved a luxury resort for a future beach trip.",
  metadata: {
    destination: "Goa"
  }
});

assert.equal(preferenceMemory.embedding.length, 64);
assert.equal(preferenceMemory.metadata.sourceVisibility, "public-demo");

const retrieval = await retrieveRelevantMemories({
  query: "plan cheap quiet cafes near metro stations",
  memories: [preferenceMemory, feedbackMemory, unrelatedMemory],
  filters: {
    userId: "user_demo",
    minConfidence: 0.2
  },
  limit: 2
});

assert.equal(retrieval.results.length, 2);
assert.equal(retrieval.results[0].memory.type, "preference");
assert.ok(retrieval.results[0].score >= retrieval.results[1].score);

const promptContext = buildRagPromptContext(retrieval);

assert.ok(promptContext.includes("cheap quiet cafes"));
assert.ok(promptContext.includes("confidence"));

const store = await createMemoryStore({
  memories: [preferenceMemory, feedbackMemory, unrelatedMemory]
});
const storeResults = await store.search({
  query: "avoid crowded expensive restaurants",
  filters: {
    types: ["feedback"]
  }
});

assert.equal(storeResults.results.length, 1);
assert.equal(storeResults.results[0].memory.type, "feedback");

const planningContext = await buildRagPlanningContext({
  query: "cheap cafe plan near metro",
  memories: store.list(),
  limit: 2
});

assert.equal(planningContext.enabled, true);
assert.ok(planningContext.promptContext.includes("cheap quiet cafes"));
assert.equal(planningContext.memories.length, 2);

console.log("RAG memory tests passed");
