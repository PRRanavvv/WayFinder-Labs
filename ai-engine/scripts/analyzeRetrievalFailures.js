import {
  createWayfinderRetrievalPipeline,
  retrievalEvaluationPrompts,
  retrievalEvaluationCases,
  runRetrievalBenchmark
} from "../src/index.js";

const promptById = new Map(retrievalEvaluationPrompts.map((prompt) => [prompt.id, prompt]));
const pipeline = await createWayfinderRetrievalPipeline();
const report = await runRetrievalBenchmark({
  pipeline,
  cases: retrievalEvaluationCases,
  topK: 5
});

const failures = report.cases.filter((benchmarkCase) => benchmarkCase.failure);
const groups = failures.reduce((summary, failure) => {
  const prompt = promptById.get(failure.id);
  const key = prompt?.intent || "unknown";

  summary[key] = summary[key] || [];
  summary[key].push({
    id: failure.id,
    query: prompt?.query,
    hits: failure.hits,
    minimumHits: failure.minimumHits,
    topResults: failure.topResults.map((result) => ({
      sourceId: result.sourceId,
      title: result.title,
      score: result.score,
      reasons: result.reasons,
      breakdown: result.breakdown
    }))
  });

  return summary;
}, {});

console.log(JSON.stringify({
  generatedAt: report.generatedAt,
  caseCount: report.caseCount,
  failureCount: report.failureCount,
  passRate: Number(((report.caseCount - report.failureCount) / report.caseCount).toFixed(3)),
  averages: report.averages,
  groups
}, null, 2));
