import {
  buildItinerary,
  createLocalRetrievalPipeline,
  rankPlaces,
  updatePreferenceProfile
} from "../src/index.js";
import { demoPlaces } from "../src/samplePlaces.js";

const tripIntent = {
  query: "slow Jaipur trip with heritage, local food, photography, and recovery breaks",
  interests: ["heritage", "food", "photography"],
  constraints: {
    pace: "slow",
    energyLevel: "low",
    timeOfDay: "afternoon",
    weather: "indoor",
    groupType: "friends"
  }
};

const profile = updatePreferenceProfile(
  {
    travelStyle: {
      foodExploration: 0.66,
      heritagePreference: 0.7,
      fatigueTolerance: 0.42,
      recoveryPreference: 0.64
    },
    confidence: {
      profileConfidence: 0.35
    }
  },
  {
    type: "recovery_added",
    activityType: "food"
  }
);

const pipeline = await createLocalRetrievalPipeline();
await pipeline.indexPlaces();

const retrievedContext = await pipeline.retrieveContext({
  ...tripIntent,
  topK: 5
});

const candidatePlaceIds = new Set(retrievedContext.map((record) => record.sourceId));
const candidatePlaces = demoPlaces.filter((place) => candidatePlaceIds.has(place.id));

const rankedPlaces = rankPlaces({
  interests: tripIntent.interests,
  preferenceProfile: profile,
  places: candidatePlaces
});

console.log(JSON.stringify({
  intent: tripIntent,
  retrievedContext: retrievedContext.map((record) => ({
    id: record.id,
    sourceId: record.sourceId,
    title: record.title,
    retrievalScore: record.retrievalScore,
    retrievalConfidence: record.retrievalConfidence,
    retrievalReason: record.retrievalReason
  })),
  itinerary: buildItinerary({ rankedPlaces, days: 2 })
}, null, 2));
