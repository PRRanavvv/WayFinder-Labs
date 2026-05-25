export class PgvectorStore {
  constructor({
    connectionString = process.env.DATABASE_URL,
    tableName = "travel_context_chunks"
  } = {}) {
    this.connectionString = connectionString;
    this.tableName = assertSqlIdentifier(tableName);
    this.pool = null;
  }

  async connect() {
    if (this.pool) return this.pool;
    if (!this.connectionString) {
      throw new Error("DATABASE_URL is required for PgvectorStore.");
    }

    let pg;
    try {
      pg = await import("pg");
    } catch (error) {
      throw new Error("Install the optional 'pg' dependency before using PgvectorStore.");
    }

    this.pool = new pg.Pool({ connectionString: this.connectionString });
    return this.pool;
  }

  async upsert(records) {
    const pool = await this.connect();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      for (const record of records) {
        await client.query(
          `
          INSERT INTO ${this.tableName} (
            id,
            source_id,
            source_type,
            entity_type,
            chunk_type,
            title,
            chunk_text,
            metadata,
            embedding_model,
            embedding
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::vector)
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            chunk_text = EXCLUDED.chunk_text,
            metadata = EXCLUDED.metadata,
            embedding_model = EXCLUDED.embedding_model,
            embedding = EXCLUDED.embedding,
            updated_at = now()
          `,
          [
            record.id,
            record.sourceId,
            record.sourceType,
            record.entityType,
            record.chunkType,
            record.title,
            record.text,
            JSON.stringify(record.metadata),
            record.embeddingModel,
            toVectorLiteral(record.embedding)
          ]
        );
      }

      await client.query("COMMIT");
      return { upserted: records.length };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async search({ embedding, filters = {}, topK = 5, minScore = 0 } = {}) {
    const pool = await this.connect();
    const params = [toVectorLiteral(embedding), topK, minScore];
    const where = buildWhereClause(filters, params);

    const result = await pool.query(
      `
      SELECT
        id,
        source_id AS "sourceId",
        source_type AS "sourceType",
        entity_type AS "entityType",
        chunk_type AS "chunkType",
        title,
        chunk_text AS text,
        metadata,
        embedding_model AS "embeddingModel",
        1 - (embedding <=> $1::vector) AS similarity
      FROM ${this.tableName}
      ${where}
      ORDER BY embedding <=> $1::vector
      LIMIT $2
      `,
      params
    );

    return result.rows;
  }

  async close() {
    if (this.pool) await this.pool.end();
    this.pool = null;
  }
}

function buildWhereClause(filters, params) {
  const clauses = ["1 - (embedding <=> $1::vector) >= $3"];

  if (filters.destination) {
    params.push(JSON.stringify({ destination: filters.destination }));
    clauses.push(`metadata @> $${params.length}::jsonb`);
  }

  if (filters.entityTypes?.length) {
    params.push(filters.entityTypes);
    clauses.push(`entity_type = ANY($${params.length})`);
  }

  if (filters.roles?.length) {
    params.push(filters.roles);
    clauses.push(`metadata->>'role' = ANY($${params.length})`);
  }

  return `WHERE ${clauses.join(" AND ")}`;
}

function toVectorLiteral(vector) {
  return `[${vector.map((value) => Number(value).toFixed(8)).join(",")}]`;
}

function assertSqlIdentifier(identifier) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }

  return identifier;
}
