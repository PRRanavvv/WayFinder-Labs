# Optional Vector Store

`infra/vector-store/schema.sql` is a future AI retrieval schema. It is not the
WayFinder application schema and does not authorize the AI engine to access the
application database.

If this provider is activated, it must use separate credentials and expose data
through the `PlaceProvider` boundary. The main application continues to own
users, trips, jobs, persistence, geocoding, and verified coordinates.

The vector-store choice remains optional. The deterministic static provider is
the current baseline and all core engines must continue to work without a
vector database.
