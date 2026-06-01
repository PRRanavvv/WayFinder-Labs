import {
  createQdrantRetrievalPipeline,
  enrichedTravelPlaces
} from "../src/index.js";

const pipeline = await createQdrantRetrievalPipeline({
  places: enrichedTravelPlaces,
  destination: null
});

const result = await pipeline.indexPlaces({ clear: process.argv.includes("--clear") });

console.log(JSON.stringify({
  status: "ok",
  store: "qdrant",
  dataset: "enrichedTravelPlaces",
  collectionName: result.collectionName,
  upserted: result.upserted,
  total: result.total
}, null, 2));
