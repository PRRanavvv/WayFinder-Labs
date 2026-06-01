const coastalTropical = {
  avg_temp_monthly: { jan: 27, feb: 28, mar: 30, apr: 32, may: 33, jun: 29, jul: 28, aug: 28, sep: 28, oct: 29, nov: 28, dec: 27 },
  peak_season: ["nov", "dec", "jan", "feb"],
  monsoon_months: ["jun", "jul", "aug", "sep"],
  climate_tags: ["warm", "coastal", "winter_escape"]
};

const westernGhatsCool = {
  avg_temp_monthly: { jan: 17, feb: 18, mar: 21, apr: 23, may: 24, jun: 21, jul: 20, aug: 20, sep: 20, oct: 20, nov: 18, dec: 17 },
  peak_season: ["oct", "nov", "dec", "jan", "feb", "mar", "may"],
  monsoon_months: ["jun", "jul", "aug", "sep"],
  climate_tags: ["cool", "hills", "green", "misty"]
};

const rajasthanWinter = {
  avg_temp_monthly: { jan: 16, feb: 20, mar: 25, apr: 30, may: 34, jun: 35, jul: 32, aug: 30, sep: 29, oct: 25, nov: 20, dec: 16 },
  peak_season: ["oct", "nov", "dec", "jan", "feb", "mar"],
  monsoon_months: ["jul", "aug"],
  climate_tags: ["dry", "winter_pleasant", "hot_summer"]
};

const mountainCool = {
  avg_temp_monthly: { jan: 4, feb: 6, mar: 10, apr: 15, may: 19, jun: 21, jul: 20, aug: 20, sep: 18, oct: 14, nov: 10, dec: 6 },
  peak_season: ["mar", "apr", "may", "jun", "oct", "nov", "dec", "jan"],
  monsoon_months: ["jul", "aug"],
  climate_tags: ["cool", "mountains", "snow", "summer_escape"]
};

