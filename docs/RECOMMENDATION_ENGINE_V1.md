# Recommendation Engine v1

Recommendation Engine v1 ranks retrieved destinations after semantic retrieval.

## Inputs

- user preferences
- retrieved destination candidates
- budget constraints
- group preferences
- trip length
- season
- travel style

## Scoring

```text
Destination Ranking Score =
  retrieval fit
  + preference fit
  + budget fit
  + group fit
  + season fit
  + trip length fit
```

The public implementation lives in:

```text
ai-engine/src/intelligence/recommendationEngine.js
```

## Output

Each recommendation includes:

- `destinationRankingScore`
- `recommendationBreakdown`
- `recommendationReasons`

Example reasons:

- matches traveler preferences
- medium budget fit
- fits the group
- strong seasonal fit
- strong retrieval match

## Verification

```bash
npm run test:recommendations
```
