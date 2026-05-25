export function createDecisionLog({
  stage,
  intent = {},
  weights = {},
  candidates = [],
  notes = []
} = {}) {
  return {
    id: `${stage || "decision"}-${Date.now()}`,
    stage,
    generatedAt: new Date().toISOString(),
    intentSummary: {
      interests: intent.interests || [],
      budgetPerDay: intent.budgetPerDay,
      pace: intent.constraints?.pace,
      energyLevel: intent.constraints?.energyLevel,
      timeOfDay: intent.constraints?.timeOfDay,
      weather: intent.constraints?.weather,
      groupType: intent.constraints?.groupType
    },
    weights,
    candidates: candidates.map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      score: candidate.decisionScore,
      scoreBreakdown: candidate.scoreBreakdown,
      strengths: candidate.decisionReasons?.strengths || [],
      risks: candidate.decisionReasons?.risks || []
    })),
    notes
  };
}
