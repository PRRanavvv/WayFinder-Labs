import assert from "node:assert/strict";
import {
  buildTripDNA,
  enrichedTravelPlaces,
  explainGroupPreferenceFusion,
  explainRecommendationSelection,
  explainStableReplan,
  planDeterministicItinerary,
  replanWithStability,
  scorePlaceAgainstTripDNA
} from "../src/index.js";

const fusion = buildTripDNA({
  tripContext: {
    destination: "Rajasthan",
    days: 3,
    month: "Jan",
    groupType: "friends"
  },
  explicitPreferences: {
    interests: ["heritage", "food"],
    pace: "slow"
  },
  groupMembers: [
    {
      id: "pranav",
      name: "Pranav",
      interests: ["heritage", "food", "photography"],
      moods: ["slow", "cultural"],
      pace: "slow",
      budget: 30000
    },
    {
      id: "harsh",
      name: "Harsh",
      interests: ["nightlife", "food", "social"],
      moods: ["energetic"],
      pace: "fast",
      budget: 60000,
      avoid: ["crowds"]
    },
    {
      id: "ayushman",
      name: "Ayushman",
      interests: ["heritage", "cafes", "quiet"],
      moods: ["calm"],
      pace: "slow",
      budget: 25000,
      constraints: {
        lowFatigue: true
      }
    }
  ]
});

assert.equal(fusion.stage, "group-preference-fusion-v1");
assert.equal(fusion.inputSummary.memberCount, 3);
assert.ok(fusion.tripDNA.softPreferences.includes("heritage"));
assert.ok(fusion.tripDNA.softPreferences.includes("food"));
assert.ok(fusion.tripDNA.hardConstraints.some((constraint) => constraint.type === "budget"));
assert.ok(fusion.conflicts.some((conflict) => conflict.type === "quiet-nightlife"));
assert.ok(fusion.conflicts.some((conflict) => conflict.type === "budget-spread"));
assert.ok(fusion.fairness.representationTargets.some((target) => target.preference === "nightlife"));
assert.equal(fusion.recommendationHints.groupType, "friends");

const amberFort = enrichedTravelPlaces.find((place) => place.id === "rajasthan_001");
const placeFit = scorePlaceAgainstTripDNA(amberFort, fusion);
assert.ok(placeFit.score > 45);
assert.ok(placeFit.matchedPreferences.includes("heritage"));

const fusionExplanation = explainGroupPreferenceFusion(fusion);
assert.equal(fusionExplanation.kind, "group-preference-fusion");
assert.ok(fusionExplanation.selectedBecause.length >= 2);
assert.ok(fusionExplanation.tradeoffs.length >= 1);

const itineraryInput = {
  destination: "Kerala",
  days: 4,
  budget: 50000,
  group: {
    adults: 2,
    parents: true
  }
};
const previousItinerary = planDeterministicItinerary(itineraryInput);
const affectedDay = previousItinerary.days.find((day) => (
  day.activities.some((activity) => activity.id === "kerala_002")
))?.day;

assert.ok(affectedDay, "Expected Kerala fixture to schedule Alleppey Backwaters.");

const stableReplan = replanWithStability({
  previousItinerary,
  itineraryInput,
  changes: {
    openingHours: {
      kerala_002: {
        closed: true,
        source: "mock-places-api"
      }
    }
  }
});

assert.equal(stableReplan.stage, "stable-itinerary-replan-v1");
assert.equal(stableReplan.feasibility.valid, true);
assert.ok(stableReplan.stabilityReport.preservedActivityCount > 0);
assert.ok(stableReplan.stabilityReport.affectedDays.includes(affectedDay));
assert.equal(stableReplan.days[0].stability.preserved, affectedDay !== 1);
assert.equal(stableReplan.days[affectedDay - 1].stability.preserved, false);
assert.ok(!stableReplan.days[affectedDay - 1].activities.some((activity) => activity.id === "kerala_002"));

const stableExplanation = explainStableReplan(stableReplan);
assert.equal(stableExplanation.kind, "stable-replan");
assert.ok(stableExplanation.headline.includes("accepted places were preserved"));
assert.ok(stableExplanation.watchouts.some((item) => item.includes(String(affectedDay))));

const recommendationExplanation = explainRecommendationSelection({
  name: "Amber Fort",
  recommendationReasons: ["matches traveler preferences", "strong heritage fit"],
  recommendationBreakdown: {
    preferenceFit: 92,
    budgetFit: 82,
    groupFit: 88
  },
  groupSatisfaction: {
    conflictLevel: "medium",
    fairnessPenalty: 4,
    memberScores: [
      { memberId: "pranav", score: 95 },
      { memberId: "harsh", score: 71 },
      { memberId: "ayushman", score: 93 }
    ]
  },
  confidenceLevel: "high",
  confidenceReasons: ["strong deterministic fit"]
}, {
  tripDNA: fusion.tripDNA
});

assert.equal(recommendationExplanation.kind, "recommendation-selection");
assert.ok(recommendationExplanation.whoThisServes.some((item) => item.includes("pranav")));
assert.ok(recommendationExplanation.selectedBecause.some((item) => item.includes("heritage")));

console.log("Group intelligence tests passed");
