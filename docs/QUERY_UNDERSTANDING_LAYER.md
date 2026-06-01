# Query Understanding Layer

WayFinder now extracts structured travel intent before retrieval.

## Flow

```text
User query
-> intent extraction
-> hybrid retrieval
-> recommendation ranking
```

Example:

```json
{
  "trip_type": "family",
  "season": "summer",
  "month": "may",
  "budget": "medium",
  "vibe": "relaxed",
  "climate_preference": "cool",
  "activity_intent": "nature"
}
```

The retrieval pipeline merges these extracted fields into interests and constraints, so ranking can use structured intent instead of only embedding similarity.

Implementation:

```text
ai-engine/src/retrieval/queryUnderstanding.js
```
