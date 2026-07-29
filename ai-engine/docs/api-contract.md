# WayFinder AI Engine API Contract

This document is the integration contract between the Next.js monolith and the Python/FastAPI AI engine.

Base URL in local development:

```text
http://localhost:8000
```

The monolith should call the AI engine through `frontend/src/ml-client/` and validate every response at the boundary.

## Ownership Rules

- AI engine owns preference fusion, planning intelligence, ranking, stability reports, and explanations.
- Next.js monolith owns auth, trip membership authorization, persistence, Supabase writes, Google Places geocoding, Mapbox rendering, and final verified coordinates.
- AI engine should not write to the application database.
- AI engine should not return invented coordinates.
- AI engine output is advisory until the monolith validates, persists, and verifies it.

## Health

```http
GET /health
```

Response:

```json
{
  "status": "ok",
  "service": "wayfinder-ai-engine",
  "runtime": "python-fastapi",
  "engineVersion": "0.2.0"
}
```

## Fuse Preferences

```http
POST /v1/fuse-preferences
```

Request:

```json
{
  "tripContext": {
    "destination": "Rajasthan",
    "days": 3,
    "month": "Jan",
    "groupType": "friends"
  },
  "explicitPreferences": {
    "interests": ["heritage", "food"],
    "pace": "slow"
  },
  "groupMembers": [
    {
      "id": "user_1",
      "name": "Pranav",
      "interests": ["heritage", "food", "photography"],
      "moods": ["slow", "cultural"],
      "pace": "slow",
      "budget": 30000
    }
  ]
}
```

Response shape:

```json
{
  "fusion": {
    "stage": "group-preference-fusion-v1",
    "tripDNA": {
      "groupVibe": "slow food + heritage trip",
      "softPreferences": ["food", "heritage"],
      "hardConstraints": [],
      "dominantPace": "slow",
      "budgetProfile": {},
      "consensus": {},
      "conflictLevel": "medium"
    },
    "fairness": {},
    "conflicts": [],
    "recommendationHints": {},
    "confidence": 0.82,
    "confidenceLevel": "high",
    "confidenceReasons": []
  },
  "explanation": {
    "kind": "group-preference-fusion",
    "headline": "Group vibe: slow food + heritage trip",
    "selectedBecause": [],
    "whoThisServes": [],
    "tradeoffs": [],
    "watchouts": [],
    "confidenceNarrative": "high confidence from deterministic scoring signals."
  }
}
```

## Build Itinerary

```http
POST /v1/itinerary
```

Request:

```json
{
  "destination": "Kerala",
  "days": 4,
  "budget": 50000,
  "group": {
    "adults": 2,
    "parents": true
  },
  "preferences": {
    "interests": ["heritage", "nature"],
    "pace": "slow"
  },
  "month": "Jan",
  "openingHours": {
    "kerala_002": {
      "closed": true,
      "source": "google-places"
    }
  }
}
```

Response shape:

```json
{
  "stage": "itinerary-intelligence-v1",
  "plannerStatus": "feasible",
  "destination": "Kerala",
  "constraints": {},
  "route": {
    "routeLocations": ["Kochi", "Munnar", "Alleppey", "Varkala"],
    "transfers": [],
    "backtrackingAvoided": true
  },
  "days": [
    {
      "day": 1,
      "routeLocation": "Kochi",
      "activities": []
    }
  ],
  "totals": {},
  "realtimeInsights": {},
  "skippedCandidates": [],
  "decisionTrace": [],
  "feasibility": {
    "valid": true,
    "dayReports": [],
    "routeValid": true
  },
  "confidence": 0.86,
  "confidenceLevel": "high",
  "confidenceReasons": []
}
```

## Stable Replan

```http
POST /v1/replan
```

Request:

```json
{
  "previousItinerary": {},
  "itineraryInput": {
    "destination": "Kerala",
    "days": 4,
    "budget": 50000,
    "group": {
      "adults": 2,
      "parents": true
    }
  },
  "changes": {
    "openingHours": {
      "kerala_002": {
        "closed": true
      }
    }
  },
  "stabilityOptions": {
    "preserveAccepted": true,
    "acceptedActivityIds": ["kerala_004"]
  }
}
```

Response shape:

```json
{
  "itinerary": {
    "stage": "stable-itinerary-replan-v1",
    "days": [],
    "stabilityReport": {
      "previousActivityCount": 4,
      "currentActivityCount": 3,
      "preservedActivityCount": 3,
      "replacedActivityCount": 1,
      "affectedDays": [3],
      "preservedDays": [1, 2, 4],
      "regeneratedDays": [3],
      "rule": "Preserve unaffected accepted days; regenerate only directly impacted days."
    }
  },
  "explanation": {
    "kind": "stable-replan",
    "headline": "3/4 accepted places were preserved"
  }
}
```

## Recommendations

```http
POST /v1/recommendations
```

Request:

```json
{
  "query": "cheap romantic beach in December with fewer crowds",
  "userPreferences": {
    "interests": ["beach", "romantic", "quiet"]
  },
  "budgetConstraints": {
    "maxBudgetLevel": 2
  },
  "groupPreferences": {
    "groupType": "couples"
  },
  "groupMembers": [],
  "tripLengthDays": 3,
  "month": "Dec",
  "topK": 5
}
```

Response shape:

```json
{
  "recommendations": [
    {
      "id": "goa_002",
      "name": "Palolem Beach",
      "destinationRankingScore": 84.2,
      "recommendationBreakdown": {},
      "groupSatisfaction": {},
      "recommendationReasons": [],
      "confidence": 0.8,
      "confidenceLevel": "high",
      "confidenceReasons": []
    }
  ]
}
```

## Error Handling Expectations

The Next.js client should treat the AI service as fallible:

- Timeout after 8-12 seconds for interactive actions.
- Retry only idempotent reads/recommendations.
- Fall back to a saved draft plan or manual UI if the service fails.
- Log the request ID, route, trip ID, user ID, and error class.
- Never persist AI output until the monolith validates it.

## Suggested Client Wrapper

```ts
const response = await fetch(`${AI_ENGINE_URL}/v1/fuse-preferences`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(10000),
});

if (!response.ok) {
  throw new Error(`AI engine failed: ${response.status}`);
}

const json = await response.json();
// Validate with Zod before using json.fusion.
```
