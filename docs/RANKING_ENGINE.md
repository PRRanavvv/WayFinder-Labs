# Ranking Engine Explanation

The ranking engine in this public repo demonstrates composable scoring, not production ranking.

## Public Demo Dimensions

| Dimension | Purpose |
| --- | --- |
| `semanticFit` | Match place tags against trip interests |
| `adaptiveFit` | Adjust based on learned user preferences |
| `pacingFit` | Penalize places that exceed fatigue tolerance |
| `clusterFit` | Favor smoother locality continuity |
| `weatherFit` | Prefer resilient places under weather uncertainty |

## Why Composable Scoring

Each scoring dimension is independent. That makes the system easier to:

- debug
- explain
- test
- tune
- extend with future modules

## Public Safety Note

The weights and sample data here are intentionally illustrative. Production ranking heuristics, internal evaluation signals, and proprietary datasets are not included.

