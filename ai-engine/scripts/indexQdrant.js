import {
  createBgeSmallEmbeddingService,
  createQdrantRetrievalPipeline,
  enrichedTravelPlaces
} from "../src/index.js";

const embeddingService = process.env.WAYFINDER_EMBEDDING_PROVIDER
  ? undefined
  : createBgeSmallEmbeddingService();

const pipeline = await createQdrantRetrievalPipeline({
  places: enrichedTravelPlaces,
  destination: null,
  ...(embeddingService ? { embeddingService } : {})
});

const result = await pipeline.indexPlaces({ clear: process.argv.includes("--clear") });

console.log(JSON.stringify({
  status: "ok",
  store: "qdrant",
  dataset: "enrichedTravelPlaces",
  embeddingModel: pipeline.embeddingService?.config?.model,
  collectionName: result.collectionName,
  upserted: result.upserted,
  total: result.total
}, null, 2));
