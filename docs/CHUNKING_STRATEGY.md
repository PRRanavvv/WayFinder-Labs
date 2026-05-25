# Chunking Strategy

WayFinder retrieval uses metadata-aware chunks instead of raw document splitting.

Travel data is structured, so chunk boundaries should preserve itinerary meaning: place overview, logistics, timing, cost, route role, recovery value, and contextual fit.

## Supported Entity Types

| Entity Type | Examples |
| --- | --- |
| `destination` | City-level context, neighborhoods, travel seasons |
| `attraction` | Forts, viewpoints, landmarks, museums |
| `restaurant` | Food stops, cafes, local dining clusters |
| `transport` | Transfers, route segments, commute guidance |
| `activity` | Markets, walks, nightlife, recovery stops |
| `itinerary` | Day plans, editable blocks, generated schedules |

## Current Public Chunk Types

| Chunk Type | Purpose |
| --- | --- |
| `overview` | Captures semantic meaning: what the place is, who it is good for, and why it matters |
| `logistics` | Captures planning context: day windows, fatigue band, weather fit, role, and retrieval terms |

## Validation Rules

Every chunk must include:

- stable id
- source id
- source type
- supported entity type
- chunk type
- title
- text
- destination metadata

Run validation with:

```bash
npm run test:retrieval
```

## Design Principle

Chunks should be small enough for precise retrieval but complete enough to be useful to the ranking and itinerary generation stages.
