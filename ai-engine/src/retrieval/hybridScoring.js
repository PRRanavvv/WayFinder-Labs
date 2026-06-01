import { clamp, normalizeText, tokenize } from "./textUtils.js";

export const defaultHybridRetrievalWeights = {
  semantic: 0.4,
  metadata: 0.45,
  keyword: 0.15
};

export function scoreHybridRecord({
  record,
  query = "",
  queryText = "",
  interests = [],
  constraints = {},
  weights = defaultHybridRetrievalWeights
} = {}) {
  const semanticScore = clamp(record.similarity || 0, 0, 1);
  const keyword = keywordScore({ record, queryText });
  const metadata = metadataScore({ record, query, interests, constraints });
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
  const hybridScore = (
    semanticScore * weights.semantic +
    metadata.score * weights.metadata +
    keyword.score * weights.keyword
  ) / totalWeight;

  return {
    ...record,
    hybridScore: clamp(hybridScore, 0, 1),
    retrievalBreakdown: {
      semanticScore: Number((semanticScore * 100).toFixed(2)),
      metadataScore: Number((metadata.score * 100).toFixed(2)),
      keywordScore: Number((keyword.score * 100).toFixed(2))
    },
    retrievalReasons: metadata.reasons.length ? metadata.reasons : keyword.reasons,
    matchedSignals: {
      metadata: metadata.matchedSignals,
      keyword: keyword.matchedTokens
    }
  };
}

export function explainHybridMatch(record) {
  const reasons = record.retrievalReasons || [];
  if (!reasons.length) {
    return `${record.title} matched the semantic retrieval query.`;
  }

  return `${record.title} matched: ${reasons.slice(0, 4).join(", ")}.`;
}

function keywordScore({ record, queryText }) {
  const queryTokens = expandTokens(tokenize(queryText));
  const documentTokens = expandTokens(tokenize([
    record.title,
    record.text,
    metadataText(record.metadata)
  ].join(" ")));

  const matchedTokens = [...queryTokens].filter((token) => documentTokens.has(token));
  const score = queryTokens.size
    ? clamp(matchedTokens.length / Math.min(queryTokens.size, 12), 0, 1)
    : 0;

  return {
    score,
    matchedTokens: matchedTokens.slice(0, 8),
    reasons: matchedTokens.slice(0, 4)
  };
}

function metadataScore({ record, query, interests, constraints }) {
  const metadata = record.metadata || {};
  const recordSignals = buildRecordSignals(metadata);
  const querySignals = buildQuerySignals({ query, interests, constraints });
  const matchedSignals = [];
  const reasons = [];
  let score = 0.28;
  let possibleBoost = 0;

  for (const signal of querySignals) {
    possibleBoost += signal.weight;
    if (!recordSignals.has(signal.id)) continue;
    score += signal.weight;
    matchedSignals.push(signal.id);
    addReason(reasons, signal.reason);
  }

  if (possibleBoost > 0) {
    score = 0.2 + (score / (0.28 + possibleBoost)) * 0.8;
  }

  score += hardConstraintBoosts({ metadata, constraints, query, reasons, matchedSignals });

  return {
    score: clamp(score, 0, 1),
    reasons: reasons.slice(0, 6),
    matchedSignals
  };
}

function buildRecordSignals(metadata = {}) {
  const fields = [
    metadata.name,
    metadata.city,
    metadata.destination,
    metadata.country,
    metadata.category,
    metadata.type,
    metadata.role,
    metadata.cluster,
    metadata.costBand,
    ...(metadata.tags || []),
    ...(metadata.mood || []),
    ...(metadata.idealFor || []),
    ...(metadata.bestFor || []),
    ...(metadata.bestMonths || []),
    ...(metadata.dayWindows || [])
  ];

  const signals = expandTokens(tokenize(fields.join(" ")));

  if (metadata.familyFriendly) signals.add("family");
  if (metadata.familyFriendly) signals.add("family-friendly");
  if (metadata.budgetLevel <= 1) signals.add("budget");
  if (metadata.budgetLevel <= 1) signals.add("cheap");
  if (metadata.budgetLevel === 2) signals.add("medium-budget");
  if (metadata.budgetLevel >= 4) signals.add("premium");
  if (metadata.crowdLevel <= 2) signals.add("low-crowd");
  if (metadata.crowdLevel <= 1) signals.add("hidden");
  if (metadata.walkingRequired <= 2) signals.add("easy");
  if (metadata.walkingRequired <= 2) signals.add("low-energy");
  if (metadata.walkingRequired <= 2) signals.add("low-walking");
  if (metadata.nightlifeScore >= 4) signals.add("nightlife");
  if (metadata.adventureScore >= 4) signals.add("adventure");
  if (metadata.culturalScore >= 4) signals.add("culture");
  if (metadata.culturalScore >= 4) signals.add("heritage");

  for (const month of metadata.bestMonths || []) {
    const monthSignal = monthToSignal(month);
    if (monthSignal) signals.add(monthSignal);
  }

  if ([...winterMonthSignals].some((month) => signals.has(month))) {
    signals.add("winter");
  }

  return signals;
}

