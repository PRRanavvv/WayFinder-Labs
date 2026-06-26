import { createEmbeddingService } from "../retrieval/embeddingService.js";
import {
  clamp,
  cosineSimilarity,
  normalizeText,
  tokenize
} from "../retrieval/textUtils.js";

export const memoryTypes = [
  "preference",
  "trip",
  "place",
  "feedback",
  "conversation_note"
];

export const defaultMemoryRetrievalConfig = {
  limit: 6,
  minScore: 0.16,
  minConfidence: 0.2,
  semanticWeight: 0.68,
  lexicalWeight: 0.18,
  confidenceWeight: 0.08,
  recencyWeight: 0.06
};

export async function createRagMemory(input = {}, options = {}) {
  const text = normalizeMemoryText(input.text);
  if (!text) throw new Error("RAG memory text is required.");

  const type = normalizeMemoryType(input.type || inferMemoryType(text));
  const createdAt = toIso(input.createdAt || options.now || new Date());
  const updatedAt = toIso(input.updatedAt || createdAt);
  const embeddingService = options.embeddingService || createEmbeddingService(options.embeddingConfig);
  const embeddingText = buildMemoryEmbeddingText({
    ...input,
    text,
    type
  });

  return {
    id: input.id || createMemoryId(type),
    userId: stringifyId(input.userId),
    groupId: stringifyId(input.groupId),
    type,
    text,
    confidence: clamp(input.confidence ?? inferMemoryConfidence(type, text), 0, 1),
    source: input.source || "manual",
    sourceId: input.sourceId || input.sourceMessageId || "",
    location: input.location || input.metadata?.location || "",
    metadata: {
      sourceVisibility: "public-demo",
      ...(input.metadata || {})
    },
    embedding: Array.isArray(input.embedding) && input.embedding.length
      ? input.embedding.map(Number)
      : await embeddingService.embedText(embeddingText, { inputType: "document" }),
    embeddingModel: embeddingService.config?.model || "unknown",
    createdAt,
    updatedAt
  };
}

export function extractMemoryCandidates({
  text = "",
  messages = [],
  userId = "",
  groupId = "",
  source = "conversation",
  metadata = {}
} = {}) {
  const combinedText = [
    text,
    ...normalizeMessages(messages).map((message) => message.content)
  ].filter(Boolean).join(" ");
  const seen = new Set();
  const candidates = [];

  for (const sentence of splitIntoSentences(combinedText)) {
    const type = inferMemoryType(sentence);
    if (!isMemoryWorthy(sentence, type)) continue;

    const memoryText = rewriteFirstPersonMemory(sentence);
    const signature = normalizeText(memoryText);
    if (seen.has(signature)) continue;
    seen.add(signature);

    candidates.push({
      userId,
      groupId,
      type,
      text: memoryText,
      confidence: inferMemoryConfidence(type, sentence),
      source,
      metadata: {
        ...metadata,
        extractedBy: "public-demo-heuristics"
      }
    });
  }

  return candidates.slice(0, 12);
}

export async function createMemoryStore({
  memories = [],
  embeddingService = createEmbeddingService()
} = {}) {
  const store = {
    embeddingService,
    memories: [],
    async add(input) {
      const memory = await createRagMemory(input, { embeddingService });
      this.upsert(memory);
      return memory;
    },
    async addMany(inputs = []) {
      const created = [];
      for (const input of inputs) {
        created.push(await this.add(input));
      }
      return created;
    },
    upsert(memory) {
      const normalized = normalizeStoredMemory(memory);
      const byId = new Map(this.memories.map((item) => [item.id, item]));
      byId.set(normalized.id, normalized);
      this.memories = [...byId.values()];
      return normalized;
    },
    list(filters = {}) {
      return this.memories
        .filter((memory) => matchesMemoryFilters(memory, filters))
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    },
    async search(options = {}) {
      return retrieveRelevantMemories({
        ...options,
        memories: this.memories,
        embeddingService
      });
    }
  };

  await store.addMany(memories);
  return store;
}

export async function retrieveRelevantMemories({
  query = "",
  memories = [],
  filters = {},
  limit = defaultMemoryRetrievalConfig.limit,
  minScore = defaultMemoryRetrievalConfig.minScore,
  embeddingService = createEmbeddingService(),
  weights = {},
  now = new Date()
} = {}) {
  const cleanQuery = normalizeMemoryText(query);
  if (!cleanQuery) {
    return buildEmptyRetrievalResult(cleanQuery, memories.length);
  }

  const resolvedWeights = {
    ...defaultMemoryRetrievalConfig,
    ...weights
  };
  const queryEmbedding = await embeddingService.embedText(cleanQuery, { inputType: "query" });
  const candidates = memories
    .map(normalizeStoredMemory)
    .filter((memory) => matchesMemoryFilters(memory, filters));
  const scored = candidates
    .map((memory) => scoreMemory({
      memory,
      query: cleanQuery,
      queryEmbedding,
      weights: resolvedWeights,
      now
    }))
    .filter((result) => result.score >= minScore)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.memory.updatedAt) - new Date(a.memory.updatedAt);
    })
    .slice(0, clampInteger(limit, 1, 25));

  return {
    query: cleanQuery,
    results: scored,
    stats: {
      candidateCount: candidates.length,
      returnedCount: scored.length,
      topScore: scored[0]?.score || 0
    }
  };
}

