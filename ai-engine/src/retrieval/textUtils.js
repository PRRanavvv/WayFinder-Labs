export function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token && !stopWords.has(token));
}

export function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

export function denseVectorFromText(text, { dimensions = 64 } = {}) {
  const vector = new Array(dimensions).fill(0);

  for (const token of tokenize(text)) {
    const index = Math.abs(hashToken(token)) % dimensions;
    vector[index] += 1;
  }

  return normalizeVector(vector);
}

export function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;

  const dot = a.reduce((sum, value, index) => sum + value * b[index], 0);
  const aMagnitude = Math.sqrt(a.reduce((sum, value) => sum + value ** 2, 0));
  const bMagnitude = Math.sqrt(b.reduce((sum, value) => sum + value ** 2, 0));

  if (!aMagnitude || !bMagnitude) return 0;
  return dot / (aMagnitude * bMagnitude);
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeVector(vector) {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value ** 2, 0));
  if (!magnitude) return vector;
  return vector.map((value) => Number((value / magnitude).toFixed(8)));
}

function hashToken(token) {
  let hash = 0;
  for (let index = 0; index < token.length; index += 1) {
    hash = (hash << 5) - hash + token.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}

const stopWords = new Set([
  "a",
  "an",
  "and",
  "as",
  "for",
  "from",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with"
]);
