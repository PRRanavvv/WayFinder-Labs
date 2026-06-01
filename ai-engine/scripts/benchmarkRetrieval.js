import {
  createWayfinderRetrievalPipeline,
  retrievalEvaluationCases,
  runRetrievalBenchmark
} from "../src/index.js";

const pipeline = await createWayfinderRetrievalPipeline();
const report = await runRetrievalBenchmark({
  pipeline,
  cases: retrievalEvaluationCases,
  topK: 5
});

console.log(JSON.stringify(report, null, 2));
