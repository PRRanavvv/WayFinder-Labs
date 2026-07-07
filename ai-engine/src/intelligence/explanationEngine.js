export function explainOptimizedActivity(activity) {
  const topContributions = Object.entries(activity.scoreContributions || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([dimension]) => humanizeDimension(dimension));
  const constraintStrengths = (activity.constraintReport?.checks || [])
    .filter((check) => check.status === "pass")
    .slice(0, 3)
    .map((check) => check.message);
  const warnings = (activity.constraintReport?.warnings || [])
    .slice(0, 2)
    .map((warning) => warning.message);

  return {
    selectedBecause: [
      ...topContributions.map((dimension) => `Strong ${dimension}`),
      ...constraintStrengths
    ].slice(0, 5),
    watchouts: warnings,
    summary: `${activity.name} fits this slot through ${topContributions.join(", ")}.`
  };
}

export function buildDecisionTrace({
  stage,
  input = {},
  output = {},
  decisions = []
} = {}) {
  return {
    stage,
    generatedAt: new Date().toISOString(),
    input,
    output,
    decisions
  };
}

export function explainGroupPreferenceFusion(fusion = {}) {
  const tripDNA = fusion.tripDNA || {};
  const consensus = tripDNA.consensus?.support || [];
  const conflicts = fusion.conflicts || [];
  const fairnessTargets = fusion.fairness?.representationTargets || [];

  return {
    kind: "group-preference-fusion",
    headline: `Group vibe: ${tripDNA.groupVibe || "balanced shared trip"}`,
    selectedBecause: consensus.slice(0, 4).map((term) => (
      `${term.term} is supported by ${term.supporterCount} traveler${term.supporterCount === 1 ? "" : "s"}`
    )),
    whoThisServes: buildWhoThisServes(consensus),
    tradeoffs: conflicts.slice(0, 4).map((conflict) => conflict.tradeoff || conflict.message),
    watchouts: [
      ...conflicts.slice(0, 2).map((conflict) => conflict.message),
      ...fairnessTargets.slice(0, 2).map((target) => (
        `${target.member}'s ${target.preference} preference needs a visible win.`
      ))
    ].slice(0, 4),
    confidenceNarrative: explainConfidence(fusion)
  };
}

export function explainStableReplan(stableItinerary = {}) {
  const report = stableItinerary.stabilityReport || {};
  const preserved = report.preservedActivityCount || 0;
  const previous = report.previousActivityCount || 0;
  const changed = (report.replacedActivityCount || 0) + (report.newActivityCount || 0);

  return {
    kind: "stable-replan",
    headline: previous
      ? `${preserved}/${previous} accepted places were preserved`
      : "Fresh itinerary generated",
    selectedBecause: [
      report.rule,
      report.preservedDays?.length ? `Preserved days: ${report.preservedDays.join(", ")}` : null,
      report.regeneratedDays?.length ? `Regenerated days: ${report.regeneratedDays.join(", ")}` : null
    ].filter(Boolean),
    whoThisServes: [
      "Travelers who already agreed on parts of the trip",
      "Frontend state that needs stable IDs and minimal churn"
    ],
    tradeoffs: changed
      ? [`${changed} activity-level changes were allowed because they were directly affected or newly feasible.`]
      : ["No activity-level changes were needed."],
    watchouts: report.affectedDays?.length
      ? [`Affected days: ${report.affectedDays.join(", ")}`]
      : [],
    confidenceNarrative: explainConfidence(stableItinerary)
  };
}

export function explainRecommendationSelection(recommendation = {}, { tripDNA, memberScores } = {}) {
  const groupScores = memberScores || recommendation.groupSatisfaction?.memberScores || [];
  const topMembers = groupScores
    .filter((member) => Number(member.score) >= 70)
    .slice(0, 3)
    .map((member) => member.memberId || member.name);
  const reasons = recommendation.recommendationReasons || recommendation.reasons || [];
  const breakdown = recommendation.recommendationBreakdown || {};
  const topBreakdown = Object.entries(breakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([dimension]) => humanizeDimension(dimension));

  return {
    kind: "recommendation-selection",
    headline: `${recommendation.name || "This place"} fits ${tripDNA?.groupVibe || "the current trip DNA"}`,
    selectedBecause: [
      ...reasons,
      ...topBreakdown.map((dimension) => `Strong ${dimension}`)
    ].slice(0, 5),
    whoThisServes: topMembers.length
      ? topMembers.map((member) => `Good fit for ${member}`)
      : ["Good shared fit for the group"],
    tradeoffs: buildRecommendationTradeoffs(recommendation),
    watchouts: buildRecommendationWatchouts(recommendation),
    confidenceNarrative: explainConfidence(recommendation)
  };
}

function humanizeDimension(dimension) {
  return dimension.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`);
}

function buildWhoThisServes(consensus) {
  const memberNames = [...new Set(consensus.flatMap((term) => term.members || []))].slice(0, 4);
  return memberNames.length
    ? memberNames.map((member) => `Reflects ${member}'s stated preferences`)
    : ["Reflects the strongest shared group signals"];
}

function explainConfidence(output = {}) {
  const level = output.confidenceLevel || "medium";
  const reasons = output.confidenceReasons || [];
  return reasons.length
    ? `${level} confidence because ${reasons.slice(0, 2).join("; ")}.`
    : `${level} confidence from deterministic scoring signals.`;
}

function buildRecommendationTradeoffs(recommendation) {
  const tradeoffs = [];
  if (recommendation.groupSatisfaction?.conflictLevel === "high") {
    tradeoffs.push("High group conflict: this may need an alternate for at least one traveler.");
  }
  if (recommendation.recommendationBreakdown?.budgetFit < 65) {
    tradeoffs.push("Budget fit is weaker than the rest of the match.");
  }
  if (recommendation.recommendationBreakdown?.seasonFit < 65) {
    tradeoffs.push("Seasonal fit is weaker, so timing should be checked before committing.");
  }
  return tradeoffs.length ? tradeoffs : ["No major tradeoff detected from available scoring signals."];
}

function buildRecommendationWatchouts(recommendation) {
  const watchouts = [];
  if (recommendation.confidenceLevel === "low") watchouts.push("Low confidence: ask for more trip context.");
  if (recommendation.place_id === null || recommendation.verified === false) {
    watchouts.push("Place is not yet verified by the geocoding boundary.");
  }
  if (recommendation.groupSatisfaction?.fairnessPenalty >= 8) {
    watchouts.push("Fairness penalty is high; minority preferences may be under-served.");
  }
  return watchouts;
}
