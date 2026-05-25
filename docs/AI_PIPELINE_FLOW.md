# AI Pipeline Flow

The public demo pipeline is intentionally simple and readable.

## Flow

```text
Trip Intent
  |
Preference Context
  |
Embedding-ready Metadata
  |
Semantic Retrieval
  |
Retrieved Candidate Set
  |
Semantic Ranking
  |
Adaptive Scoring
  |
Itinerary Assembly
  |
Explainable Output
```

## Stages

### 1. Trip Intent

Captures destination, interests, day count, pace, group context, and planning constraints.

### 2. Preference Context

Uses a normalized preference profile when available. If no profile exists, scoring remains neutral.

### 3. Embedding-ready Metadata

Converts public-safe place metadata into retrieval text using names, tags, roles, clusters, summaries, day windows, and safe retrieval terms.

### 4. Semantic Retrieval

Builds a local vector-style index and retrieves candidate places against the trip intent. The public repo uses deterministic token vectors instead of external embedding APIs.

### 5. Retrieved Candidate Set

Passes only the most relevant candidate places into downstream ranking.

### 6. Semantic Ranking

Scores retrieved candidates against trip interests and tags.

### 7. Adaptive Scoring

Applies lightweight preference-aware adjustments from learned behavior.

### 8. Itinerary Assembly

Places ranked candidates into day lanes with simple time slots.

### 9. Explainable Output

Returns structured reasons that are suitable for user-facing copilot messages.
