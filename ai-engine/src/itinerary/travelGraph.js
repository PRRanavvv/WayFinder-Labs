import { normalizeText } from "../retrieval/textUtils.js";

export const destinationRegionProfiles = {
  kerala: {
    name: "Kerala",
    gatewayLocation: "Kochi",
    locations: ["Kochi", "Munnar", "Alleppey", "Varkala", "Wayanad"],
    corridorOrder: ["Kochi", "Munnar", "Alleppey", "Varkala", "Wayanad"],
    coordinates: {
      Kochi: { lat: 9.93, lng: 76.27 },
      Munnar: { lat: 10.09, lng: 77.06 },
      Alleppey: { lat: 9.5, lng: 76.34 },
      Varkala: { lat: 8.74, lng: 76.72 },
      Wayanad: { lat: 11.69, lng: 76.13 }
    },
    travelMinutes: {
      "Kochi::Munnar": 240,
      "Kochi::Alleppey": 95,
      "Kochi::Varkala": 260,
      "Kochi::Wayanad": 360,
      "Munnar::Alleppey": 270,
      "Munnar::Varkala": 330,
      "Munnar::Wayanad": 420,
      "Alleppey::Varkala": 180,
      "Alleppey::Wayanad": 450,
      "Varkala::Wayanad": 540
    }
  },
  goa: {
    name: "Goa",
    gatewayLocation: "Goa",
    locations: ["Goa"],
    corridorOrder: ["Goa"],
    coordinates: {
      Goa: { lat: 15.5, lng: 73.83 }
    },
    travelMinutes: {}
  },
  rajasthan: {
    name: "Rajasthan",
    gatewayLocation: "Jaipur",
    locations: ["Jaipur", "Udaipur", "Jaisalmer"],
    corridorOrder: ["Jaipur", "Udaipur", "Jaisalmer"],
    coordinates: {
      Jaipur: { lat: 26.91, lng: 75.79 },
      Udaipur: { lat: 24.59, lng: 73.71 },
      Jaisalmer: { lat: 26.92, lng: 70.92 }
    },
    travelMinutes: {
      "Jaipur::Udaipur": 430,
      "Jaipur::Jaisalmer": 560,
      "Udaipur::Jaisalmer": 500
    }
  },
  karnataka: {
    name: "Karnataka",
    gatewayLocation: "Hampi",
    locations: ["Hampi", "Gokarna", "Coorg"],
    corridorOrder: ["Hampi", "Gokarna", "Coorg"],
    coordinates: {
      Hampi: { lat: 15.34, lng: 76.46 },
      Gokarna: { lat: 14.55, lng: 74.32 },
      Coorg: { lat: 12.42, lng: 75.74 }
    },
    travelMinutes: {
      "Hampi::Gokarna": 390,
      "Hampi::Coorg": 470,
      "Gokarna::Coorg": 360
    }
  }
};

export function resolveDestinationProfile(destination) {
  const normalized = normalizeText(destination);
  return destinationRegionProfiles[normalized] || null;
}

export function placeMatchesDestination(place, destination) {
  const normalizedDestination = normalizeText(destination);
  const profile = resolveDestinationProfile(destination);
  const placeLocation = place.routeLocation || place.city || place.destination;

  if (profile) {
    return profile.locations.map(normalizeText).includes(normalizeText(placeLocation))
      || normalizeText(place.region) === normalizedDestination
      || normalizeText(place.state) === normalizedDestination;
  }

  return [
    place.name,
    place.city,
    place.destination,
    place.region,
    place.state
  ].some((value) => normalizeText(value) === normalizedDestination);
}

export function optimizeRouteOrder(locations = [], { destination, startLocation } = {}) {
  const uniqueLocations = [...new Set(locations.filter(Boolean))];
  if (uniqueLocations.length <= 1) return uniqueLocations;

  const profile = resolveDestinationProfile(destination);
  if (profile?.corridorOrder?.length) {
    return [...uniqueLocations].sort((a, b) => {
      const aIndex = corridorIndex(profile, a);
      const bIndex = corridorIndex(profile, b);
      if (aIndex !== bIndex) return aIndex - bIndex;
      return a.localeCompare(b);
    });
  }

  return nearestNeighborOrder(uniqueLocations, {
    profile,
    startLocation: startLocation || profile?.gatewayLocation || uniqueLocations[0]
  });
}

export function estimateTravelMinutes(fromLocation, toLocation, { destination } = {}) {
  if (!fromLocation || !toLocation || fromLocation === toLocation) return 0;

  const profile = resolveDestinationProfile(destination);
  const graphMinutes = profile ? lookupGraphMinutes(profile, fromLocation, toLocation) : null;
  if (graphMinutes !== null) return graphMinutes;

  const fromCoordinates = profile?.coordinates?.[fromLocation];
  const toCoordinates = profile?.coordinates?.[toLocation];
  if (fromCoordinates && toCoordinates) {
    return Math.round(haversineKilometers(fromCoordinates, toCoordinates) * 2.4);
  }

  return 75;
}

function corridorIndex(profile, location) {
  const index = profile.corridorOrder.map(normalizeText).indexOf(normalizeText(location));
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function nearestNeighborOrder(locations, { profile, startLocation }) {
  const remaining = new Set(locations);
  const order = [];
  let current = remaining.has(startLocation) ? startLocation : locations[0];

  while (remaining.size > 0) {
    order.push(current);
    remaining.delete(current);
    current = [...remaining].sort((a, b) => (
      estimateTravelMinutes(current, a, { destination: profile?.name })
      - estimateTravelMinutes(current, b, { destination: profile?.name })
    ))[0];
  }

  return order;
}

function lookupGraphMinutes(profile, fromLocation, toLocation) {
  const direct = `${fromLocation}::${toLocation}`;
  const reverse = `${toLocation}::${fromLocation}`;
  return profile.travelMinutes[direct] ?? profile.travelMinutes[reverse] ?? null;
}

function haversineKilometers(a, b) {
  const earthRadius = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const latA = toRadians(a.lat);
  const latB = toRadians(b.lat);
  const angle = Math.sin(dLat / 2) ** 2
    + Math.cos(latA) * Math.cos(latB) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(angle));
}

function toRadians(value) {
  return value * Math.PI / 180;
}
