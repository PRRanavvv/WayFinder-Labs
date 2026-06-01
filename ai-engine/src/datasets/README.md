# Global Destination Dataset

This folder contains the public WayFinder global destination seed used for AI engine demos, retrieval experiments, image grounding QA, and itinerary model prototyping.

Files:

- `globalDestinationDataset.js`: 248 place-intelligence records across 31 destinations, plus destination profiles.
- `enrichedPlaces.js`: India-focused enriched place metadata with category, mood, ideal traveler groups, budget, seasonality, crowd, walking, family, nightlife, adventure, and culture signals.
- `destinationVisualAssets.js`: destination hero image lookup, static map fallback helpers, and visual metadata.

The seeds are intentionally separate from `samplePlaces.js` so the small public demos remain lightweight while WayFinder can run richer retrieval and evaluation workflows.

Current image policy:

- Prefer Wikimedia/Wikidata/PageImages when a grounded image is available.
- Fall back to exact OpenStreetMap static maps using the place coordinates.
- Do not use random image providers.
