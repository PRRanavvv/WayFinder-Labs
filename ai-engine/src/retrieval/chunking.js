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
  return {
    id: `${place.id}:overview`,
    sourceId: place.id,
    sourceType: "place",
    entityType: mapEntityType(place),
    chunkType: "overview",
    title: `${place.name} overview`,
    text: [
      place.name,
      `Destination: ${place.destination || destination}.`,
      `Type: ${place.type}.`,
      `Role: ${place.role}.`,
      `Cluster: ${place.cluster}.`,
      place.summary,
      `Best for: ${(place.bestFor || []).join(", ")}.`,
      `Tags: ${(place.tags || []).join(", ")}.`
    ].join(" "),
    metadata: buildChunkMetadata(place, destination)
  };
}

function buildLogisticsChunk(place, destination) {
  return {
    id: `${place.id}:logistics`,
    sourceId: place.id,
    sourceType: "place",
    entityType: mapEntityType(place),
    chunkType: "logistics",
    title: `${place.name} logistics`,
    text: [
      `${place.name} works as a ${place.role} stop in the ${place.cluster} cluster.`,
      `Suggested day windows: ${(place.dayWindows || []).join(", ")}.`,
      `Fatigue band: ${fatigueBand(place.fatigue)}.`,
      `Weather resilience: ${weatherFitBand(place.weatherFit)}.`,
      `Retrieval terms: ${(place.retrievalTerms || []).join(", ")}.`
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
    placeId: place.id,
    name: place.name,
    destination: place.destination || destination,
    type: place.type,
    role: place.role,
    cluster: place.cluster,
    tags: place.tags || [],
    bestFor: place.bestFor || [],
    dayWindows: place.dayWindows || [],
    costBand: place.costBand || "unknown",
    sourceVisibility: "public-demo"
  };
}

function mapEntityType(place) {
  if (place.type === "food" || (place.tags || []).includes("cafe")) return "restaurant";
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
