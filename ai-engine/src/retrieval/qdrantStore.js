import { createHash } from "node:crypto";

export class QdrantStore {
  constructor({
    url = process.env.QDRANT_URL || "http://localhost:6333",
    apiKey = process.env.QDRANT_API_KEY,
    collectionName = process.env.QDRANT_COLLECTION || "wayfinder_places",
    vectorSize = 64,
    distance = "Cosine"
  } = {}) {
    this.url = url.replace(/\/+$/, "");
    this.apiKey = apiKey;
    this.collectionName = collectionName;
    this.vectorSize = vectorSize;
    this.distance = distance;
  }

  async ensureCollection({ recreate = false } = {}) {
    if (recreate) {
      await this.deleteCollection({ ignoreMissing: true });
    }

    const exists = await this.collectionExists();
    if (exists) return { created: false, collectionName: this.collectionName };

    await this.request(`/collections/${encodeURIComponent(this.collectionName)}`, {
      method: "PUT",
      body: {
        vectors: {
          size: this.vectorSize,
          distance: this.distance
        }
      }
    });

    return { created: true, collectionName: this.collectionName };
  }

  async clear() {
    await this.ensureCollection({ recreate: true });
    return { cleared: true, collectionName: this.collectionName };
  }

  async upsert(records) {
    await this.ensureCollection();

    const points = records.map((record) => recordToPoint(record));
    await this.request(`/collections/${encodeURIComponent(this.collectionName)}/points?wait=true`, {
      method: "PUT",
      body: { points }
    });

    return {
      upserted: records.length,
      total: records.length,
      collectionName: this.collectionName
    };
  }

  async search({ embedding, filters = {}, topK = 5, minScore = 0 } = {}) {
    await this.ensureCollection();

    const body = {
      query: embedding,
      filter: buildQdrantFilter(filters),
      limit: topK,
      score_threshold: minScore || undefined,
      with_payload: true
    };

    const response = await this.queryPoints(body);
    const points = Array.isArray(response?.result?.points)
      ? response.result.points
      : response?.result || [];

    return points.map(pointToRecord);
  }

  async queryPoints(body) {
    try {
      return await this.request(`/collections/${encodeURIComponent(this.collectionName)}/points/query`, {
        method: "POST",
        body
      });
    } catch (error) {
      if (!String(error.message || "").includes("404")) throw error;
      return this.request(`/collections/${encodeURIComponent(this.collectionName)}/points/search`, {
        method: "POST",
        body: {
          vector: body.query,
          filter: body.filter,
          limit: body.limit,
          score_threshold: body.score_threshold,
          with_payload: body.with_payload
        }
      });
    }
  }

  async collectionExists() {
    const response = await fetch(`${this.url}/collections/${encodeURIComponent(this.collectionName)}`, {
      headers: this.headers()
    });

    if (response.status === 404) return false;
    if (!response.ok) {
      throw new Error(`Qdrant collection lookup failed with ${response.status}: ${await response.text()}`);
    }

    return true;
  }

  async deleteCollection({ ignoreMissing = false } = {}) {
    const response = await fetch(`${this.url}/collections/${encodeURIComponent(this.collectionName)}`, {
      method: "DELETE",
      headers: this.headers()
    });

    if (response.status === 404 && ignoreMissing) return { deleted: false };
    if (!response.ok) {
      throw new Error(`Qdrant collection delete failed with ${response.status}: ${await response.text()}`);
    }

    return { deleted: true };
  }

  async request(path, { method = "GET", body } = {}) {
    const response = await fetch(`${this.url}${path}`, {
      method,
      headers: this.headers(Boolean(body)),
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`Qdrant request failed with ${response.status}: ${await response.text()}`);
    }

    return response.json();
  }

  headers(hasBody = false) {
    return {
      ...(hasBody ? { "content-type": "application/json" } : {}),
      ...(this.apiKey ? { "api-key": this.apiKey } : {})
    };
  }
}

export function recordToPoint(record) {
  const payload = {
    id: record.id,
    sourceId: record.sourceId,
    sourceType: record.sourceType,
    entityType: record.entityType,
    chunkType: record.chunkType,
    title: record.title,
    text: record.text,
    metadata: record.metadata,
    embeddingModel: record.embeddingModel,
    embeddingDimensions: record.embeddingDimensions,
    embeddingUpdatedAt: record.embeddingUpdatedAt,
    indexedAt: record.indexedAt,
    destination: record.metadata?.destination,
    category: record.metadata?.category || record.metadata?.type,
    role: record.metadata?.role,
    cluster: record.metadata?.cluster,
    tags: record.metadata?.tags || [],
    mood: record.metadata?.mood || [],
    idealFor: record.metadata?.idealFor || record.metadata?.bestFor || [],
    costBand: record.metadata?.costBand,
    budgetLevel: record.metadata?.budgetLevel,
    crowdLevel: record.metadata?.crowdLevel,
    familyFriendly: record.metadata?.familyFriendly
  };

  return {
    id: qdrantPointIdFromRecordId(record.id),
    vector: record.embedding,
    payload
  };
}

export function pointToRecord(point) {
  const payload = point.payload || {};
  return {
    id: payload.id || point.id,
    sourceId: payload.sourceId,
    sourceType: payload.sourceType,
    entityType: payload.entityType,
    chunkType: payload.chunkType,
    title: payload.title,
    text: payload.text,
    metadata: payload.metadata || {},
    embeddingModel: payload.embeddingModel,
    embeddingDimensions: payload.embeddingDimensions,
    embeddingUpdatedAt: payload.embeddingUpdatedAt,
    indexedAt: payload.indexedAt,
    similarity: point.score,
    confidence: confidenceFromSimilarity(point.score)
  };
}

export function buildQdrantFilter(filters = {}) {
  const must = [];

  addMatchValue(must, "destination", filters.destination);
  addMatchAny(must, "entityType", normalizeArray(filters.entityTypes));
  addMatchAny(must, "role", normalizeArray(filters.roles));
  addMatchAny(must, "cluster", filters.clusters);
  addMatchAny(must, "category", normalizeArray(filters.categories));
  addMatchAny(must, "costBand", normalizeArray(filters.costBands));
  addMatchAny(must, "tags", normalizeArray(filters.tags));

  if (filters.budgetLevelMax) {
    must.push({ key: "budgetLevel", range: { lte: filters.budgetLevelMax } });
  }

  if (filters.crowdLevelMax) {
    must.push({ key: "crowdLevel", range: { lte: filters.crowdLevelMax } });
  }

  if (filters.familyFriendly === true) {
    must.push({ key: "familyFriendly", match: { value: true } });
  }

  return must.length ? { must } : undefined;
}

export function qdrantPointIdFromRecordId(recordId) {
  const hex = createHash("sha1").update(String(recordId)).digest("hex").slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return [
    hex.slice(0, 8).join(""),
    hex.slice(8, 12).join(""),
    hex.slice(12, 16).join(""),
    hex.slice(16, 20).join(""),
    hex.slice(20, 32).join("")
  ].join("-");
}

function addMatchValue(must, key, value) {
  if (value === undefined || value === null || value === "") return;
  must.push({ key, match: { value } });
}

function addMatchAny(must, key, values) {
  if (!values?.length) return;
  must.push({ key, match: { any: values } });
}

function normalizeArray(values) {
  return values?.map((value) => String(value || "").trim().toLowerCase()).filter(Boolean);
}

function confidenceFromSimilarity(similarity = 0) {
  if (similarity >= 0.75) return "high";
  if (similarity >= 0.45) return "medium";
  return "low";
}
