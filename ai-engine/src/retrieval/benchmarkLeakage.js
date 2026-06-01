import { enrichedTravelPlaces } from "../datasets/enrichedPlaces.js";
import { normalizeText, tokenize } from "./textUtils.js";

export function analyzeBenchmarkLeakage({
  prompts,
  places = enrichedTravelPlaces
} = {}) {
  const placeLookup = new Map(places.map((place) => [place.id, place]));
  const promptReports = prompts.map((prompt) => analyzePromptLeakage(prompt, placeLookup));
  const exactDestinationLeakCount = promptReports.filter((report) => report.exactDestinationLeaks.length).length;
  const exactPlaceLeakCount = promptReports.filter((report) => report.exactPlaceLeaks.length).length;
  const contradictionCount = promptReports.filter((report) => report.contradictions.length).length;
  const messySignalCount = promptReports.filter((report) => report.messySignals.length).length;

  return {
    promptCount: prompts.length,
    exactDestinationLeakCount,
    exactPlaceLeakCount,
    leakageFree: exactDestinationLeakCount === 0 && exactPlaceLeakCount === 0,
    contradictionCount,
    messySignalCount,
    synonymCoverage: summarizeSynonymCoverage(promptReports),
    reports: promptReports
  };
}

function analyzePromptLeakage(prompt, placeLookup) {
  const normalizedQuery = normalizeText(prompt.query);
  const queryTokens = new Set(tokenize(prompt.query));
  const expectedPlaces = (prompt.expectedPlaceIds || prompt.relevantSourceIds || [])
    .map((id) => placeLookup.get(id))
    .filter(Boolean);
  const exactPlaceLeaks = expectedPlaces
    .filter((place) => normalizedQuery.includes(normalizeText(place.name)))
    .map((place) => place.name);
  const exactDestinationLeaks = expectedPlaces
    .filter((place) => normalizedQuery.includes(normalizeText(place.city)))
    .map((place) => place.city);

  return {
    id: prompt.id,
    query: prompt.query,
    exactPlaceLeaks: [...new Set(exactPlaceLeaks)],
    exactDestinationLeaks: [...new Set(exactDestinationLeaks)],
    contradictions: detectContradictions(queryTokens),
    messySignals: detectMessySignals(queryTokens),
    synonymFamilies: detectSynonymFamilies(queryTokens)
  };
}

function detectContradictions(tokens) {
  const contradictions = [];
  if (hasAny(tokens, ["party", "nightlife", "bars"]) && hasAny(tokens, ["quiet", "calm", "peaceful"])) {
    contradictions.push("nightlife_vs_quiet");
  }
  if (hasAny(tokens, ["beach", "coastal"]) && hasAny(tokens, ["cool", "not", "hot", "heat"])) {
    contradictions.push("beach_vs_heat_sensitive");
  }
  if (hasAny(tokens, ["budget", "cheap", "broke"]) && hasAny(tokens, ["premium", "luxury"])) {
    contradictions.push("budget_vs_premium");
  }
  if (hasAny(tokens, ["parents", "elder", "grandma", "tired"]) && hasAny(tokens, ["trek", "hike", "adventure"])) {
    contradictions.push("low_energy_vs_adventure");
  }
  return contradictions;
}

function detectMessySignals(tokens) {
  const signals = [];
  if (hasAny(tokens, ["hate", "avoid", "skip", "not", "no"])) signals.push("negative_preference");
  if (hasAny(tokens, ["already", "twice", "again", "done", "bored"])) signals.push("repeat_traveler");
  if (hasAny(tokens, ["girlfriend", "partner", "mom", "dad", "parents", "grandma"])) signals.push("relationship_context");
  if (hasAny(tokens, ["vegetarian", "veg", "picky"])) signals.push("dietary_context");
  if (hasAny(tokens, ["30k", "budget", "broke", "cheap"])) signals.push("budget_context");
  if (hasAny(tokens, ["june", "may", "december", "january", "february"])) signals.push("temporal_context");
  return signals;
}

function detectSynonymFamilies(tokens) {
  const families = [];
  for (const [family, values] of Object.entries(synonymFamilies)) {
    if (hasAny(tokens, values)) families.push(family);
  }
  return families;
}

function summarizeSynonymCoverage(promptReports) {
  const counts = {};
  for (const report of promptReports) {
    for (const family of report.synonymFamilies) {
      counts[family] = (counts[family] || 0) + 1;
    }
  }
  return counts;
}

function hasAny(tokens, values) {
  return values.some((value) => tokens.has(normalizeText(value)));
}

const synonymFamilies = {
  lowCrowd: ["quiet", "calm", "peaceful", "crowded", "crowds", "chaos"],
  lowEnergy: ["tired", "knee", "elder", "parents", "slow", "rest"],
  budget: ["budget", "cheap", "broke", "affordable", "30k"],
  photography: ["photographer", "photos", "reels", "camera", "golden"],
  climate: ["hot", "heat", "cool", "june", "may", "pleasant"],
  exclusion: ["already", "twice", "again", "skip", "avoid", "done"],
  romance: ["girlfriend", "partner", "romantic", "anniversary", "cute"],
  food: ["vegetarian", "veg", "food", "snacks", "cafes"],
  contradiction: ["but", "also", "mixed", "one", "two"]
};
