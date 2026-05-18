# Adaptive Memory Lifecycle

Adaptive memory helps WayFinder learn how a traveler or group prefers to move through a city.

## Profile Shape

```json
{
  "travelStyle": {
    "foodExploration": 0.62,
    "heritagePreference": 0.68,
    "fatigueTolerance": 0.44,
    "recoveryPreference": 0.58
  },
  "confidence": {
    "profileConfidence": 0.32
  }
}
```

## Signal Types

Examples:

- `activity_pinned`
- `activity_replaced`
- `recovery_added`
- `high_fatigue_removed`
- `food_stop_accepted`

## Lifecycle

```text
Interaction
  ↓
Behavior Signal
  ↓
Profile Update
  ↓
Confidence Adjustment
  ↓
Scoring Influence
```

## Guardrails

- Preferences should evolve gradually.
- Low-confidence profiles should only lightly affect scoring.
- New trip context should still matter.
- Production privacy and retention policies should govern long-term storage.

