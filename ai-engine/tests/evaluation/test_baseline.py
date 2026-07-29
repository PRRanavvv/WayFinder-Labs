import unittest

from evals.runner import run_evaluation


class BaselineEvaluationTests(unittest.TestCase):
    def test_baseline_suite_passes(self):
        report = run_evaluation()

        self.assertTrue(report["passed"])
        self.assertGreaterEqual(report["caseCount"], 3)


if __name__ == "__main__":
    unittest.main()
