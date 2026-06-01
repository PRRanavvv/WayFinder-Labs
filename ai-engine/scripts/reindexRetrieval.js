import { createWayfinderRetrievalPipeline } from "../src/index.js";

const pipeline = await createWayfinderRetrievalPipeline();
const result = await pipeline.indexPlaces({ clear: true });

console.log(JSON.stringify({
  status: "ok",
  dataset: "enrichedTravelPlaces",
  destination: result.destination,
  upserted: result.upserted,
  total: result.total
}, null, 2));
