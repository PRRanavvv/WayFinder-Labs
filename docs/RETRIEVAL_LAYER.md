# Retrieval Layer

The Week 4 AI/ML milestone turns public-safe place metadata into a retrieval-ready system.

This repo now contains a production-facing retrieval foundation with a runnable local store and a pgvector adapter. The local store keeps public tests and demos secret-free. The pgvector path is the selected production architecture for the MVP phase.

## Public Retrieval Flow

```mermaid
flowchart TD
  Intent["Trip Intent"] --> Query["Query Text Builder"]
  Metadata["Public-safe Place Metadata"] --> Chunker["Metadata-aware Chunker"]
  Chunker --> Embed["Embedding Service"]
  Embed --> Index["Vector Store<br/>local demo or pgvector"]
  Query --> Search["Semantic Retrieval"]
  Index --> Search
  Search --> Context["Contextual Fit Scoring"]
  Context --> Candidates["Retrieved Candidate Places"]
  Candidates --> Ranking["Preference-aware Ranking"]
  Ranking --> Itinerary["Structured Itinerary Output"]
```

## Retrieval Inputs

| Input | Purpose |
| --- | --- |
| `query` | Free-text trip intent such as pace, mood, and priorities |
| `interests` | Structured interests like `heritage`, `food`, or `photography` |
| `constraints.pace` | Helps identify slow, balanced, or dense plans |
| `constraints.energyLevel` | Helps retrieve recovery-friendly or high-energy places |
| `constraints.timeOfDay` | Matches places to useful day windows |
| `constraints.weather` | Supports indoor or weather-resilient candidates |
| `constraints.groupType` | Preserves room for group-aware retrieval signals |

## Retrieval Outputs

Each retrieved place includes:

- `retrievalScore`
- `retrievalBreakdown.semanticScore`
- `retrievalBreakdown.contextScore`
- `retrievalReason`

The ranker can then score only the retrieved candidate set instead of the full place list.

## Public-Safe Implementation

Current files:

- `ai-engine/src/retrievalIndex.js`
- `ai-engine/src/retrieval/chunking.js`
- `ai-engine/src/retrieval/embeddingService.js`
- `ai-engine/src/retrieval/localVectorStore.js`
- `ai-engine/src/retrieval/pgvectorStore.js`
- `ai-engine/src/retrieval/retrievalPipeline.js`
- `ai-engine/src/retrieval/retrievalBenchmark.js`
- `ai-engine/examples/retrievalDemo.js`
- `ai-engine/src/samplePlaces.js`
- `ai-engine/database/pgvector-schema.sql`

Run the demo:

```bash
npm run demo:retrieval
```

Run contextual retrieval checks:

```bash
npm run test:retrieval
```

Run retrieval benchmarks:

```bash
npm run benchmark:retrieval
```

Run a local reindex:

```bash
npm run reindex:retrieval
```

## Production Boundary

The public demo does not include:

- Private Jaipur place intelligence
- Real embedding provider calls
- Production vector DB credentials
- Proprietary retrieval tuning rules
- Internal evaluation traces
- Vendor prompt or orchestration internals

The goal is to show the shape of the retrieval layer without exposing private IP.
