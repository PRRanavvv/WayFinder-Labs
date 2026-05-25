import { demoPlaces } from "../samplePlaces.js";
import { createLocalRetrievalPipeline } from "../retrieval/retrievalPipeline.js";
import { evaluateDecisionQuality } from "./evaluationMetrics.js";
import { explainOptimizedActivity } from "./explanationEngine.js";
import { optimizeItinerary } from "./optimizationEngine.js";
import { rankCandidates } from "./rankingEngine.js";

export async function runIntelligenceFlow({
  tripIntent = {},
  preferenceProfile = {},
  places = demoPlaces,
  topK = 6
} = {}) {
  const retrievalPipeline = await createLocalRetrievalPipeline({ places });
  await retrievalPipeline.indexPlaces();

  const retrievedContext = await retrievalPipeline.retrieveContext({
    query: tripIntent.query,
    interests: tripIntent.interests,
    constraints: tripIntent.constraints,
    topK
  });

  const candidateIds = new Set(retrievedContext.map((record) => record.sourceId));
  const candidates = places.filter((place) => candidateIds.has(place.id));
  const ranking = rankCandidates({
    candidates,
    retrievedContext,
    tripIntent,
    preferenceProfile
  });

  return {
    stage: "retrieval-to-ranking",
    generatedAt: new Date().toISOString(),
    tripIntent,
    retrievedContext,
    rankedCandidates: ranking.rankedCandidates,
    decisionLogs: [ranking.decisionLog],
    notes: [
      "Priority 2 begins with deterministic retrieval-to-ranking decisions.",
      "Optimization and final generation should consume these ranked candidates instead of asking an LLM to decide."
    ]
  };
}

export async function runDecisionQualityFlow({
  tripIntent = {},
  preferenceProfile = {},
  places = demoPlaces,
  topK = 8,
  days = 1
} = {}) {
  const intelligenceFlow = await runIntelligenceFlow({
    tripIntent,
    preferenceProfile,
    places,
    topK
  });
  const optimization = optimizeItinerary({
    rankedCandidates: intelligenceFlow.rankedCandidates,
    tripIntent,
    days,
    activitiesPerDay: tripIntent.activitiesPerDay || 3
  });
  const optimizedItinerary = {
    ...optimization.optimizedItinerary,
    days: optimization.optimizedItinerary.days.map((day) => ({
      ...day,
      activities: day.activities.map((activity) => ({
        ...activity,
        recommendationExplanation: explainOptimizedActivity(activity)
      }))
    }))
  };
  const decisionTraces = [
    ...intelligenceFlow.decisionLogs,
    optimization.decisionTrace
  ];

  return {
    stage: "decision-quality",
    generatedAt: new Date().toISOString(),
    tripIntent,
    retrievedContext: intelligenceFlow.retrievedContext,
    rankedCandidates: intelligenceFlow.rankedCandidates,
    optimizedItinerary,
    feasibility: optimization.feasibility,
    decisionTraces,
    qualityMetrics: evaluateDecisionQuality({
      rankedCandidates: intelligenceFlow.rankedCandidates,
      optimizedItinerary,
      tripIntent,
      decisionTraces
    }),
    notes: [
      "Priority 3 adds deterministic optimization and decision quality checks.",
      "LLMs can narrate this output later but should not replace these constraints or optimization decisions."
    ]
  };
}
