import {
  applyCandidateToDayState,
  createEmptyDayState,
  evaluateCandidateConstraints,
  validateOptimizedItinerary
} from "./constraintEngine.js";
import { buildDecisionTrace } from "./explanationEngine.js";

const defaultSlots = [
  { time: "09:30", window: "morning", kind: "anchor" },
  { time: "13:00", window: "lunch", kind: "meal" },
  { time: "16:30", window: "afternoon", kind: "activity" }
];

export function optimizeItinerary({
  rankedCandidates = [],
  tripIntent = {},
  days = 1,
  activitiesPerDay = tripIntent.activitiesPerDay || 3
} = {}) {
  const candidatePool = [...rankedCandidates];
  const usedIds = new Set();
  const optimizationDecisions = [];
  const itineraryDays = [];

  for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
    let dayState = createEmptyDayState();
    const activities = [];
    const slots = defaultSlots.slice(0, activitiesPerDay);

    for (const slot of slots) {
      const selection = selectBestCandidate({
        candidatePool,
        usedIds,
        dayState,
        tripIntent,
        slot
      });

      if (!selection.selected) {
        optimizationDecisions.push({
          day: dayIndex + 1,
          slot,
          selected: null,
          reason: "No feasible candidate found for this slot.",
          rejected: selection.rejected
        });
        continue;
      }

      const transitionMinutes = estimateTransitionMinutes(dayState.lastCluster, selection.selected.cluster);
      const activity = {
        ...selection.selected,
        time: slot.time,
        slotWindow: slot.window,
        transitionMinutes,
        constraintReport: selection.constraintReport,
        optimizationScore: selection.optimizationScore
      };

      activities.push(activity);
      usedIds.add(activity.id);
      dayState = applyCandidateToDayState(dayState, activity);

      optimizationDecisions.push({
        day: dayIndex + 1,
        slot,
        selected: {
          id: activity.id,
          name: activity.name,
          score: activity.optimizationScore
        },
        reason: "Selected highest feasible optimization score for this slot.",
        rejected: selection.rejected
      });
    }

    itineraryDays.push({
      day: dayIndex + 1,
      title: `Optimized Day ${dayIndex + 1}`,
      totalCost: dayState.totalCost,
      totalFatigue: dayState.totalFatigue,
      activities
    });
  }

  const optimizedItinerary = {
    destination: tripIntent.destination || "Jaipur",
    generatedAt: new Date().toISOString(),
    days: itineraryDays
  };
  const feasibility = validateOptimizedItinerary({ itinerary: optimizedItinerary, tripIntent });

  return {
    optimizedItinerary,
    feasibility,
    decisionTrace: buildDecisionTrace({
      stage: "optimization",
      input: {
        candidateCount: rankedCandidates.length,
        days,
        activitiesPerDay,
        budgetPerDay: tripIntent.budgetPerDay
      },
      output: {
        scheduledActivities: itineraryDays.reduce((sum, day) => sum + day.activities.length, 0),
        feasible: feasibility.valid
      },
      decisions: optimizationDecisions
    })
  };
}

function selectBestCandidate({ candidatePool, usedIds, dayState, tripIntent, slot }) {
  const evaluated = candidatePool
    .filter((candidate) => !usedIds.has(candidate.id))
    .map((candidate) => {
      const constraintReport = evaluateCandidateConstraints({
        candidate,
        dayState,
        tripIntent,
        slot
      });
      const transitionPenalty = estimateTransitionMinutes(dayState.lastCluster, candidate.cluster) * 0.18;
      const slotBonus = slot.kind === "meal" && candidate.type === "food" ? 12 : 0;
      const optimizationScore = Number((
        candidate.decisionScore +
        constraintReport.constraintScore * 0.28 +
        slotBonus -
        transitionPenalty
      ).toFixed(2));

      return {
        candidate,
        constraintReport,
        optimizationScore
      };
    })
    .sort((a, b) => b.optimizationScore - a.optimizationScore);

  const selected = evaluated.find((item) => item.constraintReport.feasible);
  const rejected = evaluated
    .filter((item) => item !== selected)
    .slice(0, 3)
    .map((item) => ({
      id: item.candidate.id,
      name: item.candidate.name,
      score: item.optimizationScore,
      hardFailures: item.constraintReport.hardFailures.map((failure) => failure.message),
      warnings: item.constraintReport.warnings.map((warning) => warning.message)
    }));

  if (!selected) return { selected: null, rejected };

  return {
    selected: selected.candidate,
    constraintReport: selected.constraintReport,
    optimizationScore: selected.optimizationScore,
    rejected
  };
}

function estimateTransitionMinutes(previousCluster, nextCluster) {
  if (!previousCluster || !nextCluster) return 0;
  if (previousCluster === nextCluster) return 12;
  return 24;
}
