# WayFinder AI Engine

This public module demonstrates the shape of the WayFinder planning engine without exposing private scoring logic, proprietary datasets, or internal experimentation systems.

Included:
- Sample semantic ranker
- Public-safe retrieval index
- Global destination mock dataset
- Grounded destination and place visual assets
- Embeddings-ready sample metadata
- Metadata-aware chunking pipeline
- Local vector store and pgvector adapter
- Retrieval benchmark scripts
- Deterministic decision ranking engine
- Retrieval-to-ranking intelligence flow
- Constraint-based optimization layer
- Recommendation explanation engine
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

Run intelligence flow:

```bash
npm run demo:intelligence --workspace ai-engine
```

Run decision-quality optimization:

```bash
npm run demo:decision-quality --workspace ai-engine
```

Dataset and architecture references:

- `ai-engine/src/datasets/globalDestinationDataset.js`
- `ai-engine/src/datasets/destinationVisualAssets.js`
- `ai-engine/src/datasets/README.md`
- `ai-engine/AI_ML_WORKFLOW_ARCHITECTURE.md`
