import { demoPlaces } from "../samplePlaces.js";
import { enrichedTravelPlaces } from "../datasets/enrichedPlaces.js";
import { buildTravelMetadataChunks, validateChunks } from "./chunking.js";
import { createEmbeddingService } from "./embeddingService.js";
import {
  defaultHybridRetrievalWeights,
  explainHybridMatch,
  scoreHybridRecord
} from "./hybridScoring.js";
import { LocalVectorStore } from "./localVectorStore.js";
import { mergeIntentIntoRetrievalInput } from "./queryUnderstanding.js";
import { QdrantStore } from "./qdrantStore.js";

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
  store = new LocalVectorStore(),
  hybridWeights = defaultHybridRetrievalWeights
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
    minScore = 0,
    candidatePoolSize = Math.max(topK * 10, 60)
  } = {}) {
    const understood = mergeIntentIntoRetrievalInput({ query, interests, constraints });
    const resolvedInterests = understood.interests;
    const resolvedConstraints = understood.constraints;
    const queryText = buildRetrievalQueryText({
      query,
      interests: resolvedInterests,
      constraints: resolvedConstraints
    });
    const embedding = await embeddingService.embedText(queryText, { inputType: "query" });
    const resolvedFilters = {
      ...(destination ? { destination } : {}),
      ...(resolvedConstraints.excludedDestinations?.length ? {
        excludedDestinations: resolvedConstraints.excludedDestinations
      } : {}),
      ...filters
    };

    const results = await store.search({
      embedding,
      filters: resolvedFilters,
      topK: candidatePoolSize,
      minScore
    });

    return results
      .map((record) => scoreHybridRecord({
        record,
        query,
        queryText,
        interests: resolvedInterests,
        constraints: resolvedConstraints,
        weights: hybridWeights
      }))
      .sort((a, b) => b.hybridScore - a.hybridScore)
      .slice(0, topK)
      .map((record) => ({
        ...record,
        retrievalScore: Number((record.hybridScore * 100).toFixed(2)),
        retrievalConfidence: confidenceFromScore(record.hybridScore),
        confidence: Number(record.hybridScore.toFixed(2)),
        queryIntent: understood.intent,
        retrievalReason: explainContextMatch(record)
      }));
  }

  return {
    store,
    embeddingService,
    indexPlaces,
    retrieveContext
  };
}

export async function createWayfinderRetrievalPipeline({
  places = enrichedTravelPlaces,
  destination = null,
  embeddingService = createEmbeddingService(),
  store = new LocalVectorStore(),
  hybridWeights = defaultHybridRetrievalWeights
} = {}) {
  return createLocalRetrievalPipeline({
    places,
    destination,
    embeddingService,
    store,
    hybridWeights
  });
}

export async function createQdrantRetrievalPipeline({
  places = enrichedTravelPlaces,
  destination = null,
  embeddingService = createEmbeddingService(),
  store = new QdrantStore({ vectorSize: embeddingService.config?.dimensions || 64 }),
  hybridWeights = defaultHybridRetrievalWeights
} = {}) {
  return createLocalRetrievalPipeline({
    places,
    destination,
    embeddingService,
    store,
    hybridWeights
  });
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
    constraints.budgetBand,
    constraints.crowdLevel,
    constraints.season,
    constraints.month,
    constraints.duration,
    constraints.vibe,
    constraints.climatePreference,
    constraints.activityIntent
  ].filter(Boolean).join(" ");
}

function explainContextMatch(record) {
  return explainHybridMatch(record);
}

function confidenceFromScore(score) {
  if (score >= 0.75) return "high";
  if (score >= 0.45) return "medium";
  return "low";
}
