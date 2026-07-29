# Deterministic Place Catalog

The current public baseline catalog lives in
`app/providers/static_catalog.py`. It contains a small India-focused set of
place and route metadata used by demos, unit tests, and evaluation cases.

The catalog is intentionally deterministic. It provides a reproducible baseline
for preference fusion, retrieval, recommendation ranking, itinerary planning,
and stable replanning before external providers are introduced.

## Provider Boundary

Engines consume the `PlaceProvider` protocol from `app/providers/base.py`.
`StaticPlaceProvider` is the default implementation. Future sources such as a
vector store, curated database, or model-assisted retriever must implement the
same boundary instead of being coupled directly to planning logic.

## Data Policy

- Catalog IDs are internal retrieval identifiers, not verified Google Place IDs.
- The AI API must not return coordinates from this catalog.
- The main application resolves names through Google Places.
- Verified coordinates remain outside the AI service boundary.
- New catalog entries require deterministic tests and source documentation.
- Generated caches and evaluation reports are not committed.
