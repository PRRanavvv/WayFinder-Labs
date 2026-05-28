# Global Destination Dataset

This folder contains the public WayFinder global destination seed used for AI engine demos, retrieval experiments, image grounding QA, and itinerary model prototyping.

Files:

- `globalDestinationDataset.js`: 248 place-intelligence records across 31 destinations, plus destination profiles.
- `destinationVisualAssets.js`: destination hero image lookup, static map fallback helpers, and visual metadata.

The seed is intentionally separate from `samplePlaces.js` so the small public demos remain lightweight while Harsh can use this richer dataset for model work.

Current image policy:

- Prefer Wikimedia/Wikidata/PageImages when a grounded image is available.
- Fall back to exact OpenStreetMap static maps using the place coordinates.
- Do not use random image providers.

