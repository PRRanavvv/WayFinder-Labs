# Hybrid Intelligence Architecture

WayFinder should keep TypeScript as the core product infrastructure while introducing Python only where it creates clear intelligence leverage.

## Current Rule

Do not introduce a Python service until the TypeScript intelligence layer has stable inputs, outputs, and evaluation metrics.

## TypeScript Responsibilities

| Area | Responsibility |
| --- | --- |
| Orchestration | Retrieval, ranking, optimization flow coordination |
| APIs | Backend contracts and frontend integration |
| Persistence | PostgreSQL, pgvector, Prisma boundary |
| Session state | Itinerary state, recalculation state, user interactions |
| Deterministic logic | Public-safe scoring, constraints, validation |
| Frontend integration | React/React Flow planning workspace |

## Future Python Responsibilities

| Area | Possible Use |
| --- | --- |
| OR-Tools optimization | Route sequencing, timing constraints, budget allocation |
| SciPy / NumPy | scoring experiments and optimization simulations |
| pandas | analytics and evaluation pipelines |
| scikit-learn | ranking experiments and recommendation evaluation |
| sentence-transformers | embedding experiments outside the public repo |
| PyTorch / HuggingFace | future predictive or recommendation models |

## Integration Options

| Option | When To Use |
| --- | --- |
| Internal adapter | Early experiments called from scripts or batch jobs |
| REST service | Stable optimization service used by backend |
| gRPC service | Higher-throughput internal intelligence service |

## Recommended Evolution

1. Keep current deterministic TypeScript engine.
2. Add more benchmark coverage.
3. Move only advanced optimization experiments to Python.
4. Compare Python results against TypeScript baseline.
5. Promote Python services only after measurable quality gains.

This keeps the product modular without creating unnecessary distributed architecture too early.
