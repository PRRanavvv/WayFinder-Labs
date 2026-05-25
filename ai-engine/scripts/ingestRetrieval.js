import fs from "node:fs/promises";
import path from "node:path";
import { buildRetrievalRecords } from "../src/index.js";

const outputPath = path.resolve(".cache/retrieval-index.json");
const records = await buildRetrievalRecords();

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(
  outputPath,
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    recordCount: records.length,
    records
  }, null, 2)
);

console.log(JSON.stringify({
  status: "ok",
  outputPath
  recordCount: records.length
}, null, 2));
