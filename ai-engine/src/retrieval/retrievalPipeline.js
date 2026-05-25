import { demoPlaces } from "../samplePlaces.js";
import { buildTravelMetadataChunks, validateChunks } from "./chunking.js";
import { createEmbeddingService } from "./embeddingService.js";
import { LocalVectorStore } from "./localVectorStore.js";

export async function buildRetrievalRecords({
  places = demoPlaces,
  destination = "Jaipur",
  embeddingService = createEmbeddingService()
} = {}) {
  const chunks = buildTravelMetadataChunks({ places, destination });
  const validation = validateChunks(chunks);

  if (!validation.valid) {
    throw new Error(`Invalid retrieval chunks: ${validation.errors.join("; ")}`);
  }

  const embeddedChunks = await embeddingService.embedChunks(chunks);

  return embeddedChunks.map((chunk) => ({
    ...chunk,
    metadata: {
      ...chunk.metadata,
      entityType: chunk.entityType,
      chunkType: chunk.chunkType
    },
    indexedAt: new Date().toISOString()
  }));
}

export async function createLocalRetrievalPipeline({
  places = demoPlaces,
  destination = "Jaipur",
  embeddingService = createEmbeddingService(),
  store = new LocalVectorStore()
} = {}) {
  async function indexPlaces({ clear = true } = {}) {
    if (clear) await store.clear();
    const records = await buildRetrievalRecords({ places, destination, embeddingService });
    const result = await store.upsert(records);

    return {
      ...result,
      destination,
      records
    };
  }

  async function retrieveContext({
    query = "",
    interests = [],
    constraints = {},
    filters = {},
    topK = 5,
    minScore = 0
  } = {}) {
    const queryText = buildRetrievalQueryText({ query, interests, constraints });
    const embedding = await embeddingService.embedText(queryText);
    const resolvedFilters = {
      destination,
      tags: interests,
      ...filters
    };

    const results = await store.search({
      embedding,
      filters: resolvedFilters,
      topK,
      minScore
    });

    return results.map((record) => ({
      ...record,
      retrievalScore: Number((record.similarity * 100).toFixed(2)),
      retrievalConfidence: record.confidence,
      retrievalReason: explainContextMatch(record)
    }));
  }

  return {
    store,
    indexPlaces,
    retrieveContext
  };
}

export function buildRetrievalQueryText({ query, interests = [], constraints = {} } = {}) {
  return [
    query,
    ...interests,
    constraints.pace,
    constraints.energyLevel,
    constraints.timeOfDay,
    constraints.weather,
    constraints.groupType,
    constraints.budgetBand
  ].filter(Boolean).join(" ");
}

function explainContextMatch(record) {
  return `${record.title} retrieved from ${record.metadata.destination} with ${record.retrievalConfidence || record.confidence} confidence.`;
}
