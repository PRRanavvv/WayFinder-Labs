# Travel Knowledge Layer

The travel knowledge layer adds destination intelligence beyond metadata tags.

## Fields

Each enriched place now exposes:

- `avg_temp_monthly`
- `peak_season`
- `monsoon_months`
- `climate_tags`
- `seasonal_notes`
- `best_for`

Example:

```json
{
  "avg_temp_monthly": {
    "jan": 18,
    "feb": 21,
    "mar": 26
  },
  "peak_season": ["nov", "dec"],
  "monsoon_months": ["jun", "jul", "aug"],
  "best_for": ["family", "couples", "photography"]
}
```

## Why It Matters

A query like `cool weather destination in May` should not depend on keyword matching. The engine can now compare the requested month against destination temperature intelligence and rank hill/cool-weather places above hot coastal or desert places.

Implementation:

```text
ai-engine/src/datasets/travelKnowledge.js
```
