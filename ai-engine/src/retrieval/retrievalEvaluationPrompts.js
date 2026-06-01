const promptGroups = [
  {
    id: "romantic-trip",
    intent: "romantic trip",
    interests: ["romantic", "sunset"],
    constraints: { groupType: "couples", pace: "slow" },
    relevantSourceIds: ["goa_002", "goa_003", "kerala_002", "rajasthan_004", "andaman_001"],
    queries: [
      "romantic trip with sunsets and a slower pace",
      "peaceful couple getaway with pretty evening views",
      "honeymoon style India trip with beaches or lakes",
      "romantic place for couples without too much walking",
      "slow scenic vacation for two with sunset moments"
    ]
  },
  {
    id: "family-vacation",
    intent: "family vacation",
    interests: ["family-friendly", "culture", "nature"],
    constraints: { groupType: "family", pace: "balanced" },
    relevantSourceIds: ["kerala_003", "assam_001", "rajasthan_001", "maharashtra_002", "tamilnadu_001"],
    queries: [
      "family vacation with nature and culture",
      "places in India that work well for parents and kids",
      "safe family trip with easy sightseeing",
      "family-friendly destination with memorable views",
      "balanced trip for a multigenerational family"
    ]
  },
  {
    id: "budget-backpacking",
    intent: "budget backpacking",
    interests: ["budget", "backpacker", "solo"],
    constraints: { groupType: "solo", budgetBand: "low", pace: "flexible" },
    relevantSourceIds: ["himachal_002", "karnataka_002", "karnataka_001", "delhi_001", "himachal_001"],
    queries: [
      "budget backpacking route with hostels and nature",
      "cheap solo trip with cafes and walks",
      "backpacker places in India with low daily cost",
      "budget travel ideas for a solo traveller",
      "low-cost adventurous backpacking plan"
    ]
  },
  {
    id: "hidden-gems",
    intent: "hidden gems",
    interests: ["hidden", "offbeat", "fewer crowds"],
    constraints: { pace: "slow", crowdLevel: "low" },
    relevantSourceIds: ["goa_008", "goa_003", "meghalaya_001", "arunachal_001", "andaman_002"],
    queries: [
      "hidden gems with fewer crowds",
      "offbeat peaceful places away from tourist rush",
      "quiet India trip with local texture",
      "less crowded alternatives to famous tourist spots",
      "underrated destinations for slow travel"
    ]
  },
  {
    id: "nature-focused",
    intent: "nature focused",
    interests: ["nature", "scenic", "peaceful"],
    constraints: { pace: "balanced", energyLevel: "medium" },
    relevantSourceIds: ["kerala_003", "karnataka_003", "assam_001", "meghalaya_001", "goa_005"],
    queries: [
      "nature focused trip with green landscapes",
      "scenic India places with mountains or forests",
      "peaceful nature vacation away from big cities",
      "outdoor trip with waterfalls and hills",
      "green slow travel plan with wildlife or plantations"
    ]
  },
  {
    id: "adventure-trip",
    intent: "adventure trip",
    interests: ["adventure", "trek", "rafting"],
    constraints: { energyLevel: "high", groupType: "friends" },
    relevantSourceIds: ["uttarakhand_001", "himachal_001", "goa_005", "himachal_003", "meghalaya_001"],
    queries: [
      "adventure trip with rafting or trekking",
      "high energy group trip in India",
      "active vacation for friends with outdoor activities",
      "mountain or waterfall adventure plan",
      "trip with trekking, water sports, and big views"
    ]
  },
  {
    id: "chill-beach-low-crowd",
    intent: "chill beach with fewer crowds and good sunsets",
    interests: ["beach", "chill", "sunset", "fewer crowds"],
    constraints: { pace: "slow", crowdLevel: "low", timeOfDay: "sunset" },
    relevantSourceIds: ["goa_002", "goa_003", "kerala_001"],
    queries: [
      "I want a chill beach with fewer crowds and good sunsets",
      "quiet beach trip with sunset views and relaxed cafes",
      "less crowded beach for a calm evening",
      "peaceful beach destination for sunsets, not party scenes",
      "low crowd coastal place with a chill mood"
    ]
  },
  {
    id: "nightlife-groups",
    intent: "nightlife group trip",
    interests: ["nightlife", "party", "social"],
    constraints: { groupType: "friends", timeOfDay: "night", energyLevel: "high" },
    relevantSourceIds: ["goa_001", "goa_004", "maharashtra_001", "himachal_002"],
    queries: [
      "party destination for a friend group",
      "nightlife trip with beaches and social energy",
      "places for friends who want music and late evenings",
      "energetic group vacation with food and nightlife",
      "social India trip with night walks and bars"
    ]
  },
  {
    id: "culture-heritage",
    intent: "cultural heritage trip",
    interests: ["heritage", "culture", "architecture"],
    constraints: { pace: "balanced" },
    relevantSourceIds: ["rajasthan_001", "rajasthan_002", "kerala_004", "maharashtra_002", "tamilnadu_001"],
    queries: [
      "cultural heritage trip with architecture",
      "India itinerary focused on forts and temples",
      "historic places with strong cultural depth",
      "heritage sightseeing for first-time visitors",
      "architecture-heavy trip with old city walks"
    ]
  },
  {
    id: "low-energy",
    intent: "low energy relaxed trip",
    interests: ["low-energy", "slow", "peaceful"],
    constraints: { pace: "slow", energyLevel: "low" },
    relevantSourceIds: ["delhi_001", "kerala_002", "karnataka_003", "rajasthan_004", "goa_008"],
    queries: [
      "low energy trip without too much walking",
      "relaxed vacation with easy movement",
      "slow places for recovery and gentle sightseeing",
      "peaceful trip for tired travelers",
      "easy itinerary with cafes, gardens, and calm water"
    ]
  },
  {
    id: "cool-weather-hills",
    intent: "cool weather hills",
    interests: ["mountains", "cool weather", "scenic"],
    constraints: { weather: "cool", pace: "balanced" },
    relevantSourceIds: ["kerala_003", "karnataka_003", "himachal_003", "arunachal_001", "himachal_002"],
    queries: [
      "cool weather hill trip with scenic views",
      "mountain vacation away from heat",
      "misty hills and plantations for a quiet break",
      "cool climate India destination for nature",
      "scenic hill itinerary with cafes and viewpoints"
    ]
  },
  {
    id: "spiritual-cultural",
    intent: "spiritual cultural trip",
    interests: ["spiritual", "temple", "culture"],
    constraints: { groupType: "family", pace: "balanced" },
    relevantSourceIds: ["tamilnadu_001", "kerala_004", "rajasthan_001", "maharashtra_002", "delhi_001"],
    queries: [
      "spiritual cultural trip for a family",
      "temple and heritage focused India itinerary",
      "places with devotional energy and architecture",
      "cultural trip with temples, history, and old streets",
      "family-friendly spiritual sightseeing plan"
    ]
  },
  {
    id: "photography-sunset",
    intent: "photography and sunset",
    interests: ["photography", "sunset", "scenic"],
    constraints: { timeOfDay: "sunset" },
    relevantSourceIds: ["goa_007", "maharashtra_001", "rajasthan_004", "rajasthan_003", "andaman_001"],
    queries: [
      "best sunset photography places",
      "golden hour trip with scenic viewpoints",
      "places for photos and evening views",
      "sunset-heavy itinerary for couples and friends",
      "photogenic India spots with water or desert views"
    ]
  },
  {
    id: "food-market",
    intent: "food and market walks",
    interests: ["food", "market", "local"],
    constraints: { pace: "flexible", timeOfDay: "evening" },
    relevantSourceIds: ["goa_004", "kerala_004", "goa_001", "maharashtra_001", "goa_006"],
    queries: [
      "food and market walk with local texture",
      "places for cafes, snacks, and shopping",
      "evening plan with markets and street food",
      "local food trip that is social but easy",
      "market browsing and casual dinner ideas"
    ]
  },
  {
    id: "wildlife-nature",
    intent: "wildlife and nature",
    interests: ["wildlife", "safari", "nature"],
    constraints: { groupType: "family", energyLevel: "medium" },
    relevantSourceIds: ["assam_001", "meghalaya_001", "kerala_003", "karnataka_003", "goa_005"],
    queries: [
      "wildlife and nature trip for a family",
      "safari or forest vacation in India",
      "nature itinerary with animals and green landscapes",
      "family trip with wildlife but not too much walking",
      "outdoor vacation with safari, waterfalls, or hills"
    ]
  },
  {
    id: "solo-wellness",
    intent: "solo wellness trip",
    interests: ["solo", "wellness", "quiet"],
    constraints: { groupType: "solo", pace: "slow" },
    relevantSourceIds: ["kerala_001", "delhi_001", "arunachal_001", "goa_002", "andaman_002"],
    queries: [
      "solo wellness trip with quiet places",
      "peaceful solo travel with cafes and nature",
      "slow solo getaway for resetting",
      "safe calm places for a solo traveler",
      "quiet trip with yoga, gardens, or beaches"
    ]
  },
  {
    id: "premium-couples",
    intent: "premium couples trip",
    interests: ["romantic", "premium", "scenic"],
    constraints: { groupType: "couples", budgetBand: "premium", pace: "slow" },
    relevantSourceIds: ["rajasthan_004", "andaman_001", "kerala_002", "andaman_002", "karnataka_003"],
    queries: [
      "premium romantic trip in India",
      "couples vacation with scenic stays and slow days",
      "beautiful getaway for two with a higher budget",
      "romantic beach, lake, or backwater escape",
      "special occasion trip with calm views"
    ]
  },
  {
    id: "weekend-city-break",
    intent: "weekend city break",
    interests: ["urban", "food", "heritage"],
    constraints: { duration: "weekend", pace: "balanced" },
    relevantSourceIds: ["maharashtra_001", "delhi_001", "rajasthan_002", "kerala_004", "goa_006"],
    queries: [
      "weekend city break with heritage and food",
      "short trip with easy urban sightseeing",
      "two-day plan with cafes, walks, and landmarks",
      "city getaway that does not need a long commute",
      "quick cultural weekend with good evening options"
    ]
  },
  {
    id: "beach-activities",
    intent: "beach plus activities",
    interests: ["beach", "adventure", "cafes"],
    constraints: { pace: "balanced", energyLevel: "medium" },
    relevantSourceIds: ["goa_001", "goa_002", "karnataka_002", "kerala_001", "andaman_001"],
    queries: [
      "beach trip with activities and cafes",
      "coastal place with swimming and things to do",
      "active beach vacation without losing the relaxed mood",
      "beach destination for friends with optional adventure",
      "sunset beach plan with food and light activities"
    ]
  },
  {
    id: "winter-india",
    intent: "best winter months",
    interests: ["winter", "scenic", "family-friendly"],
    constraints: { season: "winter", pace: "balanced" },
    relevantSourceIds: ["goa_002", "rajasthan_001", "kerala_002", "andaman_001", "maharashtra_002"],
    queries: [
      "best places in India for a December trip",
      "January vacation with good weather and scenery",
      "winter family trip with beaches or heritage",
      "pleasant weather India itinerary for February",
      "where should I travel in India in winter"
    ]
  }
];

export const retrievalEvaluationPrompts = promptGroups.flatMap((group) =>
  group.queries.map((query, index) => ({
    id: `${group.id}-${String(index + 1).padStart(2, "0")}`,
    intent: group.intent,
    query,
    interests: group.interests,
    constraints: group.constraints,
    expectedPlaceIds: group.relevantSourceIds,
    minimumHits: group.minimumHits ?? Math.min(2, group.relevantSourceIds.length)
  }))
);

export const retrievalEvaluationCases = retrievalEvaluationPrompts.map((prompt) => ({
  id: prompt.id,
  query: prompt.query,
  interests: prompt.interests,
  constraints: prompt.constraints,
  relevantSourceIds: prompt.expectedPlaceIds,
  minimumHits: prompt.minimumHits
}));

export default retrievalEvaluationPrompts;
