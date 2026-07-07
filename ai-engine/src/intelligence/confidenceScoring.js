import { clamp } from "../retrieval/textUtils.js";

export function calculateConfidence({
  base = 0.82,
  retrievalScore,
  missingInfo = [],
  conflicts = [],
  fallbackWarnings = [],
  sparseData = false,
  feasible = true,
  outputCompleteness = 1,
  groupConflictLevel = "none",
  dataCoverage = 1
} = {}) {
  const reasons = [];
  let score = typeof retrievalScore === "number"
    ? 0.48 + clamp(retrievalScore / 100, 0, 1) * 0.42
    : base;

  if (missingInfo.length) {
    const penalty = Math.min(0.24, missingInfo.length * 0.06);
    score -= penalty;
    reasons.push(`missing information: ${missingInfo.slice(0, 3).join(", ")}`);
  }
  if (conflicts.length) {
    const penalty = Math.min(0.3, conflicts.length * 0.1);
    score -= penalty;
    reasons.push(`conflicting preferences: ${conflicts.slice(0, 3).map(labelConflict).join(", ")}`);
  }
  if (fallbackWarnings.length) {
    const penalty = Math.min(0.18, fallbackWarnings.length * 0.06);
    score -= penalty;
    reasons.push(`fallback used: ${fallbackWarnings.slice(0, 3).join(", ")}`);
  }
  if (sparseData) {
    score -= 0.15;
    reasons.push("sparse destination data");
  }
  if (!feasible) {
    score -= 0.28;
    reasons.push("no fully feasible plan available");
  }
  if (outputCompleteness < 1) {
    score -= (1 - clamp(outputCompleteness, 0, 1)) * 0.22;
    reasons.push("partial output");
  }
  if (dataCoverage < 1) {
    score -= (1 - clamp(dataCoverage, 0, 1)) * 0.16;
    reasons.push("partial live data coverage");
  }
  if (groupConflictLevel === "high") {
    score -= 0.12;
    reasons.push("high group preference conflict");
  } else if (groupConflictLevel === "medium") {
    score -= 0.07;
    reasons.push("medium group preference conflict");
  }

  const confidence = Number(clamp(score, 0.05, 0.99).toFixed(2));

  return {
    confidence,
    confidenceLevel: confidence >= 0.78 ? "high" : confidence >= 0.55 ? "medium" : "low",
    confidenceReasons: reasons.length ? reasons : ["strong deterministic fit"]
  };
}

function labelConflict(conflict) {
  if (typeof conflict === "string") return conflict;
  return conflict.type || conflict.message || "conflict";
}
