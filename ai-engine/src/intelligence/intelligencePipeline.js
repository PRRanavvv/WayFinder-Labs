import { demoPlaces } from "../samplePlaces.js";
import { createLocalRetrievalPipeline } from "../retrieval/retrievalPipeline.js";
import { rankCandidates } from "./rankingEngine.js";

export async function runIntelligenceFlow({
  tripIntent = {},
  preferenceProfile = {},
  places = demoPlaces,
  topK = 6
} = {}) {
  const retrievalPipeline = await createLocalRetrievalPipeline({ places });
  await retrievalPipeline.indexPlaces();

  const retrievedContext = await retrievalPipeline.retrieveContext({
    query: tripIntent.query,
    interests: tripIntent.interests,
    constraints: tripIntent.constraints,
    topK
  });

  const candidateIds = new Set(retrievedContext.map((record) => record.sourceId));
  const candidates = places.filter((place) => candidateIds.has(place.id));
  const ranking = rankCandidates({
    candidates,
    retrievedContext,
    tripIntent,
    preferenceProfile
  });

  return {
    stage: "retrieval-to-ranking",
    generatedAt: new Date().toISOString(),
    tripIntent,
    retrievedContext,
    rankedCandidates: ranking.rankedCandidates,
    decisionLogs: [ranking.decisionLog],
    notes: [
      "Priority 2 begins with deterministic retrieval-to-ranking decisions.",
      "Optimization and final generation should consume these ranked candidates instead of asking an LLM to decide."
    ]
  };
}
