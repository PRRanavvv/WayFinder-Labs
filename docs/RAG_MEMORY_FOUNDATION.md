# RAG Memory Foundation

WayFinder's first model-memory layer uses retrieval-augmented generation instead of fine-tuning. The goal is to retrieve useful past context before planning: stable preferences, trip history, saved places, and feedback.

## Flow

```text
User message or trip event
  -> extract reusable memory candidates
  -> create embeddings
  -> store typed memories
  -> retrieve relevant memories for the next planning request
  -> format prompt context for the model/planner
```

## Memory Types

- `preference`: stable user or group preferences
- `trip`: previous itinerary or route context
- `place`: saved, visited, or home-base place context
- `feedback`: negative or corrective signals
- `conversation_note`: reusable context that does not fit the above buckets

## Public-Safe Implementation

Current files:

- `ai-engine/src/memory/ragMemory.js`
- `ai-engine/tests/ragMemory.test.js`

This public version uses the existing local hash embedding service so tests run without model downloads, API keys, or a vector database. The same boundary can later point to a production embedding provider and vector store.

## Planner Contract

The planner-facing context is intentionally simple:

```json
{
  "enabled": true,
  "query": "cheap cafe plan near metro",
  "promptContext": "1. [preference, confidence 0.68, score 0.32] User prefers cheap quiet cafes near metro stations.",
  "memories": [
    {
      "id": "mem_preference_...",
      "type": "preference",
      "text": "User prefers cheap quiet cafes near metro stations.",
      "confidence": 0.68,
      "score": 0.32
    }
  ],
  "stats": {
    "candidateCount": 3,
    "returnedCount": 1,
    "topScore": 0.32
  }
}
```

## Upgrade Path

1. Keep the public local store for demos and tests.
2. Add a persistence adapter for user and group memories.
3. Swap local hash embeddings for BGE Small or a hosted embedding model.
4. Add a vector store adapter for Qdrant or pgvector.
5. Add user-visible memory review, deletion, and confidence controls.
