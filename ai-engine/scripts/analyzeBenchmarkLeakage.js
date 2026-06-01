import {
  analyzeBenchmarkLeakage,
  hardRetrievalEvaluationPrompts,
  retrievalEvaluationPrompts
} from "../src/index.js";

const benchmark = process.argv.includes("--clean") ? "clean-v1" : "hard-v2";
const prompts = benchmark === "clean-v1"
  ? retrievalEvaluationPrompts
  : hardRetrievalEvaluationPrompts;

const report = analyzeBenchmarkLeakage({ prompts });

console.log(JSON.stringify({
  benchmark,
  ...report
}, null, 2));
