# Itinerary Intelligence v1

WayFinder now has a deterministic itinerary planner before any LLM orchestration.

The planner takes structured trip input:

```json
{
  "destination": "Kerala",
  "days": 4,
  "budget": 50000,
  "group": {
    "adults": 2,
    "parents": true
  }
}
```

And returns route-aware day arrays:

```json
{
  "day1": [],
  "day2": [],
  "day3": [],
  "day4": []
}
```

The full response also includes:

- `days`: normalized day objects with costs, fatigue, walking hours, and activities
- `route`: ordered route locations, transfer estimates, and backtracking status
- `constraints`: fatigue, walking, activity count, budget, and day-window limits
- `feasibility`: validation reports for opening hours, day limits, budget, fatigue, and walking
- `decisionTrace`: deterministic selection reasons
- `skippedCandidates`: rejected places with concrete constraint reasons

## Dataset Fields

Every enriched place now carries itinerary scheduling fields:

```json
{
  "visitDuration": 2,
  "openingTime": "09:00",
  "closingTime": "18:00",
  "fatigueScore": 3,
  "travelType": "walking",
  "idealTime": "morning"
}
```

These are derived from existing metadata when not explicitly set.

## Constraint Engine

The planner checks hard constraints before adding an activity:

- no visits before opening time or after closing time
- no activities past the day end time
- daily fatigue stays under the group profile limit
- parent groups get lower fatigue and walking caps
- daily activity cost stays under the daily budget envelope
- cross-cluster activity hopping inside a day is rejected

## Route Optimization

The planner chooses route locations before scheduling activities. For Kerala, it uses a known corridor:

```text
Kochi -> Munnar -> Alleppey -> Varkala -> Wayanad
```

This avoids schedules like:

```text
Fort Kochi -> Munnar -> Fort Kochi -> Alleppey
```

The travel graph also includes deterministic transfer estimates between known route locations.

## Fatigue Model

Group type changes the hard limits:

```json
{
  "parents": {
    "maxFatigue": 6,
    "maxWalkingHours": 3.2
  },
  "balanced": {
    "maxFatigue": 8,
    "maxWalkingHours": 5
  },
  "backpackers": {
    "maxFatigue": 10,
    "maxWalkingHours": 7
  }
}
```

For the sample Kerala parent trip, the planner prefers Fort Kochi, Munnar Tea Gardens, Alleppey Backwaters, and Varkala Cliff while avoiding Edakkal Caves because of the higher fatigue burden.

## Dynamic Replanning Hook

`replanDeterministicItinerary` supports v1 deterministic replanning inputs such as:

- skipped days
- blocked place IDs
- rain or indoor-bias changes
- updated preferences

This is intentionally not an LLM workflow. LLMs can later explain itinerary changes, but the schedule should continue to come from deterministic constraints.

## Run Tests

```bash
npm run test:itinerary --workspace ai-engine
```
