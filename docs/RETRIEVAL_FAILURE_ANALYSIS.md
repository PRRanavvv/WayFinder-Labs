# Retrieval Failure Analysis

This note captures the 100-prompt retrieval audit before hybrid scoring and the follow-up after the hybrid reranker.

## Initial Baseline

The local hash baseline produced 15 failures out of 100 benchmark prompts.

Failures were not spread evenly:

| Group | Failed Prompts | Pattern |
| --- | ---: | --- |
| Family vacation | 2 | Family intent was too broad; the vector baseline surfaced plausible family places but missed the expected set. |
| Nature focused | 1 | Waterfall/hills wording needed stronger metadata support. |
| Cultural heritage | 2 | Historic/cultural/architecture synonyms were underweighted. |
| Low-energy relaxed trip | 1 | Easy walking and recovery intent needed explicit metadata influence. |
| Cool weather hills | 3 | Mountain, hills, cool climate, and viewpoint synonyms were too weak. |
| Photography and sunset | 1 | Sunset places competed with generic beach records. |
| Winter India | 5 | Month and season matching was the clearest weakness; December/January/February did not map reliably to `best_months`. |

No failures appeared in the budget, adventure, romantic, hidden-gem, or nightlife groups.

## Fix Applied

The retrieval layer now reranks a wider vector candidate pool with hybrid scoring:

```text
hybrid score = semantic score + metadata score + keyword score
```

Metadata scoring reads category, mood, ideal traveler group, budget, best months, crowd level, walking effort, family friendliness, nightlife, adventure, and cultural signals.

## Current Result

After hybrid scoring, the local benchmark produces 9 failures out of 100 prompts, a 91% minimum-hit pass rate.

The remaining failures are mostly evaluation-set sharpness rather than obvious bad retrieval: family, low-energy, and winter prompts often return sensible alternatives that were not included in the narrow expected ids.

Run the current audit:

```bash
npm run analyze:retrieval-failures
```