function buildQuerySignals({ query, interests = [], constraints = {} }) {
  const sourceTokens = expandTokens(tokenize([
    query,
    ...interests,
    ...Object.values(constraints || {})
  ].join(" ")));
  const signals = [];

  addSignalIf(signals, sourceTokens, ["budget", "cheap", "low-cost"], "budget", "budget-friendly", 0.11);
  addSignalIf(signals, sourceTokens, ["premium", "luxury"], "premium", "premium budget", 0.1);
  addSignalIf(signals, sourceTokens, ["romantic", "honeymoon", "couple", "couples"], "romantic", "romantic", 0.12);
  addSignalIf(signals, sourceTokens, ["family", "parents", "kids", "multigenerational"], "family", "family-friendly", 0.13);
  addSignalIf(signals, sourceTokens, ["easy", "safe", "gentle", "low-walking"], "easy", "easy sightseeing", 0.07);
  addSignalIf(signals, sourceTokens, ["low-energy", "recovery"], "low-energy", "low energy", 0.12);
  addSignalIf(signals, sourceTokens, ["hidden", "offbeat", "underrated"], "hidden", "hidden gem", 0.08);
  addSignalIf(signals, sourceTokens, ["low-crowd", "quiet", "peaceful", "uncrowded"], "low-crowd", "low crowd", 0.12);
  addSignalIf(signals, sourceTokens, ["beach", "coastal", "coast"], "beach", "beach", 0.11);
  addSignalIf(signals, sourceTokens, ["sunset", "golden-hour"], "sunset", "sunset", 0.11);
  addSignalIf(signals, sourceTokens, ["photography", "photogenic", "photo"], "photography", "photography", 0.1);
  addSignalIf(signals, sourceTokens, ["nightlife", "party", "bars"], "nightlife", "nightlife", 0.12);
  addSignalIf(signals, sourceTokens, ["adventure", "active", "trek", "rafting"], "adventure", "adventure", 0.12);
  addSignalIf(signals, sourceTokens, ["nature", "green", "forest", "wildlife"], "nature", "nature", 0.11);
  addSignalIf(signals, sourceTokens, ["hill", "hills", "mountain", "mountains", "cool", "climate"], "mountain", "cool hills", 0.12);
  addSignalIf(signals, sourceTokens, ["heritage", "historic", "history", "architecture", "old-city"], "heritage", "heritage", 0.12);
  addSignalIf(signals, sourceTokens, ["culture", "cultural", "temple", "spiritual"], "culture", "culture", 0.11);
  addSignalIf(signals, sourceTokens, ["food", "foodie", "market", "cafes", "snacks"], "food", "food and markets", 0.14);
  addSignalIf(signals, sourceTokens, ["solo", "wellness", "yoga"], "solo", "solo/wellness fit", 0.08);
  addSignalIf(signals, sourceTokens, ["winter", "december", "january", "february", "november"], "winter", "winter season", 0.14);

  for (const [token, signal] of monthAliases) {
    if (sourceTokens.has(token)) {
      signals.push({ id: signal, reason: token, weight: 0.12 });
    }
  }

  return dedupeSignals(signals);
}

function hardConstraintBoosts({ metadata, constraints = {}, query, reasons, matchedSignals }) {
  let boost = 0;
  const normalizedQuery = normalizeText(query);

  if (constraints.groupType && matchesAny(metadata.idealFor || metadata.bestFor, [constraints.groupType])) {
    boost += 0.08;
    matchedSignals.push(`group:${constraints.groupType}`);
    addReason(reasons, `${constraints.groupType} fit`);
  }

  if (constraints.crowdLevel === "low" && metadata.crowdLevel <= 2) {
    boost += 0.1;
    matchedSignals.push("constraint:low-crowd");
    addReason(reasons, "low crowd");
  }

  if (constraints.budgetBand && normalizeText(metadata.costBand) === normalizeText(constraints.budgetBand)) {
    boost += 0.08;
    matchedSignals.push(`budget:${metadata.costBand}`);
    addReason(reasons, `${metadata.costBand} budget`);
  }

  if (constraints.season === "winter" && hasWinterMonth(metadata.bestMonths)) {
    boost += 0.12;
    matchedSignals.push("constraint:winter");
    addReason(reasons, "best in winter");
  }

  if (constraints.energyLevel === "low" && metadata.walkingRequired <= 2) {
    boost += 0.08;
    matchedSignals.push("constraint:low-energy");
    addReason(reasons, "low walking");
  }

  if (normalizedQuery.includes("december") && matchesAny(metadata.bestMonths, ["Dec"])) {
    boost += 0.1;
    matchedSignals.push("month:dec");
    addReason(reasons, "December fit");
  }

  if (normalizedQuery.includes("january") && matchesAny(metadata.bestMonths, ["Jan"])) {
    boost += 0.1;
    matchedSignals.push("month:jan");
    addReason(reasons, "January fit");
  }

  if (normalizedQuery.includes("february") && matchesAny(metadata.bestMonths, ["Feb"])) {
    boost += 0.1;
    matchedSignals.push("month:feb");
    addReason(reasons, "February fit");
  }

  return boost;
}

