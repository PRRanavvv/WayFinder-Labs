export function buildItinerary({ destination = "Jaipur", rankedPlaces = [], days = 2 } = {}) {
  const lanes = Array.from({ length: days }, (_, index) => ({
    day: index + 1,
    title: `Day ${index + 1}`,
    activities: []
  }));

  rankedPlaces.slice(0, days * 3).forEach((place, index) => {
    const lane = lanes[index % days];
    lane.activities.push({
      time: ["09:00", "13:00", "17:30"][lane.activities.length] || "Flexible",
      title: place.name,
      cluster: place.cluster,
      role: place.role,
      score: place.score,
      explanation: place.explanation
    });
  });

  return {
    destination,
    generatedAt: new Date().toISOString(),
    days: lanes,
    notes: [
      "Public demo itinerary generated from non-sensitive sample data.",
      "Production optimization logic and private datasets are intentionally excluded."
    ]
  };
}

