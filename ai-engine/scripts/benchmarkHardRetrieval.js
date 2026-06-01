import {
  analyzeBenchmarkLeakage,
  createWayfinderRetrievalPipeline,
  hardRetrievalEvaluationCases,
  hardRetrievalEvaluationPrompts,
  runRetrievalBenchmark
} from "../src/index.js";

const pipeline = await createWayfinderRetrievalPipeline();
const report = await runRetrievalBenchmark({
  pipeline,
  cases: hardRetrievalEvaluationCases,
  topK: 5
});
const leakage = analyzeBenchmarkLeakage({
  prompts: hardRetrievalEvaluationPrompts
});

console.log(JSON.stringify({
  benchmark: "hard-v2",
  caseCount: report.caseCount,
  failureCount: report.failureCount,
  passRate: Number(((report.caseCount - report.failureCount) / report.caseCount).toFixed(3)),
  averages: report.averages,
  leakage: {
    leakageFree: leakage.leakageFree,
    exactDestinationLeakCount: leakage.exactDestinationLeakCount,
    exactPlaceLeakCount: leakage.exactPlaceLeakCount,
    contradictionCount: leakage.contradictionCount,
    messySignalCount: leakage.messySignalCount,
    synonymCoverage: leakage.synonymCoverage
  },
  failures: report.cases
    .filter((benchmarkCase) => benchmarkCase.failure)
    .map((benchmarkCase) => ({
      id: benchmarkCase.id,
      hits: benchmarkCase.hits,
      minimumHits: benchmarkCase.minimumHits,
      topResults: benchmarkCase.topResults
    }))
}, null, 2));