export function buildRagPromptContext(retrievalResult = {}, options = {}) {
  const results = Array.isArray(retrievalResult)
    ? retrievalResult
    : retrievalResult.results || [];

  if (!results.length) return "";

  return results.map((result, index) => {
    const memory = result.memory || result;
    const confidence = Number(memory.confidence || 0).toFixed(2);
    const score = Number(result.score || memory.score || 0).toFixed(2);
    const scoreText = options.includeScores === false ? "" : `, score ${score}`;
    return `${index + 1}. [${memory.type}, confidence ${confidence}${scoreText}] ${memory.text}`;
  }).join("\n");
}

export function summarizeMemoryRetrieval(retrievalResult = {}) {
  const results = retrievalResult.results || [];
  return {
    query: retrievalResult.query || "",
    returnedCount: results.length,
    topScore: retrievalResult.stats?.topScore || 0,
    memories: results.map((result) => ({
      id: result.memory.id,
      type: result.memory.type,
      text: result.memory.text,
      confidence: result.memory.confidence,
      score: result.score,
      reason: result.reason,
      breakdown: result.breakdown
    }))
  };
}

export async function buildRagPlanningContext({
  query,
  memories = [],
  filters = {},
  limit,
  minScore,
  embeddingService
} = {}) {
  const retrieval = await retrieveRelevantMemories({
    query,
    memories,
    filters,
    limit,
    minScore,
    embeddingService
  });
  const summary = summarizeMemoryRetrieval(retrieval);

  return {
    enabled: true,
    query: retrieval.query,
    promptContext: buildRagPromptContext(retrieval),
    memories: summary.memories,
    stats: retrieval.stats,
    generatedAt: new Date().toISOString()
  };
}

