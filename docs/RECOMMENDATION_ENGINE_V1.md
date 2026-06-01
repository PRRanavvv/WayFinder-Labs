# Recommendation Engine

Recommendation Engine v2 ranks retrieved destinations after semantic retrieval and supports configurable weight profiles plus group satisfaction scoring.

## Inputs

- user preferences
- retrieved destination candidates
- budget constraints
- group preferences
- trip length
- season
- travel style
- optional group members
- weight profile or custom weights

## Scoring

```text
Destination Ranking Score =
  retrieval fit
  + preference fit
  + budget fit
  + group fit
  + season fit
  + trip length fit
  + group satisfaction fit
```

The public implementation lives in:

```text
ai-engine/src/intelligence/recommendationEngine.js
```

## Output

Each recommendation includes:

- `destinationRankingScore`
- `recommendationBreakdown`
- `groupSatisfaction`
- `recommendationReasons`

Example reasons:

- matches traveler preferences
- medium budget fit
- fits the group
- strong seasonal fit
- strong retrieval match
- high group satisfaction
- low group conflict

## Weight Profiles

Built-in profiles:

- `solo`
- `couples`
- `family`
- `friends`

Custom weights can override the profile:

```json
{
  "retrievalFit": 0.35,
  "preferenceFit": 0.25,
  "groupFit": 0.2,
  "seasonFit": 0.1,
  "budgetFit": 0.1
}
```

## Group Conflict Resolution

The engine calculates per-member satisfaction, then applies a fairness penalty when one traveler is much less satisfied than the group average.

```json
{
  "groupScore": 82,
  "memberScores": [
    { "memberId": "A", "score": 92 },
    { "memberId": "B", "score": 70 },
    { "memberId": "C", "score": 85 }
  ],
  "conflictLevel": "medium"
}
```

## Verification

```bash
npm run test:recommendations
```