export const destinationTravelKnowledge = {
  Goa: {
    ...coastalTropical,
    best_for: ["friends", "couples", "beaches", "nightlife", "winter"],
    seasonal_notes: ["Best for winter beach trips; hot and humid in May; heavy monsoon from June to September."]
  },
  Varkala: {
    ...coastalTropical,
    best_for: ["solo", "couples", "wellness", "beaches", "sunset"],
    seasonal_notes: ["Strong winter beach and wellness fit; avoid peak monsoon for cliff walks."]
  },
  Alleppey: {
    ...coastalTropical,
    best_for: ["couples", "family", "backwaters", "slow_travel", "winter"],
    seasonal_notes: ["Winter is comfortable for houseboats; monsoon is lush but weather-risky."]
  },
  Munnar: {
    ...westernGhatsCool,
    best_for: ["family", "couples", "nature", "cool_weather", "photography"],
    seasonal_notes: ["One of the better South India choices for cool weather, including May."]
  },
  Kochi: {
    ...coastalTropical,
    best_for: ["family", "culture", "food", "heritage", "winter"],
    seasonal_notes: ["Winter supports heritage walks and food exploration; May is humid."]
  },
  Wayanad: {
    ...westernGhatsCool,
    best_for: ["friends", "family", "nature", "caves", "cool_weather"],
    seasonal_notes: ["Cooler than coastal Kerala, with monsoon route risk."]
  },
  "McLeod Ganj": {
    ...mountainCool,
    best_for: ["solo", "friends", "trekking", "cool_weather", "mountains"],
    seasonal_notes: ["Good for cool-weather trekking in spring and autumn; winter can be cold."]
  },
  Rishikesh: {
    avg_temp_monthly: { jan: 15, feb: 18, mar: 23, apr: 28, may: 32, jun: 33, jul: 30, aug: 29, sep: 28, oct: 24, nov: 20, dec: 16 },
    peak_season: ["sep", "oct", "nov", "mar", "apr", "may"],
    monsoon_months: ["jul", "aug"],
    climate_tags: ["river", "warm", "adventure"],
    best_for: ["friends", "solo", "rafting", "adventure", "spiritual"],
    seasonal_notes: ["Spring and autumn are strong adventure windows; May is hot but active."]
  },
  Kasol: {
    ...mountainCool,
    best_for: ["solo", "friends", "backpacking", "cool_weather", "mountains"],
    seasonal_notes: ["May remains cooler than plains and works well for backpacking."]
  },
  Manali: {
    ...mountainCool,
    best_for: ["family", "friends", "adventure", "snow", "cool_weather"],
    seasonal_notes: ["May and June are classic cool-weather escape months; winter supports snow travel."]
  },
  Jaipur: {
    ...rajasthanWinter,
    best_for: ["family", "couples", "heritage", "photography", "winter"],
    seasonal_notes: ["Excellent winter heritage destination; too hot for comfortable sightseeing in May."]
  },
  Jaisalmer: {
    ...rajasthanWinter,
    avg_temp_monthly: { jan: 17, feb: 21, mar: 27, apr: 32, may: 37, jun: 38, jul: 35, aug: 33, sep: 33, oct: 29, nov: 23, dec: 18 },
    best_for: ["couples", "friends", "desert", "sunset", "winter"],
    seasonal_notes: ["Best in winter; May is very hot for desert activities."]
  },
  Udaipur: {
    ...rajasthanWinter,
    avg_temp_monthly: { jan: 17, feb: 20, mar: 25, apr: 29, may: 33, jun: 32, jul: 29, aug: 28, sep: 28, oct: 25, nov: 21, dec: 18 },
    best_for: ["couples", "family", "lakes", "romantic", "winter"],
    seasonal_notes: ["Strong winter and shoulder-season fit for lake views."]
  },
  Hampi: {
    avg_temp_monthly: { jan: 25, feb: 27, mar: 30, apr: 33, may: 34, jun: 30, jul: 28, aug: 28, sep: 28, oct: 27, nov: 25, dec: 24 },
    peak_season: ["oct", "nov", "dec", "jan", "feb"],
    monsoon_months: ["jun", "jul", "aug", "sep"],
    climate_tags: ["warm", "dry", "winter_pleasant", "hot_summer"],
    best_for: ["solo", "friends", "heritage", "budget", "photography"],
    seasonal_notes: ["Best in winter; exposed ruins are harsh in May."]
  },
  Gokarna: {
    ...coastalTropical,
    best_for: ["solo", "friends", "budget", "beaches", "backpacking"],
    seasonal_notes: ["Winter is the strongest beach window; monsoon affects beach treks."]
  },
  Coorg: {
    ...westernGhatsCool,
    best_for: ["family", "couples", "nature", "cool_weather", "coffee"],
    seasonal_notes: ["Works well as a cooler May escape and winter plantation break."]
  },
  Mumbai: {
    avg_temp_monthly: { jan: 25, feb: 26, mar: 28, apr: 30, may: 31, jun: 29, jul: 28, aug: 28, sep: 28, oct: 29, nov: 28, dec: 26 },
    peak_season: ["nov", "dec", "jan", "feb"],
    monsoon_months: ["jun", "jul", "aug", "sep"],
    climate_tags: ["warm", "urban", "coastal", "humid"],
    best_for: ["friends", "couples", "family", "food", "city_break"],
    seasonal_notes: ["Winter is best for promenades and walking; monsoon is atmospheric but disruptive."]
  },
  Aurangabad: {
    avg_temp_monthly: { jan: 21, feb: 24, mar: 28, apr: 32, may: 34, jun: 30, jul: 27, aug: 26, sep: 26, oct: 25, nov: 22, dec: 20 },
    peak_season: ["oct", "nov", "dec", "jan", "feb", "mar"],
    monsoon_months: ["jun", "jul", "aug", "sep"],
    climate_tags: ["dry", "winter_pleasant", "hot_summer"],
    best_for: ["family", "solo", "heritage", "architecture", "winter"],
    seasonal_notes: ["Winter is the best cave heritage window; May is hot."]
  },
  Cherrapunji: {
    avg_temp_monthly: { jan: 12, feb: 14, mar: 17, apr: 19, may: 20, jun: 21, jul: 21, aug: 21, sep: 21, oct: 19, nov: 16, dec: 13 },
    peak_season: ["oct", "nov", "dec", "jan", "feb", "mar"],
    monsoon_months: ["may", "jun", "jul", "aug", "sep"],
    climate_tags: ["cool", "rainforest", "monsoon", "waterfalls"],
    best_for: ["friends", "solo", "nature", "trekking", "hidden_gems"],
    seasonal_notes: ["Cool most of the year; monsoon creates waterfall drama but high route risk."]
  },
  Kaziranga: {
    avg_temp_monthly: { jan: 17, feb: 20, mar: 24, apr: 26, may: 27, jun: 29, jul: 29, aug: 29, sep: 28, oct: 25, nov: 21, dec: 18 },
    peak_season: ["nov", "dec", "jan", "feb", "mar", "apr"],
    monsoon_months: ["jun", "jul", "aug", "sep"],
    climate_tags: ["wildlife", "winter_pleasant", "humid"],
    best_for: ["family", "friends", "wildlife", "nature", "winter"],
    seasonal_notes: ["Safari season is mainly winter to spring; monsoon closures can affect access."]
  },
  Ziro: {
    avg_temp_monthly: { jan: 8, feb: 11, mar: 15, apr: 18, may: 21, jun: 23, jul: 23, aug: 23, sep: 22, oct: 18, nov: 14, dec: 10 },
    peak_season: ["mar", "apr", "sep", "oct", "nov"],
    monsoon_months: ["jun", "jul", "aug"],
    climate_tags: ["cool", "valley", "offbeat", "green"],
    best_for: ["solo", "friends", "culture", "hidden_gems", "cool_weather"],
    seasonal_notes: ["Good offbeat cool-weather valley, especially spring and autumn."]
  },
  "Havelock Island": {
    ...coastalTropical,
    best_for: ["couples", "family", "beaches", "honeymoon", "winter"],
    seasonal_notes: ["Best from November to March; monsoon can disrupt ferries and water activities."]
  },
  "Shaheed Dweep": {
    ...coastalTropical,
    best_for: ["couples", "family", "quiet_beaches", "slow_travel", "winter"],
    seasonal_notes: ["Best in winter for calm island movement and snorkeling."]
  },
  Madurai: {
    avg_temp_monthly: { jan: 26, feb: 28, mar: 31, apr: 33, may: 34, jun: 33, jul: 32, aug: 32, sep: 31, oct: 29, nov: 27, dec: 26 },
    peak_season: ["nov", "dec", "jan", "feb"],
    monsoon_months: ["oct", "nov"],
    climate_tags: ["hot", "temple", "winter_pleasant"],
    best_for: ["family", "solo", "culture", "temple", "winter"],
    seasonal_notes: ["Winter is best for temple visits; May is very hot."]
  },
  Delhi: {
    avg_temp_monthly: { jan: 14, feb: 18, mar: 24, apr: 30, may: 34, jun: 35, jul: 31, aug: 30, sep: 29, oct: 26, nov: 20, dec: 15 },
    peak_season: ["oct", "nov", "dec", "jan", "feb", "mar"],
    monsoon_months: ["jul", "aug"],
    climate_tags: ["winter_pleasant", "hot_summer", "urban"],
    best_for: ["family", "couples", "solo", "heritage", "city_break"],
    seasonal_notes: ["Winter and spring are best for gardens and heritage walks; May is very hot."]
  }
};

