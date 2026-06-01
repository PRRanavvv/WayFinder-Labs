import { demoPlaces } from "../samplePlaces.js";

export const supportedEntityTypes = [
  "destination",
  "attraction",
  "restaurant",
  "transport",
  "activity",
  "itinerary"
];

export function buildTravelMetadataChunks({ places = demoPlaces, destination = "Jaipur" } = {}) {
  return places.flatMap((place) => [
    buildOverviewChunk(place, destination),
    buildLogisticsChunk(place, destination)
  ]);
}

export function validateChunks(chunks) {
  const errors = [];
  const seenIds = new Set();

  for (const chunk of chunks) {
    if (!chunk.id) errors.push("Chunk is missing id");
    if (seenIds.has(chunk.id)) errors.push(`Duplicate chunk id: ${chunk.id}`);
    if (!chunk.text || chunk.text.length < 40) errors.push(`Chunk ${chunk.id} has insufficient text`);
    if (!supportedEntityTypes.includes(chunk.entityType)) {
      errors.push(`Chunk ${chunk.id} has unsupported entity type: ${chunk.entityType}`);
    }
    if (!chunk.metadata?.destination) errors.push(`Chunk ${chunk.id} is missing destination metadata`);
    seenIds.add(chunk.id);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function buildOverviewChunk(place, destination) {
  const name = nameOf(place);
  const placeId = idOf(place);
  const resolvedDestination = place.destination || place.city || destination;

  return {
    id: `${placeId}:overview`,
    sourceId: placeId,
    sourceType: "place",
    entityType: mapEntityType(place),
    chunkType: "overview",
    title: `${name} overview`,
    text: [
      name,
      `Destination: ${resolvedDestination}.`,
      `Country: ${place.country || "unknown"}.`,
      `Category: ${categoryOf(place)}.`,
      `Role: ${place.role}.`,
      `Cluster: ${place.cluster}.`,
      place.semantic_summary,
      place.summary,
      `Mood: ${(place.mood || []).join(", ")}.`,
      `Ideal for: ${(place.ideal_for || place.bestFor || []).join(", ")}.`,
      `Best months: ${(place.best_months || []).join(", ")}.`,
      `Average monthly temperature: ${formatMonthlyTemps(place.avg_temp_monthly)}.`,
      `Peak season: ${(place.peak_season || []).join(", ")}.`,
      `Monsoon months: ${(place.monsoon_months || []).join(", ")}.`,
      `Climate tags: ${(place.climate_tags || []).join(", ")}.`,
      `Scores: nightlife ${place.nightlife_score ?? "unknown"}, adventure ${place.adventure_score ?? "unknown"}, culture ${place.cultural_score ?? "unknown"}.`,
      `Tags: ${(place.tags || []).join(", ")}.`,
      `Retrieval terms: ${(place.retrievalTerms || place.retrieval_terms || []).join(", ")}.`
    ].join(" "),
    metadata: buildChunkMetadata(place, destination)
  };
}

function buildLogisticsChunk(place, destination) {
  const name = nameOf(place);
  const placeId = idOf(place);

  return {
    id: `${placeId}:logistics`,
    sourceId: placeId,
    sourceType: "place",
    entityType: mapEntityType(place),
    chunkType: "logistics",
    title: `${name} logistics`,
    text: [
      `${name} works as a ${place.role} stop in the ${place.cluster} cluster.`,
      `Suggested day windows: ${(place.dayWindows || place.day_windows || []).join(", ")}.`,
      `Visit duration: ${place.visit_duration_hours || place.durationMinutes / 60 || "unknown"} hours.`,
      `Budget level: ${place.budget_level ?? "unknown"}; cost band: ${place.costBand || "unknown"}.`,
      `Crowd level: ${place.crowd_level ?? "unknown"}; walking required: ${place.walking_required ?? "unknown"}.`,
      `Family friendly: ${place.family_friendly === undefined ? "unknown" : place.family_friendly}.`,
      `Fatigue band: ${fatigueBand(place.fatigue)}.`,
      `Weather resilience: ${weatherFitBand(place.weatherFit)}.`,
      `Retrieval terms: ${(place.retrievalTerms || place.retrieval_terms || []).join(", ")}.`
    ].join(" "),
    metadata: {
      ...buildChunkMetadata(place, destination),
      fatigueBand: fatigueBand(place.fatigue),
      weatherFitBand: weatherFitBand(place.weatherFit)
    }
  };
}

function buildChunkMetadata(place, destination) {
  return {
    placeId: idOf(place),
    name: nameOf(place),
    city: place.city,
    country: place.country,
    destination: place.destination || place.city || destination,
    category: categoryOf(place),
    type: place.type || categoryOf(place),
    role: place.role,
    cluster: place.cluster,
    tags: place.tags || [],
    mood: place.mood || [],
    idealFor: place.ideal_for || place.bestFor || [],
    bestFor: place.bestFor || place.ideal_for || [],
    bestMonths: place.best_months || [],
    avgTempMonthly: place.avg_temp_monthly || {},
    peakSeason: place.peak_season || [],
    monsoonMonths: place.monsoon_months || [],
    climateTags: place.climate_tags || [],
    seasonalNotes: place.seasonal_notes || [],
    dayWindows: place.dayWindows || place.day_windows || [],
    budgetLevel: place.budget_level,
    costBand: place.costBand || "unknown",
    visitDurationHours: place.visit_duration_hours,
    crowdLevel: place.crowd_level,
    walkingRequired: place.walking_required,
    familyFriendly: place.family_friendly,
    nightlifeScore: place.nightlife_score,
    adventureScore: place.adventure_score,
    culturalScore: place.cultural_score,
    sourceVisibility: place.sourceVisibility || "public-demo"
  };
}

function mapEntityType(place) {
  const category = categoryOf(place);
  if (category === "food" || (place.tags || []).includes("cafe")) return "restaurant";
  if (place.role === "visual" || place.role === "anchor") return "attraction";
  return "activity";
}

function fatigueBand(fatigue = 0) {
  if (fatigue <= 0.25) return "low";
  if (fatigue <= 0.6) return "medium";
  return "high";
}

function weatherFitBand(weatherFit = 0) {
  if (weatherFit >= 90) return "high";
  if (weatherFit >= 70) return "medium";
  return "low";
}

function idOf(place) {
  return place.id || place.placeId;
}

function nameOf(place) {
  return place.name || place.canonicalName;
}

function categoryOf(place) {
  return String(place.category || place.type || place.primaryCategory || "activity").toLowerCase();
}

function formatMonthlyTemps(monthlyTemps = {}) {
  return Object.entries(monthlyTemps)
    .map(([month, temp]) => `${month}:${temp}C`)
    .join(", ");
}
