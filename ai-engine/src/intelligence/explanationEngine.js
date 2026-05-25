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

function humanizeDimension(dimension) {
  return dimension.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`);
}
