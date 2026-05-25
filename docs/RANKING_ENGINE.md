# Ranking Engine Explanation

The ranking engine is the first real decision layer in WayFinder.

Retrieval is responsible for finding candidate context. Ranking is responsible for deciding which candidates deserve priority. This separation keeps the LLM out of deterministic scoring, budget math, timing checks, and recommendation ordering.

## Current Public Dimensions

| Dimension | Purpose |
| --- | --- |
| `semanticRelevance` | Match candidate metadata against trip interests |
| `retrievalConfidence` | Use retrieval score as a candidate-quality signal |
| `travelEfficiency` | Favor smoother clusters and lower travel-time friction |
| `popularity` | Include public-safe demand/recognition signal |
| `budgetFit` | Compare activity cost against available daily budget |
| `timingFit` | Check requested day window against opening/planning windows |
| `preferenceFit` | Apply learned preference profile signals |
| `groupCompatibility` | Match solo/couple/friends/family group context |
| `weatherCompatibility` | Prefer indoor/outdoor fit under weather constraints |
| `diversityFit` | Protect itinerary variety |

## Scoring Profiles

The scoring system supports configurable profiles:

| Profile | Purpose |
| --- | --- |
| `balanced` | General-purpose travel recommendation scoring |
| `budgetSensitive` | Gives more weight to budget fit |
| `slowTravel` | Gives more weight to pacing, preference fit, and efficiency |
| `weatherSafe` | Gives more weight to indoor/outdoor resilience |

## Why This Matters

This layer matters more than the LLM for recommendation quality. It makes ranking:

- deterministic
- explainable
- testable
- debuggable
- tunable
- safe to optimize later

## Public Safety Note

The implementation uses public-safe sample weights and metadata. Production ranking weights, private evaluation signals, private datasets, and proprietary optimization heuristics are not included.