export function inferMemoryType(text = "") {
  const value = normalizeText(text);

  if (/(avoid|hate|dislike|do not like|don't like|never suggest|do not suggest|too crowded|too expensive|bad suggestion|not again)/.test(value)) {
    return "feedback";
  }

  if (/(prefer|like|love|enjoy|usually|always|need|want|budget|cheap|affordable|vegetarian|vegan|halal|allergy|quiet|walking|metro|public transport)/.test(value)) {
    return "preference";
  }

  if (/(saved|visited|went to|stayed at|staying at|home base|near my|favorite place|favourite place)/.test(value)) {
    return "place";
  }

  if (/(last trip|previous trip|last weekend|itinerary|day out|planned|plan like|route)/.test(value)) {
    return "trip";
  }

  return "conversation_note";
}

export function normalizeStoredMemory(memory = {}) {
  const text = normalizeMemoryText(memory.text);
  if (!text) throw new Error("Stored memory text is required.");

  return {
    ...memory,
    id: memory.id || createMemoryId(memory.type),
    userId: stringifyId(memory.userId),
    groupId: stringifyId(memory.groupId),
    type: normalizeMemoryType(memory.type),
    text,
    confidence: clamp(memory.confidence ?? 0.5, 0, 1),
    metadata: memory.metadata || {},
    embedding: Array.isArray(memory.embedding) ? memory.embedding.map(Number) : [],
    createdAt: toIso(memory.createdAt || new Date()),
    updatedAt: toIso(memory.updatedAt || memory.createdAt || new Date())
  };
}

function scoreMemory({
  memory,
  query,
  queryEmbedding,
  weights,
  now
}) {
  const semantic = cosineSimilarity(queryEmbedding, memory.embedding);
  const lexical = lexicalOverlapScore(query, memory.text);
  const confidence = clamp(memory.confidence ?? 0.5, 0, 1);
  const recency = recencyScore(memory.updatedAt || memory.createdAt, now);
  const score = clamp(
    semantic * weights.semanticWeight +
    lexical * weights.lexicalWeight +
    confidence * weights.confidenceWeight +
    recency * weights.recencyWeight,
    0,
    1
  );

  return {
    memory,
    score: Number(score.toFixed(3)),
    reason: buildRetrievalReason({ semantic, lexical, confidence, recency }),
    breakdown: {
      semantic: Number(semantic.toFixed(3)),
      lexical: Number(lexical.toFixed(3)),
      confidence: Number(confidence.toFixed(3)),
      recency: Number(recency.toFixed(3))
    }
  };
}

function matchesMemoryFilters(memory, filters = {}) {
  if (filters.userId && memory.userId && memory.userId !== stringifyId(filters.userId)) return false;
  if (filters.groupId && memory.groupId && memory.groupId !== stringifyId(filters.groupId)) return false;
  if (filters.minConfidence !== undefined && memory.confidence < Number(filters.minConfidence)) return false;

  const types = normalizeTypeFilter(filters.type || filters.types);
  if (types.length && !types.includes(memory.type)) return false;

  const location = normalizeText(filters.location || "");
  if (location && !normalizeText(memory.location || memory.metadata?.location || "").includes(location)) return false;

  return true;
}

function inferMemoryConfidence(type, text = "") {
  const value = normalizeText(text);
  let confidence = {
    preference: 0.68,
    trip: 0.64,
    place: 0.66,
    feedback: 0.72,
    conversation_note: 0.48
  }[type] || 0.5;

  if (/(always|never|must|need|allergy|avoid|do not suggest|don't suggest)/.test(value)) confidence += 0.12;
  if (/(maybe|might|sometimes|probably|thinking)/.test(value)) confidence -= 0.12;

  return Number(clamp(confidence, 0, 1).toFixed(2));
}

function isMemoryWorthy(sentence, inferredType) {
  const value = normalizeText(sentence);
  if (value.length < 12) return false;
  if (inferredType !== "conversation_note") return true;
  return /(remember|last time|next time|for future|from now on)/.test(value);
}

function rewriteFirstPersonMemory(sentence) {
  const clean = normalizeMemoryText(sentence);
  return clean
    .replace(/\bI am\b/g, "User is")
    .replace(/\bi am\b/g, "User is")
    .replace(/\bI'm\b/g, "User is")
    .replace(/\bi'm\b/g, "User is")
    .replace(/\bI\b/g, "User")
    .replace(/\bi\b/g, "User")
    .replace(/\bmy\b/gi, "user's")
    .replace(/\bme\b/gi, "user")
    .replace(/\bwe\b/gi, "User's group")
    .replace(/\bour\b/gi, "user group's");
}

function buildMemoryEmbeddingText(memory = {}) {
  return [
    memory.type,
    memory.text,
    memory.location,
    memory.metadata?.destination,
    memory.metadata?.budgetBand,
    memory.metadata?.budget,
    ...(Array.isArray(memory.metadata?.interests) ? memory.metadata.interests : [])
  ].filter(Boolean).join(" ");
}

function lexicalOverlapScore(left = "", right = "") {
  const leftTerms = new Set(buildSearchTerms(left));
  const rightTerms = new Set(buildSearchTerms(right));
  if (!leftTerms.size || !rightTerms.size) return 0;

  let overlap = 0;
  for (const term of leftTerms) {
    if (rightTerms.has(term)) overlap += 1;
  }

  return overlap / Math.max(1, Math.min(leftTerms.size, rightTerms.size));
}

function buildSearchTerms(text = "") {
  const tokens = tokenize(text);
  const bigrams = [];

  for (let index = 0; index < tokens.length - 1; index += 1) {
    bigrams.push(`${tokens[index]} ${tokens[index + 1]}`);
  }

  return [...tokens, ...bigrams];
}

function recencyScore(dateValue, now = new Date()) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 0.35;
  const ageDays = Math.max(0, (new Date(now) - date) / (1000 * 60 * 60 * 24));
  return Number(Math.exp(-ageDays / 90).toFixed(3));
}

function buildRetrievalReason({ semantic, lexical, confidence, recency }) {
  const [signal] = [
    ["semantic", semantic],
    ["lexical", lexical],
    ["confidence", confidence],
    ["recency", recency]
  ].sort((left, right) => right[1] - left[1]);

  return `Matched by ${signal[0]} memory signal.`;
}

function splitIntoSentences(text = "") {
  return normalizeMemoryText(text)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function normalizeMessages(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .map((message) => {
      if (typeof message === "string") {
        return { role: "user", content: message };
      }

      return {
        role: message.role || "user",
        content: message.content || message.text || ""
      };
    })
    .filter((message) => message.content);
}

function buildEmptyRetrievalResult(query, candidateCount) {
  return {
    query,
    results: [],
    stats: {
      candidateCount,
      returnedCount: 0,
      topScore: 0
    }
  };
}

function normalizeMemoryText(text = "") {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function normalizeMemoryType(type = "conversation_note") {
  const normalized = normalizeText(type).replace(/\s+/g, "_");
  return memoryTypes.includes(normalized) ? normalized : "conversation_note";
}

function normalizeTypeFilter(types = []) {
  return (Array.isArray(types) ? types : [types])
    .map(normalizeMemoryType)
    .filter(Boolean);
}

function createMemoryId(type = "memory") {
  return `mem_${normalizeMemoryType(type)}_${Date.now()}_${Math.round(Math.random() * 1000000)}`;
}

function stringifyId(value) {
  return value ? String(value) : "";
}

function toIso(value) {
  return new Date(value).toISOString();
}

function clampInteger(value, min, max) {
  return Math.min(max, Math.max(min, Math.round(Number(value) || min)));
}
