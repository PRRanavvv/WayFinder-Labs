# Embedding Pipeline

The embedding pipeline converts travel metadata into searchable vector records.

## Pipeline

```mermaid
flowchart TD
  Places["Travel Metadata"] --> Chunks["Chunk Generation"]
  Chunks --> Validate["Chunk Validation"]
  Validate --> Embed["Embedding Service"]
  Embed --> Records["Vector Records"]
  Records --> Upsert["Vector Store Upsert"]
  Upsert --> Benchmark["Retrieval Benchmark"]
```

## Current Public Implementation

| Layer | File |
| --- | --- |
| Chunk generation | `ai-engine/src/retrieval/chunking.js` |
| Embedding service | `ai-engine/src/retrieval/embeddingService.js` |
| Local vector store | `ai-engine/src/retrieval/localVectorStore.js` |
| Qdrant adapter | `ai-engine/src/retrieval/qdrantStore.js` |
| pgvector adapter | `ai-engine/src/retrieval/pgvectorStore.js` |
| Retrieval pipeline | `ai-engine/src/retrieval/retrievalPipeline.js` |
| Enriched place dataset | `ai-engine/src/datasets/enrichedPlaces.js` |
| Retrieval eval prompts | `ai-engine/src/retrieval/retrievalEvaluationPrompts.js` |

## Embedding Provider Boundary

The public repo uses `local-hash` embeddings. This provider is deterministic, secret-free, and intended for development tests only.

Production should replace it with a private embedding provider behind the same service contract:

```text
embedText(text) -> number[]
embedChunks(chunks) -> chunks with embeddings
```

## Re-indexing Workflow

Run a local reindex:

```bash
npm run reindex:retrieval
```

Index into Qdrant:

```bash
QDRANT_URL=http://localhost:6333 npm run qdrant:index
```

Generate a local cache artifact:

```bash
npm run ingest:retrieval
```

The generated `.cache/` output is ignored by Git.

## Update Strategy

Embedding updates should be triggered when:

- place metadata changes
- chunking logic changes
- embedding model changes
- retrieval filters or scoring fields change

The enriched place metadata now includes:

- category
- mood
- ideal traveler groups
- budget level
- best months
- visit duration
- crowd level
- walking effort
- family friendliness
- nightlife, adventure, and cultural scores

Each vector record stores:

- source id
- source type
- entity type
- chunk type
- metadata
- embedding model
- embedding dimensions
- update timestamp
