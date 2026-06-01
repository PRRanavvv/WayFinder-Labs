import { normalizeText, tokenize } from "./textUtils.js";

export function extractTravelIntent({ query = "", interests = [], constraints = {} } = {}) {
  const text = [query, ...interests, ...Object.values(constraints || {})].join(" ");
  const tokens = new Set(tokenize(text));
  const month = extractMonth(tokens);
  const season = constraints.season || extractSeason(tokens, month);
  const tripType = constraints.groupType || extractTripType(tokens);
  const budget = constraints.budgetBand || extractBudget(tokens);
  const vibe = extractVibe(tokens);
  const climatePreference = extractClimatePreference(tokens);
  const activityIntent = extractActivityIntent(tokens);
  const excludedDestinations = extractExcludedDestinations(text);

  return {
    trip_type: tripType,
    season,
    month,
    budget,
    vibe,
    climate_preference: climatePreference,
    activity_intent: activityIntent,
    excluded_destinations: excludedDestinations,
    groupType: tripType,
    budgetBand: budget,
    expandedInterests: unique([
      ...interests,
      tripType,
      season,
      month,
      budget,
      vibe,
      climatePreference,
      activityIntent
    ]),
    excludedDestinations
  };
}

export function mergeIntentIntoRetrievalInput({ query = "", interests = [], constraints = {} } = {}) {
  const intent = extractTravelIntent({ query, interests, constraints });

  return {
    intent,
    interests: intent.expandedInterests,
    constraints: {
      ...constraints,
      ...(intent.groupType ? { groupType: intent.groupType } : {}),
      ...(intent.season ? { season: intent.season } : {}),
      ...(intent.month ? { month: intent.month } : {}),
      ...(intent.budgetBand ? { budgetBand: intent.budgetBand } : {}),
      ...(intent.vibe ? { vibe: intent.vibe } : {}),
      ...(intent.climate_preference ? { climatePreference: intent.climate_preference } : {}),
      ...(intent.activity_intent ? { activityIntent: intent.activity_intent } : {}),
      ...(intent.excludedDestinations?.length ? { excludedDestinations: intent.excludedDestinations } : {})
    }
  };
}

function extractMonth(tokens) {
  for (const [token, month] of monthAliases) {
    if (tokens.has(token)) return month;
  }

  return null;
}

function extractSeason(tokens, month) {
  if (tokens.has("winter")) return "winter";
  if (tokens.has("summer")) return "summer";
  if (tokens.has("monsoon") || tokens.has("rainy")) return "monsoon";
  if (["nov", "dec", "jan", "feb"].includes(month)) return "winter";
  if (["mar", "apr", "may", "jun"].includes(month)) return "summer";
  return null;
}

function extractTripType(tokens) {
  if (hasAny(tokens, ["family", "parents", "kids", "children", "multigenerational"])) return "family";
  if (hasAny(tokens, ["couple", "couples", "romantic", "honeymoon"])) return "couples";
  if (hasAny(tokens, ["friends", "group", "groups"])) return "friends";
  if (hasAny(tokens, ["solo", "alone"])) return "solo";
  return null;
}

function extractBudget(tokens) {
  if (hasAny(tokens, ["cheap", "budget", "affordable", "low-cost"])) return "low";
  if (hasAny(tokens, ["medium", "moderate", "mid"])) return "medium";
  if (hasAny(tokens, ["premium", "luxury", "high-end"])) return "premium";
  return null;
}

function extractVibe(tokens) {
  if (hasAny(tokens, ["relaxed", "slow", "peaceful", "quiet", "calm"])) return "relaxed";
  if (hasAny(tokens, ["party", "nightlife", "energetic", "social"])) return "energetic";
  if (hasAny(tokens, ["romantic", "honeymoon"])) return "romantic";
  if (hasAny(tokens, ["hidden", "offbeat", "underrated"])) return "hidden";
  if (hasAny(tokens, ["adventure", "active", "trek", "rafting"])) return "adventurous";
  return null;
}

function extractClimatePreference(tokens) {
  if (hasAny(tokens, ["cool", "cold", "hill", "hills", "mountain", "mountains", "pleasant"])) return "cool";
  if (hasAny(tokens, ["warm", "beach", "coastal", "winter-sun"])) return "warm";
  return null;
}

function extractActivityIntent(tokens) {
  if (hasAny(tokens, ["beach", "coast", "coastal"])) return "beach";
  if (hasAny(tokens, ["heritage", "historic", "history", "architecture", "temple"])) return "heritage";
  if (hasAny(tokens, ["nature", "green", "forest", "wildlife", "waterfall"])) return "nature";
  if (hasAny(tokens, ["food", "market", "cafe", "cafes", "vegetarian", "veg"])) return "food";
  if (hasAny(tokens, ["photography", "photo", "photos", "sunset"])) return "photography";
  return null;
}

function extractExcludedDestinations(text) {
  const normalized = normalizeText(text);
  const excluded = [];

  for (const destination of knownDestinations) {
    const destinationText = normalizeText(destination);
    if (!normalized.includes(destinationText)) continue;

    const exclusionPattern = new RegExp(`(not|no|avoid|skip|except|done|already|bored of|fatigue|overdone).{0,30}${destinationText}|${destinationText}.{0,30}(again|twice|done|fatigue|overdone)`, "i");
    if (exclusionPattern.test(normalized)) excluded.push(destination);
  }

  return excluded;
}

function hasAny(tokens, values) {
  return values.some((value) => tokens.has(normalizeText(value)));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

const monthAliases = new Map([
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
  ["jul", "jul"],
  ["july", "jul"],
  ["aug", "aug"],
  ["august", "aug"],
  ["sep", "sep"],
  ["september", "sep"],
  ["oct", "oct"],
  ["october", "oct"],
  ["nov", "nov"],
  ["november", "nov"],
  ["dec", "dec"],
  ["december", "dec"]
]);

const knownDestinations = [
  "Goa",
  "Varkala",
  "Alleppey",
  "Munnar",
  "Kochi",
  "Wayanad",
  "Jaipur",
  "Jaisalmer",
  "Udaipur",
  "Hampi",
  "Gokarna",
  "Coorg",
  "Mumbai",
  "Delhi",
  "Manali",
  "Kasol",
  "Rishikesh"
];
