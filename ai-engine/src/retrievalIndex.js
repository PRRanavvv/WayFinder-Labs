import { demoPlaces } from "./samplePlaces.js";

export function buildRetrievalIndex({ places = demoPlaces } = {}) {
  return places.map((place) => {
    const embeddingText = buildEmbeddingText(place);

    return {
      id: place.id,
      place,
      embeddingText,
      vector: vectorize(embeddingText),
      metadata: {
        type: place.type,
        role: place.role,
        cluster: place.cluster,
        tags: place.tags,
        dayWindows: place.dayWindows || []
      }
    };
  });
}

export function retrievePlaces({
  query = "",
  interests = [],
  constraints = {},
  places = demoPlaces,
  topK = 4
} = {}) {
  const queryText = buildQueryText({ query, interests, constraints });
  const queryVector = vectorize(queryText);

  return buildRetrievalIndex({ places })
    .map((record) => {
      const semanticScore = cosineSimilarity(queryVector, record.vector) * 100;
      const contextScore = contextualFit(record.place, { interests, constraints });
      const retrievalScore = semanticScore * 0.72 + contextScore * 0.28;

      return {
        ...record.place,
        retrievalScore: Number(retrievalScore.toFixed(2)),
        retrievalBreakdown: {
          semanticScore: Number(semanticScore.toFixed(2)),
          contextScore: Number(contextScore.toFixed(2))
        },
        retrievalReason: explainRetrieval(record.place, queryText)
      };
    })
    .sort((a, b) => b.retrievalScore - a.retrievalScore)
    .slice(0, topK);
}

export function buildEmbeddingText(place) {
  return [
    place.name,
    place.type,
    place.role,
    place.cluster,
    place.summary,
    ...(place.tags || []),
    ...(place.bestFor || []),
    ...(place.dayWindows || []),
    ...(place.retrievalTerms || [])
  ].join(" ");
}

function buildQueryText({ query, interests, constraints }) {
  return [
    query,
    ...(interests || []),
    constraints.pace,
    constraints.weather,
    constraints.groupType,
    constraints.timeOfDay,
    constraints.energyLevel
  ].join(" ");
}

function contextualFit(place, { interests, constraints }) {
  let score = 58;
  const normalizedInterests = new Set((interests || []).map(normalize));
  const placeTerms = new Set([
    place.type,
    place.role,
    ...(place.tags || []),
    ...(place.bestFor || []),
    ...(place.dayWindows || [])
  ].map(normalize));

  for (const interest of normalizedInterests) {
    if (placeTerms.has(interest)) score += 8;
  }

  if (constraints.energyLevel === "low" && place.fatigue <= 0.25) score += 18;
  if (constraints.energyLevel === "high" && place.fatigue >= 0.5) score += 10;
  if (constraints.pace === "slow" && place.role === "recovery") score += 14;
  if (constraints.weather === "indoor" && place.weatherFit >= 90) score += 12;
  if (constraints.timeOfDay && (place.dayWindows || []).map(normalize).includes(normalize(constraints.timeOfDay))) {
    score += 12;
  }

  return clamp(score, 0, 100);
}

function vectorize(text) {
  return tokenize(text).reduce((vector, token) => {
    vector[token] = (vector[token] || 0) + 1;
    return vector;
  }, {});
}

function cosineSimilarity(a, b) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (!aKeys.length || !bKeys.length) return 0;

  const dot = aKeys.reduce((sum, key) => sum + (a[key] || 0) * (b[key] || 0), 0);
  const aMagnitude = Math.sqrt(aKeys.reduce((sum, key) => sum + a[key] ** 2, 0));
  const bMagnitude = Math.sqrt(bKeys.reduce((sum, key) => sum + b[key] ** 2, 0));

  return dot / (aMagnitude * bMagnitude);
}

function explainRetrieval(place, queryText) {
  const queryTokens = new Set(tokenize(queryText));
  const matchedTerms = [...new Set(tokenize(buildEmbeddingText(place)))]
    .filter((term) => queryTokens.has(term))
    .slice(0, 4);

  if (!matchedTerms.length) {
    return `${place.name} is included as a contextual fallback for this public retrieval demo.`;
  }

  return `${place.name} matches retrieval terms: ${matchedTerms.join(", ")}.`;
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token && !stopWords.has(token));
}

const normalize = (value) => String(value || "").trim().toLowerCase();
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const stopWords = new Set([
  "a",
  "an",
  "and",
  "for",
  "of",
  "the",
  "to",
  "with"
]);
