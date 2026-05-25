import { createLocalRetrievalPipeline } from "./retrievalPipeline.js";

export const defaultRetrievalBenchmarkCases = [
  {
    id: "slow-food-recovery",
    query: "slow local food plan with recovery breaks",
    interests: ["food"],
    constraints: {
      pace: "slow",
      energyLevel: "low",
      timeOfDay: "afternoon"
    },
    relevantSourceIds: ["demo-food-1", "demo-cafe-1"]
  },
  {
    id: "heritage-photo-morning",
    query: "heritage architecture and photography in the old city",
    interests: ["heritage", "photography"],
    constraints: {
      energyLevel: "high",
      timeOfDay: "morning"
    },
    relevantSourceIds: ["demo-heritage-1"]
  },
  {
    id: "indoor-culture-weather",
    query: "indoor culture plan for uncertain weather",
    interests: ["culture"],
    constraints: {
      weather: "indoor",
      timeOfDay: "afternoon"
    },
    relevantSourceIds: ["demo-culture-1"]
  }
];

export async function runRetrievalBenchmark({
  pipeline,
  cases = defaultRetrievalBenchmarkCases,
  topK = 3
} = {}) {
  const resolvedPipeline = pipeline || await createLocalRetrievalPipeline();
  await resolvedPipeline.indexPlaces();

  const caseReports = [];

  for (const benchmarkCase of cases) {
    const startedAt = performance.now();
    const results = await resolvedPipeline.retrieveContext({
      query: benchmarkCase.query,
      interests: benchmarkCase.interests,
      constraints: benchmarkCase.constraints,
      topK
    });
    const latencyMs = Number((performance.now() - startedAt).toFixed(2));

    const retrievedSourceIds = new Set(results.map((result) => result.sourceId));
    const relevantSourceIds = new Set(benchmarkCase.relevantSourceIds);
    const hits = [...relevantSourceIds].filter((id) => retrievedSourceIds.has(id)).length;
    const precisionAtK = hits / Math.max(results.length, 1);
    const recallAtK = hits / Math.max(relevantSourceIds.size, 1);

    caseReports.push({
      id: benchmarkCase.id,
      latencyMs,
      precisionAtK: Number(precisionAtK.toFixed(3)),
      recallAtK: Number(recallAtK.toFixed(3)),
      topResults: results.map((result) => ({
        id: result.id,
        sourceId: result.sourceId,
        title: result.title,
        score: result.retrievalScore,
        confidence: result.retrievalConfidence
      })),
      failure: recallAtK < 1
    });
  }

  return summarizeBenchmark(caseReports);
}

function summarizeBenchmark(cases) {
  const totals = cases.reduce(
    (summary, report) => ({
      latencyMs: summary.latencyMs + report.latencyMs,
      precisionAtK: summary.precisionAtK + report.precisionAtK,
      recallAtK: summary.recallAtK + report.recallAtK,
      failures: summary.failures + (report.failure ? 1 : 0)
    }),
    { latencyMs: 0, precisionAtK: 0, recallAtK: 0, failures: 0 }
  );

  return {
    generatedAt: new Date().toISOString(),
    caseCount: cases.length,
    averages: {
      latencyMs: Number((totals.latencyMs / cases.length).toFixed(2)),
      precisionAtK: Number((totals.precisionAtK / cases.length).toFixed(3)),
      recallAtK: Number((totals.recallAtK / cases.length).toFixed(3))
    },
    failureCount: totals.failures,
    cases
  };
}
