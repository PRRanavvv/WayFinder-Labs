import { cosineSimilarity } from "./textUtils.js";

export class LocalVectorStore {
  constructor({ records = [] } = {}) {
    this.records = [];
    if (records.length) this.upsertSync(records);
  }

  async clear() {
    this.records = [];
    return { cleared: true };
  }

  async upsert(records) {
    return this.upsertSync(records);
  }

  upsertSync(records) {
    const byId = new Map(this.records.map((record) => [record.id, record]));

    for (const record of records) {
      byId.set(record.id, record);
    }

    this.records = [...byId.values()];

    return {
      upserted: records.length,
      total: this.records.length
    };
  }

  async search({ embedding, filters = {}, topK = 5, minScore = 0 } = {}) {
    return this.records
      .filter((record) => matchesFilters(record.metadata, filters))
      .map((record) => {
        const similarity = cosineSimilarity(embedding, record.embedding);
        return {
          ...record,
          similarity,
          confidence: confidenceFromSimilarity(similarity)
        };
      })
      .filter((record) => record.similarity >= minScore)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  toJSON() {
    return {
      records: this.records
    };
  }
}

export function matchesFilters(metadata = {}, filters = {}) {
  if (filters.destination && metadata.destination !== filters.destination) return false;
  if (filters.entityTypes?.length && !filters.entityTypes.includes(metadata.entityType)) return false;
  if (filters.roles?.length && !filters.roles.includes(metadata.role)) return false;
  if (filters.clusters?.length && !filters.clusters.includes(metadata.cluster)) return false;

  if (filters.tags?.length) {
    const tags = new Set(metadata.tags || []);
    if (!filters.tags.some((tag) => tags.has(tag))) return false;
  }

  if (filters.dayWindows?.length) {
    const dayWindows = new Set(metadata.dayWindows || []);
    if (!filters.dayWindows.some((window) => dayWindows.has(window))) return false;
  }

  return true;
}

function confidenceFromSimilarity(similarity) {
  if (similarity >= 0.75) return "high";
  if (similarity >= 0.45) return "medium";
  return "low";
}
