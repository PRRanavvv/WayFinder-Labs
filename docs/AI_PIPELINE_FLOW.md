# AI Pipeline Flow

The public demo pipeline is intentionally simple and readable.

## Flow

```text
Trip Intent
  ↓
Preference Context
  ↓
Candidate Place Set
  ↓
Semantic Ranking
  ↓
Adaptive Scoring
  ↓
Itinerary Assembly
  ↓
Explainable Output
```

## Stages

### 1. Trip Intent

Captures destination, interests, day count, and planning constraints.

### 2. Preference Context

Uses a normalized preference profile when available. If no profile exists, scoring remains neutral.

### 3. Candidate Place Set

The public repo uses a safe mock place set. Production place intelligence is intentionally excluded.

### 4. Semantic Ranking

Scores candidates against trip interests and tags.

### 5. Adaptive Scoring

Applies lightweight preference-aware adjustments from learned behavior.

### 6. Itinerary Assembly

Places ranked candidates into day lanes with simple time slots.

### 7. Explainable Output

Returns structured reasons that are suitable for user-facing copilot messages.

