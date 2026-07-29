# WayFinder AI Engine Integration Guide

Audience: Harsh and anyone wiring the Next.js monolith to Pranav's AI engine.

Status: the AI engine is now a Python/FastAPI service in `ai-engine/`. The Next.js app should consume it over HTTP through a typed `ml-client` boundary. Do not import AI internals into the frontend monolith.

## Executive Summary

WayFinder's AI engine is a travel-intelligence service. It does not replace the app backend. It produces structured planning intelligence that the monolith validates, persists, geocodes, and renders.

The AI engine currently provides:

- Group Preference Fusion: converts member preferences into a shared trip DNA.
- Deterministic itinerary planning: creates route-aware, budget-aware, fatigue-aware day plans.
- Stability Engine: replans while preserving unaffected accepted activities.
- Explanation Engine: produces user-facing reasoning cards.
- Lightweight retrieval and recommendation ranking: ranks candidate places against user/group intent.
- FastAPI endpoints: stable HTTP surface for the Next.js monolith.

The app monolith owns:

- Auth and authorization.
- Trip persistence.
- Supabase/Postgres writes.
- Google Places geocoding and verification.
- Mapbox rendering.
- tRPC routes and React Query cache invalidation.
- Final user-visible state.

The key integration idea:

```text
Next.js tRPC router
  -> validates app/user/trip access
  -> calls frontend/src/ml-client/ai-engine.ts
  -> AI engine returns structured JSON
  -> tRPC validates with Zod
  -> monolith geocodes and persists verified data
  -> UI renders via React Query
```

## Current AI Engine Structure

```text
ai-engine/
  app/
    main.py                         FastAPI endpoints
    schemas.py                      Pydantic request models
    cli.py                          local demo/test helper
    services/
      data.py                       public demo seed data and route profiles
      group_preference_fusion.py    trip DNA, conflicts, fairness targets
      itinerary_planner.py          deterministic route/day planning
      stability_engine.py           minimal-change replanning
      explanation_engine.py         explanation cards
      recommendation_engine.py      ranking and group satisfaction
      retrieval_engine.py           lexical retrieval placeholder
      confidence.py                 confidence scoring
      text.py                       tokenization and scoring helpers
  tests/
    test_api_contracts.py
    test_group_intelligence.py
    test_itinerary.py
    test_recommendations.py
  API_CONTRACT.md
  pyproject.toml
  package.json                      npm wrappers around Python commands
```

The old JavaScript AI engine was removed. Active scripts now run Python.

## Local Commands

From repo root:

```bash
npm run dev --workspace ai-engine
```

This starts FastAPI on port `8000`.

Run all active AI engine tests:

```bash
npm run test --workspace ai-engine
```

Focused checks:

```bash
npm run test:api --workspace ai-engine
npm run test:group-intelligence --workspace ai-engine
npm run test:itinerary --workspace ai-engine
npm run test:recommendations --workspace ai-engine
```

## API Endpoints

Base URL in local development:

```text
http://localhost:8000
```

Endpoints:

- `GET /health`
- `POST /v1/fuse-preferences`
- `POST /v1/itinerary`
- `POST /v1/replan`
- `POST /v1/recommendations`
- `POST /v1/explain/recommendation`

The detailed request/response examples live in:

```text
ai-engine/API_CONTRACT.md
```

## Endpoint Responsibilities

### `POST /v1/fuse-preferences`

Use this when the app has group members, votes, profile preferences, or explicit trip preferences and needs one normalized planning object.

Input concept:

- trip context: destination, days, month, group type
- explicit preferences: interests, pace, must-haves
- group members: interests, moods, pace, budget, avoids, constraints

Output concept:

- `tripDNA.groupVibe`
- `tripDNA.softPreferences`
- `tripDNA.hardConstraints`
- `tripDNA.budgetProfile`
- `tripDNA.conflictLevel`
- `fairness.representationTargets`
- `conflicts`
- `recommendationHints`
- explanation card

Recommended monolith use:

- Store the fusion output as derived trip intelligence, not as primary user preference truth.
- Recompute when group preferences, votes, trip constraints, or membership changes.
- Use `recommendationHints` as the input into recommendation and itinerary calls.

### `POST /v1/itinerary`

Use this to produce a deterministic first itinerary draft.

Output includes:

- route locations
- day plans
- activity timing
- estimated group cost
- fatigue and walking totals
- skipped candidates
- feasibility reports
- confidence

Important:

- Activity IDs are AI seed IDs, not verified Google place IDs.
- The monolith must geocode/verify each activity name before it becomes a map coordinate.
- If a place cannot be verified, persist it as unverified or ask the user to confirm. Do not invent coordinates.

