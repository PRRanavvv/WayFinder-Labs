import { rankPlaces } from "./semanticRanker.js";
import { updatePreferenceProfile } from "./preferenceMemory.js";
import { buildItinerary } from "./itineraryLifecycle.js";
import { buildEmbeddingText, buildRetrievalIndex, retrievePlaces } from "./retrievalIndex.js";
import { buildTravelMetadataChunks, validateChunks } from "./retrieval/chunking.js";
import {
  bgeSmallEmbeddingConfig,
  createBgeSmallEmbeddingService,
  createEmbeddingService
} from "./retrieval/embeddingService.js";
import {
  defaultHybridRetrievalWeights,
  explainHybridMatch,
  scoreHybridRecord
} from "./retrieval/hybridScoring.js";
import { LocalVectorStore } from "./retrieval/localVectorStore.js";
import { PgvectorStore } from "./retrieval/pgvectorStore.js";
import { QdrantStore } from "./retrieval/qdrantStore.js";
import {
  buildRetrievalQueryText,
  createQdrantRetrievalPipeline,
  buildRetrievalRecords,
  createLocalRetrievalPipeline,
  createWayfinderRetrievalPipeline
} from "./retrieval/retrievalPipeline.js";
import {
  defaultRetrievalBenchmarkCases,
  runRetrievalBenchmark
} from "./retrieval/retrievalBenchmark.js";
import {
  enrichedTravelPlaces,
  requiredEnrichedPlaceFields,
  validateEnrichedPlace
} from "./datasets/enrichedPlaces.js";
import {
  retrievalEvaluationCases,
  retrievalEvaluationPrompts
} from "./retrieval/retrievalEvaluationPrompts.js";
import {
  hardRetrievalEvaluationCases,
  hardRetrievalEvaluationPrompts
} from "./retrieval/hardRetrievalBenchmark.js";
import { analyzeBenchmarkLeakage } from "./retrieval/benchmarkLeakage.js";
import { createDecisionLog } from "./intelligence/decisionLogger.js";
import {
  defaultDecisionWeights,
  rankCandidates
} from "./intelligence/rankingEngine.js";
import {
  calculateGroupSatisfaction,
  defaultRecommendationWeights,
  rankDestinationRecommendations,
  recommendationWeightProfiles,
  resolveRecommendationWeights
} from "./intelligence/recommendationEngine.js";
import {
  climateFitForIntent,
  destinationTravelKnowledge,
  temperatureForMonth
} from "./datasets/travelKnowledge.js";
import {
  extractTravelIntent,
  mergeIntentIntoRetrievalInput
} from "./retrieval/queryUnderstanding.js";
import {
  runDecisionQualityFlow,
  runIntelligenceFlow
} from "./intelligence/intelligencePipeline.js";
import {
  createScoringConfig,
  defaultScoringWeights,
  normalizeWeights,
  scoringDimensions,
  scoringProfiles
} from "./intelligence/scoringConfig.js";
import { scoreTravelCandidate } from "./intelligence/scoringEngine.js";
import {
  applyCandidateToDayState,
  createEmptyDayState,
  defaultConstraintConfig,
  evaluateCandidateConstraints,
  validateOptimizedItinerary
} from "./intelligence/constraintEngine.js";
import {
  buildDecisionTrace,
  explainGroupPreferenceFusion,
  explainOptimizedActivity,
  explainRecommendationSelection,
  explainStableReplan
} from "./intelligence/explanationEngine.js";
import {
  buildTripDNA,
  defaultGroupFusionWeights,
  fuseGroupPreferences,
  scorePlaceAgainstTripDNA
} from "./intelligence/groupPreferenceFusion.js";
import { optimizeItinerary } from "./intelligence/optimizationEngine.js";
import { evaluateDecisionQuality } from "./intelligence/evaluationMetrics.js";
import { calculateConfidence } from "./intelligence/confidenceScoring.js";
import {
  analyzeProductionInput,
  assessGroupPlanningEdges,
  detectBudgetConflict,
  detectImpossibleRequests,
  detectMissingTripInfo,
  detectPreferenceConflicts,
  resolveLocationMention,
  validateExplanationReasons
} from "./intelligence/productionGuards.js";
import {
  buildDeterministicItinerary,
  defaultItineraryPlannerConfig,
  planDeterministicItinerary,
  replanDeterministicItinerary,
  validateDeterministicItinerary
} from "./itinerary/deterministicPlanner.js";
import {
  buildStabilityReport,
  replanWithStability,
  stabilizeItinerary
} from "./itinerary/stabilityEngine.js";
import {
  applyRealtimeIntelligence,
  assessSeasonalFit,
  assessWeatherImpact,
  buildRealtimeContext,
  buildRealtimeInsights
} from "./itinerary/realtimeIntelligence.js";
import {
  destinationRegionProfiles,
  estimateTravelMinutes,
  optimizeRouteOrder
} from "./itinerary/travelGraph.js";
import {
  itineraryBenchmarkScenarios,
  runItineraryBenchmark
} from "./itinerary/itineraryBenchmark.js";
import {
  productionEdgeCaseScenarios,
  runProductionEdgeCaseBenchmark
} from "./evaluation/productionEdgeCases.js";
export {
  default as globalDestinationPlaceIntelligence,
  destinationProfiles as globalDestinationProfiles
} from "./datasets/globalDestinationDataset.js";
export {
  destinationProfiles as globalDestinationVisualProfiles,
  getDestinationImage,
  getDestinationProfile,
  getStaticMapImage
} from "./datasets/destinationVisualAssets.js";

