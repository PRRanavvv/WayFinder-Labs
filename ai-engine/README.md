# WayFinder AI Engine

This public module demonstrates the shape of the WayFinder planning engine without exposing private scoring logic, proprietary datasets, or internal experimentation systems.

Included:
- Sample semantic ranker
- Public-safe retrieval index
- Global destination mock dataset
- Enriched place metadata for retrieval evaluation
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
- Recommendation explanation engine
- Recommendation Ranking Engine v1
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

Run recommendation ranking checks:

```bash
npm run test:recommendations --workspace ai-engine
```

Dataset and architecture references:

- `ai-engine/src/datasets/globalDestinationDataset.js`
- `ai-engine/src/datasets/enrichedPlaces.js`
- `ai-engine/src/datasets/destinationVisualAssets.js`
- `ai-engine/src/datasets/README.md`
- `ai-engine/src/retrieval/hybridScoring.js`
- `ai-engine/src/retrieval/retrievalEvaluationPrompts.js`
- `ai-engine/src/intelligence/recommendationEngine.js`
- `ai-engine/AI_ML_WORKFLOW_ARCHITECTURE.md`