### `POST /v1/replan`

Use this after a user edit, vote merge, closure, weather disruption, or schedule delay.

The Stability Engine tries to preserve accepted unaffected days and regenerate only directly affected days.

Output includes:

- stable itinerary
- `stabilityReport.previousActivityCount`
- `stabilityReport.preservedActivityCount`
- `stabilityReport.replacedActivityCount`
- affected days
- preserved days
- regenerated days
- explanation card

Recommended monolith use:

- Send accepted/locked activity IDs in `stabilityOptions`.
- Display the diff before applying the replan.
- Persist replan as a proposal first when multiple collaborators are active.

### `POST /v1/recommendations`

Use this for "suggest places" or "what should we add" flows.

Output includes:

- ranked places
- score breakdowns
- group satisfaction
- recommendation reasons
- confidence

Recommended monolith use:

- Treat recommendations as candidates.
- Use Google Places to verify and enrich candidates before storing coordinates.
- Store score breakdowns if you want explainability/history, but do not make them the source of truth.

## Suggested Next.js Monolith Structure

Recommended folder:

```text
frontend/src/ml-client/
  ai-engine.ts
  schemas.ts
  errors.ts
  index.ts
```

`ai-engine.ts` should contain the fetch client and endpoint functions.

`schemas.ts` should contain Zod schemas for AI responses. This is important because the AI service is a trust boundary, even though it is internal.

Example:

```ts
export async function fusePreferences(input: FusePreferencesInput) {
  const response = await fetch(`${env.AI_ENGINE_URL}/v1/fuse-preferences`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new AiEngineError("FUSE_FAILED", response.status);
  }

  const json = await response.json();
  return FusePreferencesResponseSchema.parse(json);
}
```

## Recommended tRPC Integration Points

Start with these tRPC procedures:

```text
trip.fusePreferences
trip.generateDraftItinerary
trip.replanWithStability
trip.getRecommendations
```

### `trip.fusePreferences`

Flow:

```text
protectedProcedure
  -> assertTripAccess(ctx, tripId, "member")
  -> load trip + members + votes + preferences
  -> build AI request DTO
  -> call mlClient.fusePreferences()
  -> validate response
  -> persist derived trip intelligence
  -> return fusion + explanation
```

### `trip.generateDraftItinerary`

Flow:

```text
protectedProcedure
  -> assertTripAccess(ctx, tripId, "editor")
  -> load trip constraints
  -> call mlClient.generateItinerary()
  -> validate feasibility/confidence
  -> geocode candidate place names through Google Places
  -> persist draft itinerary + place verification status
  -> invalidate React Query trip/itinerary keys
```

### `trip.replanWithStability`

Flow:

```text
protectedProcedure
  -> assertTripAccess(ctx, tripId, "editor")
  -> load current itinerary
  -> convert user edit into AI changes payload
  -> include accepted/locked activity IDs
  -> call mlClient.replanWithStability()
  -> validate diff
  -> create proposal if collaboration is active
  -> merge directly only for solo trips or owner-confirmed edits
```

### `trip.getRecommendations`

Flow:

```text
protectedProcedure
  -> assertTripAccess(ctx, tripId, "member")
  -> load trip DNA / preferences
  -> call mlClient.getRecommendations()
  -> verify places lazily or on selection
  -> return candidates to UI
```

## Data Mapping To Postgres

Suggested app-side tables or columns:

```text
trips
  ai_trip_dna jsonb
  ai_confidence numeric
  ai_confidence_level text

itineraries
  trip_id uuid
  status draft|active|proposal
  source ai|manual|merged
  ai_feasibility jsonb

itinerary_items
  itinerary_id uuid
  day_number integer
  title text
  ai_place_id text
  google_place_id text nullable
  verification_status verified|unverified|ambiguous
  start_time time
  end_time time
  estimated_cost integer
  fatigue_score numeric
  reasons jsonb

itinerary_replans
  trip_id uuid
  previous_itinerary_id uuid
  proposed_itinerary_id uuid
  stability_report jsonb
  explanation jsonb
```

The exact schema can change, but the principle should not: AI output becomes persisted app data only after app validation and authorization.

## Geocoding Boundary

The architecture decision is still:

```text
AI returns place names/seed IDs
Next.js backend geocodes through Google Places
Postgres stores verified coordinates
Mapbox renders verified coordinates
```

Reason:

- LLMs and planning engines can hallucinate spatial data.
- Google Places gives canonical IDs and coordinates.
- Coordinates should live in one app-owned table, likely `places`.
- Ambiguous results should become a UI branch, not a silent guess.

