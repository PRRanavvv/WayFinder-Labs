# WayFinder AI Engine

The official AI/ML service for WayFinder now lives in Python. This package is a FastAPI-backed travel-intelligence engine that exposes structured JSON contracts to the Next.js monolith.

Included:
- FastAPI service boundary in `app/main.py`
- Pydantic request models in `app/schemas.py`
- Group Preference Fusion for trip DNA, consensus, conflicts, and fairness targets
- Deterministic itinerary planning with budget, route, fatigue, walking, live closure, and weather checks
- Stability Engine for minimal-change replans
- Explanation cards for group fusion, stable replans, and recommendation selection
- Lightweight retrieval and recommendation ranking primitives
- Python `unittest` coverage for API contracts and core intelligence flows

Excluded:
- Production ranking weights
- Advanced route optimization vendors
- Private evaluation harnesses
- Vendor prompts, keys, and orchestration internals

Run the demo:

```bash
npm run demo --workspace ai-engine
```

Run the FastAPI service:

```bash
npm run dev --workspace ai-engine
```

Run the retrieval demo:

```bash
npm run demo:retrieval --workspace ai-engine
```

Run retrieval benchmarks:

```bash
npm run benchmark:retrieval --workspace ai-engine
```

Run the messy hard retrieval benchmark:

```bash
npm run benchmark:retrieval:hard --workspace ai-engine
```

Indexing commands currently route through the Python CLI placeholder:

```bash
QDRANT_URL=http://localhost:6333 npm run qdrant:index --workspace ai-engine
```

The production vector store adapter will be added behind the Python service boundary.

Run intelligence flow:

```bash
npm run demo:intelligence --workspace ai-engine
```

Run decision-quality optimization:

```bash
npm run demo:decision-quality --workspace ai-engine
```

Run deterministic itinerary checks:

```bash
npm run test:itinerary --workspace ai-engine
```

Run itinerary benchmark:

```bash
npm run benchmark:itinerary --workspace ai-engine
```

Run production edge-case checks:

```bash
npm run test:edge-cases --workspace ai-engine
npm run benchmark:edge-cases --workspace ai-engine
```

Run recommendation ranking checks:

```bash
npm run test:recommendations --workspace ai-engine
```

Run group intelligence checks:

```bash
npm run test:group-intelligence --workspace ai-engine
```

Dataset and architecture references:

- `ai-engine/app/services/data.py`
- `ai-engine/app/services/group_preference_fusion.py`
- `ai-engine/app/services/itinerary_planner.py`
- `ai-engine/app/services/stability_engine.py`
- `ai-engine/app/services/explanation_engine.py`
- `ai-engine/app/services/recommendation_engine.py`
- `ai-engine/app/services/retrieval_engine.py`
- `ai-engine/AI_ML_WORKFLOW_ARCHITECTURE.md`

The older JavaScript prototype files remain in the repository as historical reference until they are explicitly removed, but active npm scripts now point at Python.