function metadataText(metadata = {}) {
  return [
    metadata.name,
    metadata.destination,
    metadata.category,
    metadata.type,
    metadata.role,
    metadata.cluster,
    metadata.costBand,
    ...(metadata.tags || []),
    ...(metadata.mood || []),
    ...(metadata.idealFor || []),
    ...(metadata.bestMonths || []),
    ...(metadata.dayWindows || [])
  ].join(" ");
}

function expandTokens(tokens) {
  const expanded = new Set();

  for (const token of tokens) {
    const normalized = normalizeToken(token);
    if (!normalized) continue;
    expanded.add(normalized);

    for (const synonym of synonymMap[normalized] || []) {
      expanded.add(synonym);
    }
  }

  return expanded;
}

function addSignalIf(signals, tokens, tokenOptions, id, reason, weight) {
  if (!tokenOptions.some((token) => tokens.has(token))) return;
  signals.push({ id, reason, weight });
}

function dedupeSignals(signals) {
  const byId = new Map();

  for (const signal of signals) {
    const existing = byId.get(signal.id);
    if (!existing || signal.weight > existing.weight) byId.set(signal.id, signal);
  }

  return [...byId.values()];
}

function matchesAny(values = [], expected = []) {
  const normalizedValues = new Set(values.map(normalizeText));
  return expected.some((value) => normalizedValues.has(normalizeText(value)));
}

function hasWinterMonth(months = []) {
  return months.map(monthToSignal).some((month) => winterMonthSignals.has(month));
}

function monthToSignal(month) {
  return monthAliases.get(normalizeToken(month));
}

function addReason(reasons, reason) {
  if (reason && !reasons.includes(reason)) reasons.push(reason);
}

function normalizeToken(token) {
  return normalizeText(token).replace(/_/g, "-");
}

const monthAliases = new Map([
  ["nov", "nov"],
  ["november", "nov"],
  ["dec", "dec"],
  ["december", "dec"],
  ["jan", "jan"],
  ["january", "jan"],
  ["feb", "feb"],
  ["february", "feb"],
  ["mar", "mar"],
  ["march", "mar"],
  ["apr", "apr"],
  ["april", "apr"],
  ["may", "may"],
  ["jun", "jun"],
  ["june", "jun"],
  ["sep", "sep"],
  ["september", "sep"],
  ["oct", "oct"],
  ["october", "oct"]
]);

const winterMonthSignals = new Set(["nov", "dec", "jan", "feb"]);

const synonymMap = {
  affordable: ["budget", "cheap"],
  cheap: ["budget", "low-cost"],
  low: ["low-crowd", "low-walking"],
  cost: ["budget"],
  december: ["dec", "winter"],
  january: ["jan", "winter"],
  february: ["feb", "winter"],
  november: ["nov", "winter"],
  winter: ["nov", "dec", "jan", "feb"],
  couple: ["couples", "romantic"],
  honeymoon: ["romantic", "couples"],
  parents: ["family"],
  kids: ["family"],
  children: ["family"],
  multigenerational: ["family"],
  safe: ["family", "easy"],
  gentle: ["easy", "low-walking"],
  relaxed: ["slow", "peaceful"],
  recovery: ["low-energy", "easy"],
  quiet: ["low-crowd", "peaceful"],
  uncrowded: ["low-crowd"],
  fewer: ["low-crowd"],
  crowds: ["low-crowd"],
  offbeat: ["hidden"],
  underrated: ["hidden"],
  local: [],
  coast: ["beach"],
  coastal: ["beach"],
  golden: ["sunset", "golden-hour"],
  hour: ["golden-hour"],
  photo: ["photography"],
  photos: ["photography"],
  photogenic: ["photography"],
  bars: ["nightlife"],
  party: ["nightlife"],
  trekking: ["trek", "adventure"],
  trek: ["adventure"],
  rafting: ["adventure"],
  active: ["adventure"],
  waterfall: ["waterfalls", "nature"],
  waterfalls: ["waterfall", "nature"],
  hill: ["mountain", "nature"],
  hills: ["mountain", "nature"],
  mountain: ["hills", "nature"],
  mountains: ["mountain", "hills", "nature"],
  cool: ["mountain", "hills"],
  climate: ["weather"],
  historic: ["heritage", "culture"],
  history: ["heritage", "culture"],
  architecture: ["heritage", "culture"],
  cultural: ["culture", "heritage"],
  temple: ["culture", "heritage"],
  spiritual: ["culture"],
  cafes: ["food"],
  cafe: ["food"],
  foodie: ["food"],
  snacks: ["food"],
  market: ["food", "shopping"],
  safari: ["wildlife", "nature"],
  wildlife: ["nature"],
  yoga: ["wellness"],
  wellness: ["solo", "peaceful"],
  city: ["urban"],
  urban: ["city"]
};
