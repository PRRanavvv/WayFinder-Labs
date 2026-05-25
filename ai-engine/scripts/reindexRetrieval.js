import { createLocalRetrievalPipeline } from "../src/index.js";

const pipeline = await createLocalRetrievalPipeline();
const result = await pipeline.indexPlaces({ clear: true });

console.log(JSON.stringify({
  status: "ok",
  destination: result.destination,
  upserted: result.upserted,
  total: result.total
}, null, 2));
