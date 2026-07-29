import json
from pathlib import Path

from app.engines.itinerary_planner import plan_deterministic_itinerary

from .metrics import evaluate_itinerary

CASES_PATH = Path(__file__).parent / "cases" / "baseline.json"


def load_cases(path: Path = CASES_PATH) -> list[dict]:
    return json.loads(path.read_text(encoding="utf-8"))


def run_evaluation(cases: list[dict] | None = None) -> dict:
    results = []
    for case in cases or load_cases():
        itinerary = plan_deterministic_itinerary(**case["input"])
        results.append(evaluate_itinerary(case, itinerary))
    return {
        "suite": "wayfinder-ai-baseline-v1",
        "passed": all(result["passed"] for result in results),
        "caseCount": len(results),
        "results": results,
    }


def main() -> int:
    report = run_evaluation()
    print(json.dumps(report, indent=2))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
