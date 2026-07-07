import { runProductionEdgeCaseBenchmark } from "../src/index.js";

const report = await runProductionEdgeCaseBenchmark();

console.log(JSON.stringify({
  scenarioCount: report.scenarioCount,
  failureCount: report.failureCount,
  passRate: report.passRate,
  byCategory: report.byCategory,
  failures: report.failures.slice(0, 10)
}, null, 2));

if (report.failureCount > 0) {
  process.exitCode = 1;
}
