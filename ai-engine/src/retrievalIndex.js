import { demoPlaces } from "./samplePlaces.js";

export function buildRetrievalIndex({ places = demoPlaces } = {}) {
  return places.map((place) => {
    const embeddingText = buildEmbeddingText(place);
    const category = categoryOf(place);

    return {
      id: idOf(place),
      place,
      embeddingText,
      vector: vectorize(embeddingText),
      metadata: {
        type: category,
        role: place.role,
        cluster: place.cluster,
        tags: place.tags,
        dayWindows: place.dayWindows || place.day_windows || [],
        mood: place.mood || [],
        idealFor: place.ideal_for || place.bestFor || [],
        budgetLevel: place.budget_level,
        crowdLevel: place.crowd_level,
        walkingRequired: place.walking_required,
        familyFriendly: place.family_friendly,
        nightlifeScore: place.nightlife_score,
        adventureScore: place.adventure_score,
        culturalScore: place.cultural_score
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
    nameOf(place),
    place.city,
    place.country,
    categoryOf(place),
    place.role,
    place.cluster,
    place.semantic_summary,
    place.summary,
    place.family_friendly ? "family friendly" : "adult oriented",
    budgetText(place.budget_level),
    crowdText(place.crowd_level),
    walkingText(place.walking_required),
    scoreText("nightlife", place.nightlife_score),
    scoreText("adventure", place.adventure_score),
    scoreText("culture", place.cultural_score),
    ...(place.tags || []),
    ...(place.mood || []),
    ...(place.ideal_for || []),
    ...(place.best_months || []),
    ...(place.bestFor || []),
    ...(place.dayWindows || place.day_windows || []),
    ...(place.retrievalTerms || place.retrieval_terms || [])
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
    constraints.energyLevel,
    constraints.budgetBand,
    constraints.crowdLevel,
    constraints.season,
    constraints.duration
  ].join(" ");
}

function contextualFit(place, { interests, constraints }) {
  let score = 58;
  const normalizedInterests = new Set((interests || []).map(normalize));
  const placeTerms = new Set([
    categoryOf(place),
    place.role,
    ...(place.tags || []),
    ...(place.mood || []),
    ...(place.ideal_for || []),
    ...(place.bestFor || []),
    ...(place.best_months || []),
    ...(place.dayWindows || place.day_windows || [])
  ].map(normalize));

  for (const interest of normalizedInterests) {
    if (placeTerms.has(interest)) score += 8;
  }

  if (constraints.energyLevel === "low" && place.fatigue <= 0.25) score += 18;
  if (constraints.energyLevel === "high" && place.fatigue >= 0.5) score += 10;
  if (constraints.pace === "slow" && place.role === "recovery") score += 14;
  if (constraints.weather === "indoor" && place.weatherFit >= 90) score += 12;
  if (constraints.budgetBand && normalize(place.costBand) === normalize(constraints.budgetBand)) score += 10;
  if (constraints.crowdLevel === "low" && place.crowd_level <= 2) score += 18;
  if (constraints.groupType && (place.ideal_for || place.bestFor || []).map(normalize).includes(normalize(constraints.groupType))) {
    score += 10;
  }
  if (constraints.timeOfDay && (place.dayWindows || place.day_windows || []).map(normalize).includes(normalize(constraints.timeOfDay))) {
    score += 12;
  }
  if (constraints.season === "winter" && (place.best_months || []).some((month) => ["nov", "dec", "jan", "feb"].includes(normalize(month)))) {
    score += 8;
  }

  return clamp(score, 0, 100);
}

function idOf(place) {
  return place.id || place.placeId;
}

function nameOf(place) {
  return place.name || place.canonicalName;
}

function categoryOf(place) {
  return place.category || place.type || place.primaryCategory;
}

function budgetText(level) {
  if (!level) return "";
  if (level <= 1) return "budget low cost cheap";
  if (level === 2) return "moderate budget";
  if (level === 3) return "upper medium budget";
  return "premium luxury higher budget";
}

function crowdText(level) {
  if (!level) return "";
  if (level <= 1) return "very low crowd hidden quiet uncrowded fewer crowds";
  if (level === 2) return "low crowd quiet fewer crowds";
  if (level === 3) return "moderate crowd";
  return "busy crowded popular high crowd";
}

function walkingText(level) {
  if (!level) return "";
  if (level <= 2) return "low walking easy movement";
  if (level === 3) return "moderate walking";
  return "high walking trek active";
}

function scoreText(label, score) {
  if (!score) return "";
  if (score >= 4) return `high ${label}`;
  if (score <= 1) return `low ${label}`;
  return `moderate ${label}`;
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
