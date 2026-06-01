# Hard Retrieval Benchmark v2

Hard Benchmark v2 is the messy human prompt suite for retrieval.

It intentionally tests queries like:

- `I hate crowded places and my parents get tired quickly`
- `5 friends, one vegetarian, one photographer, budget 30k`
- `somewhere not too hot in June`
- `we've already been to Goa twice`
- `my girlfriend likes sunsets`

## Coverage

- 220 messy prompts
- Low-crowd and low-energy family travel
- Mixed friend groups
- Weather and month intent
- Exclusion/repeat traveler intent
- Vague romantic prompts
- Contradictory nightlife/quiet preferences
- Food and dietary constraints
- Short-trip logistics
- Hidden-gem repeat traveler prompts
- Budget couple conflict

## Leakage Audit

Hard v2 checks:

- exact expected place name leakage
- exact expected destination/city leakage
- messy signal coverage
- synonym family coverage
- contradiction coverage

Run:

```bash
npm run analyze:benchmark-leakage
```

Run the full hard benchmark:

```bash
npm run benchmark:retrieval:hard
```

Current baseline:

```text
caseCount: 220
failureCount: 0
passRate: 1.0
exactDestinationLeakCount: 0
exactPlaceLeakCount: 0
```

The point is not to celebrate 100%. The point is to keep adding ugly prompts until failures reveal the next real product weakness.
