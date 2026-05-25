import { demoPlaces } from "../samplePlaces.js";
import { createDecisionLog } from "./decisionLogger.js";
import { createScoringConfig, defaultScoringWeights } from "./scoringConfig.js";
import { scoreTravelCandidate, summarizeRetrievedContext } from "./scoringEngine.js";

export const defaultDecisionWeights = defaultScoringWeights;

export function rankCandidates({
  candidates = demoPlaces,
  retrievedContext = [],
  tripIntent = {},
  preferenceProfile = {},
  selectedContext = {},
  weights = defaultDecisionWeights,
  scoringProfile = "balanced"
} = {}) {
  const scoringConfig = createScoringConfig({
    profile: scoringProfile,
    weights
  });
  const retrievalBySourceId = summarizeRetrievedContext(retrievedContext);

  const rankedCandidates = candidates
    .map((candidate) => scoreTravelCandidate({
      candidate,
      retrievalSignal: retrievalBySourceId.get(candidate.id),
      tripIntent,
      preferenceProfile,
      selectedContext,
      scoringConfig
    }))
    .sort((a, b) => b.decisionScore - a.decisionScore);

  return {
    rankedCandidates,
    scoringConfig,
    decisionLog: createDecisionLog({
      stage: "ranking",
      intent: tripIntent,
      weights: scoringConfig.weights,
      candidates: rankedCandidates,
      notes: [
        "Ranking is deterministic and uses public-safe scoring heuristics.",
        "The LLM should explain these decisions later, not replace this scoring layer."
      ]
    })
  };
}