export function getTravelKnowledgeForPlace(place = {}) {
  return destinationTravelKnowledge[place.city] || destinationTravelKnowledge[place.destination] || fallbackTravelKnowledge;
}

export function temperatureForMonth(place, month) {
  const knowledge = place.avg_temp_monthly || getTravelKnowledgeForPlace(place).avg_temp_monthly;
  return knowledge?.[normalizeMonth(month)] ?? null;
}

export function climateFitForIntent(place, { month, climatePreference } = {}) {
  const temp = temperatureForMonth(place, month);
  if (temp === null) return 0.6;

  if (climatePreference === "cool") {
    if (temp <= 24) return 1;
    if (temp <= 28) return 0.72;
    if (temp <= 32) return 0.42;
    return 0.18;
  }

  if (climatePreference === "warm") {
    if (temp >= 24 && temp <= 32) return 1;
    if (temp > 32) return 0.72;
    return 0.45;
  }

  if (temp >= 15 && temp <= 28) return 1;
  if (temp > 28 && temp <= 32) return 0.68;
  if (temp >= 10 && temp < 15) return 0.7;
  return 0.35;
}

export function normalizeMonth(month) {
  const normalized = String(month || "").trim().toLowerCase().slice(0, 3);
  return normalized || null;
}

const fallbackTravelKnowledge = {
  avg_temp_monthly: { jan: 24, feb: 25, mar: 27, apr: 30, may: 32, jun: 30, jul: 29, aug: 29, sep: 29, oct: 28, nov: 26, dec: 24 },
  peak_season: ["nov", "dec", "jan", "feb"],
  monsoon_months: ["jun", "jul", "aug", "sep"],
  climate_tags: ["general"],
  best_for: ["general_travel"],
  seasonal_notes: []
};
