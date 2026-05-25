import { runRetrievalBenchmark } from "../src/index.js";

const report = await runRetrievalBenchmark();

console.log(JSON.stringify(report, null, 2));
