const defaults = {
  foodExploration: 0.5,
  heritagePreference: 0.5,
  fatigueTolerance: 0.5,
  recoveryPreference: 0.5
};

export function updatePreferenceProfile(profile = {}, event = {}) {
  const next = {
    travelStyle: {
      ...defaults,
      ...(profile.travelStyle || {})
    },
    confidence: {
      profileConfidence: profile.confidence?.profileConfidence ?? 0
    },
    recentSignals: [
      ...(profile.recentSignals || []),
      {
        type: event.type || "unknown",
        createdAt: new Date().toISOString()
      }
    ].slice(-20)
  };

  const direction = event.sentiment === "negative" ? -1 : 1;
  const activityType = event.activityType || event.place?.type;

  if (activityType === "food") shift(next.travelStyle, "foodExploration", 0.06 * direction);
  if (activityType === "heritage") shift(next.travelStyle, "heritagePreference", 0.06 * direction);
  if (event.type === "recovery_added") shift(next.travelStyle, "recoveryPreference", 0.08);
  if (event.type === "high_fatigue_removed") shift(next.travelStyle, "fatigueTolerance", -0.07);

  next.confidence.profileConfidence = clamp(
    next.confidence.profileConfidence + 0.04,
    0,
    0.95
  );

  return next;
}

function shift(style, key, amount) {
  style[key] = clamp((style[key] ?? defaults[key]) + amount, 0, 1);
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