export {
  buildEmbeddingText,
  buildDeterministicItinerary,
  buildItinerary,
  buildRetrievalQueryText,
  buildRetrievalIndex,
  buildRetrievalRecords,
  buildStabilityReport,
  buildTripDNA,
  buildTravelMetadataChunks,
  createEmbeddingService,
  createDecisionLog,
  createScoringConfig,
  createEmptyDayState,
  createLocalRetrievalPipeline,
  createQdrantRetrievalPipeline,
  createWayfinderRetrievalPipeline,
  defaultConstraintConfig,
  defaultDecisionWeights,
  defaultGroupFusionWeights,
  defaultHybridRetrievalWeights,
  defaultItineraryPlannerConfig,
  defaultRecommendationWeights,
  defaultScoringWeights,
  defaultRetrievalBenchmarkCases,
  destinationRegionProfiles,
  destinationTravelKnowledge,
  hardRetrievalEvaluationCases,
  hardRetrievalEvaluationPrompts,
  itineraryBenchmarkScenarios,
  applyCandidateToDayState,
  applyRealtimeIntelligence,
  assessSeasonalFit,
  assessWeatherImpact,
  analyzeBenchmarkLeakage,
  buildDecisionTrace,
  bgeSmallEmbeddingConfig,
  calculateConfidence,
  calculateGroupSatisfaction,
  buildRealtimeContext,
  buildRealtimeInsights,
  climateFitForIntent,
  createBgeSmallEmbeddingService,
  LocalVectorStore,
  normalizeWeights,
  optimizeRouteOrder,
  optimizeItinerary,
  planDeterministicItinerary,
  PgvectorStore,
  QdrantStore,
  rankDestinationRecommendations,
  rankPlaces,
  rankCandidates,
  recommendationWeightProfiles,
  replanDeterministicItinerary,
  replanWithStability,
  resolveRecommendationWeights,
  runDecisionQualityFlow,
  runIntelligenceFlow,
  runItineraryBenchmark,
  runRetrievalBenchmark,
  evaluateCandidateConstraints,
  evaluateDecisionQuality,
  estimateTravelMinutes,
  explainGroupPreferenceFusion,
  explainHybridMatch,
  explainOptimizedActivity,
  explainRecommendationSelection,
  explainStableReplan,
  extractTravelIntent,
  fuseGroupPreferences,
  analyzeProductionInput,
  assessGroupPlanningEdges,
  detectBudgetConflict,
  detectImpossibleRequests,
  detectMissingTripInfo,
  detectPreferenceConflicts,
  mergeIntentIntoRetrievalInput,
  productionEdgeCaseScenarios,
  resolveLocationMention,
  retrievePlaces,
  runProductionEdgeCaseBenchmark,
  scorePlaceAgainstTripDNA,
  scoreTravelCandidate,
  scoreHybridRecord,
  scoringDimensions,
  scoringProfiles,
  stabilizeItinerary,
  temperatureForMonth,
  enrichedTravelPlaces,
  requiredEnrichedPlaceFields,
  retrievalEvaluationCases,
  retrievalEvaluationPrompts,
  updatePreferenceProfile,
  validateEnrichedPlace,
  validateDeterministicItinerary,
  validateExplanationReasons,
  validateOptimizedItinerary,
  validateChunks
};