Suggested verification states:

```text
verified      Google Places matched with high confidence
ambiguous     multiple plausible candidates
unverified    no strong match; show as non-map item or ask user
failed        provider error; retry later
```

## React Query And UI State

Use React Query for all server state:

- trip DNA
- itinerary draft
- recommendations
- replan proposal
- place verification status

Use Zustand only for ephemeral UI:

- open modal
- selected day tab
- hovered item
- currently previewed proposal

Do not copy AI output into Zustand as durable state.

## Failure Handling

The AI engine should be assumed fallible.

Minimum app behavior:

- Timeout AI calls after 8-12 seconds.
- Show a retryable error for generation failures.
- Save user input before calling AI.
- Keep the previous itinerary visible if replan fails.
- For collaboration, create proposals transactionally only after AI output validates.
- Log `tripId`, `userId`, endpoint, latency, status, and confidence level.

Suggested error classes:

```text
AI_ENGINE_TIMEOUT
AI_ENGINE_UNAVAILABLE
AI_ENGINE_INVALID_RESPONSE
AI_ENGINE_LOW_CONFIDENCE
AI_ENGINE_NO_FEASIBLE_PLAN
PLACE_VERIFICATION_FAILED
```

## Security And Authorization

The AI engine should not receive secrets it does not need.

Recommended:

- Keep user auth in Next.js/tRPC.
- Send only the trip context and preference payload required for planning.
- Avoid sending raw emails, phone numbers, or private account metadata.
- Add an internal service token later if the AI service becomes publicly reachable.
- Log sanitized request summaries, not full PII payloads.

Critical:

The AI engine must not decide whether a user can access a trip. That is `assertTripAccess()` in the monolith.

## Deployment Shape

Local:

```text
Next.js monolith: http://localhost:3000
AI engine:        http://localhost:8000
```

Environment variable in frontend:

```text
AI_ENGINE_URL=http://localhost:8000
```

Production options:

1. Separate Render/Fly/Railway service for `ai-engine`.
2. Private network call from Next.js runtime to the AI engine.
3. Add service-token auth between monolith and AI engine.
4. Add health check and request timeout monitoring.

## Suggested Merge Sequence

Follow this order to avoid integration chaos:

1. Add `AI_ENGINE_URL` to frontend env validation.
2. Create `frontend/src/ml-client/ai-engine.ts`.
3. Add Zod schemas for `/health`, `/v1/fuse-preferences`, `/v1/itinerary`, `/v1/replan`, `/v1/recommendations`.
4. Implement a `health` check command or route.
5. Wire `trip.fusePreferences` first because it has the least persistence risk.
6. Wire `trip.getRecommendations` second.
7. Wire `trip.generateDraftItinerary` with Google Places verification.
8. Wire `trip.replanWithStability` only after itinerary persistence exists.
9. Add React Query mutation patterns with rollback.
10. Add collaboration proposal merge flow after stable solo-trip generation works.

## Product Suggestions

Strong suggestions:

- Build an "AI confidence" UI chip early. It will make fallback behavior understandable.
- Show stability diff before applying replans. This is one of WayFinder's strongest differentiators.
- Let users lock activities. The Stability Engine already expects accepted/locked activity IDs.
- Track why a recommendation was accepted or rejected. That becomes training/evaluation data later.
- Add "unverified place" UI state instead of hiding low-confidence geocoding failures.
- Use deterministic AI outputs for MVP; add LLM narrative later.

Avoid for now:

- Do not make the AI engine write directly to Supabase.
- Do not let the frontend browser call the AI engine directly if the payload includes private trip/member data.
- Do not render AI-generated coordinates.
- Do not add vector DB complexity before the typed HTTP contract is stable.
- Do not start with a fully autonomous itinerary agent. Keep the system inspectable.

## Near-Term AI Engine TODOs

Suggested next tasks for Pranav:

1. Expand `app/services/data.py` into a proper seed dataset module.
2. Add provider interfaces for embeddings and reranking.
3. Replace lexical retrieval with hybrid lexical + vector retrieval.
4. Add request IDs and structured logging.
5. Add confidence calibration tests.
6. Add a golden fixture suite for common trip archetypes.
7. Add a service token middleware before production exposure.

## Final Mental Model

Think of the AI engine as a planning brain, not the application backend.

```text
AI engine thinks.
Next.js authorizes, verifies, persists, and renders.
Postgres remembers.
Google Places verifies reality.
Mapbox shows only verified spatial truth.
```

That separation is what lets the team move fast without letting AI output corrupt the source of truth.
