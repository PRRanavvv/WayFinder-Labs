# WayFinder AI Engine

This public module demonstrates the shape of the WayFinder planning engine without exposing private scoring logic, proprietary datasets, or internal experimentation systems.

Included:
- Sample semantic ranker
- Public-safe retrieval index
- Global destination mock dataset
- Enriched place metadata for retrieval evaluation
- Travel climate and season knowledge layer
- Query understanding before retrieval
- Grounded destination and place visual assets
- Embeddings-ready sample metadata
- Metadata-aware chunking pipeline
- BGE Small embedding provider boundary
- Hybrid retrieval scoring with explainable reasons
- Local vector store and Qdrant adapter
- Retrieval benchmark scripts
- 100 retrieval evaluation prompts
- Deterministic decision ranking engine
- Retrieval-to-ranking intelligence flow
- Constraint-based optimization layer
- Deterministic Itinerary Intelligence v1
- Route-aware scheduling, opening-hour checks, and fatigue limits
- Real-time itinerary intelligence for weather, opening-hour overrides, and seasonal scoring
- 100-scenario itinerary benchmark
- Production edge-case benchmark for ugly user inputs, fallbacks, and confidence scoring
- Recommendation explanation engine
- Recommendation Ranking Engine v1
- Configurable recommendation profiles and group satisfaction scoring
- Group Preference Fusion for trip DNA, conflict detection, and fairness targets
- Stability Engine for minimal-change itinerary replans
- Explanation cards for group fusion, stable replans, and recommendation selection
- Decision quality evaluation metrics
- Decision logs for explainability and debugging
- Simple preference memory update loop
- Demo itinerary lifecycle
- Non-sensitive sample places
- Final AI/ML workflow architecture document

Excluded:
- Production ranking weights
- Advanced route optimization
- Private evaluation harnesses
- Vendor prompts, keys, and orchestration internals

Run the demo:

```bash
npm run demo --workspace ai-engine
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

Index enriched place records into Qdrant:

```bash
QDRANT_URL=http://localhost:6333 npm run qdrant:index --workspace ai-engine
```

`qdrant:index` defaults to BGE Small through Transformers.js. Local tests use deterministic hash embeddings so the public repo remains runnable without model downloads.

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

- `ai-engine/src/datasets/globalDestinationDataset.js`
- `ai-engine/src/datasets/enrichedPlaces.js`
- `ai-engine/src/datasets/travelKnowledge.js`
- `ai-engine/src/datasets/destinationVisualAssets.js`
- `ai-engine/src/datasets/README.md`
- `ai-engine/src/retrieval/hybridScoring.js`
- `ai-engine/src/retrieval/queryUnderstanding.js`
- `ai-engine/src/retrieval/hardRetrievalBenchmark.js`
- `ai-engine/src/retrieval/benchmarkLeakage.js`
- `ai-engine/src/retrieval/retrievalEvaluationPrompts.js`
- `ai-engine/src/intelligence/confidenceScoring.js`
- `ai-engine/src/intelligence/productionGuards.js`
- `ai-engine/src/intelligence/groupPreferenceFusion.js`
- `ai-engine/src/intelligence/recommendationEngine.js`
- `ai-engine/src/intelligence/explanationEngine.js`
- `ai-engine/src/evaluation/productionEdgeCases.js`
- `ai-engine/src/itinerary/deterministicPlanner.js`
- `ai-engine/src/itinerary/stabilityEngine.js`
- `ai-engine/src/itinerary/realtimeIntelligence.js`
- `ai-engine/src/itinerary/itineraryBenchmark.js`
- `ai-engine/src/itinerary/travelGraph.js`
- `ai-engine/AI_ML_WORKFLOW_ARCHITECTURE.md`
