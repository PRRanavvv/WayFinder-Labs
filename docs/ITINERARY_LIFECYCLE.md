# Itinerary Generation Lifecycle

WayFinder treats itinerary generation as a lifecycle, not a one-time response.

## Lifecycle

```text
Generate Proposal
  ↓
Render in Canvas
  ↓
User Edits
  ↓
Capture Behavior Signals
  ↓
Update Preference Memory
  ↓
Regenerate or Re-rank
  ↓
Explain Changes
```

## Proposal, Not Final Truth

The initial itinerary is only a starting point. The canvas lets users reshape it by moving, replacing, pinning, or annotating activity nodes.

## Learning Loop

Every meaningful edit can become a signal:

- A pinned activity suggests positive preference.
- A replacement suggests mismatch.
- A recovery block suggests pacing needs.
- Repeated edits suggest schedule flexibility or dissatisfaction.

The public demo shows this concept without including private production behavior models.

## Deterministic Planner

Itinerary Intelligence v1 is documented in `docs/ITINERARY_INTELLIGENCE_V1.md`.

The schedule is generated through deterministic constraints first: opening hours, travel movement, daily limits, fatigue, walking effort, budget, and group profile. LLMs should only explain or refine the resulting plan after the deterministic planner has produced a feasible schedule.
