CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS travel_context_chunks (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  chunk_type TEXT NOT NULL,
  title TEXT NOT NULL,
  chunk_text TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding_model TEXT NOT NULL,
  embedding VECTOR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS travel_context_chunks_hnsw_idx
  ON travel_context_chunks
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS travel_context_chunks_metadata_idx
  ON travel_context_chunks
  USING gin (metadata);

CREATE INDEX IF NOT EXISTS travel_context_chunks_entity_type_idx
  ON travel_context_chunks (entity_type);
