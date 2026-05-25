# AIML Implementation Order

This document defines Pranav's AI/ML workstream for WayFinder-Labs.

The public repository should only receive public-safe AI/ML additions from this stream. Private datasets, production prompts, proprietary ranking weights, internal experiments, and vendor-specific orchestration details must stay outside this repo.

## Ownership

| Owner | Role | Scope In This Document |
| --- | --- | --- |
| Pranav | AI Systems / Product Intelligence Lead | AI architecture, recommendation schemas, travel metadata intelligence, structured generation, retrieval, ranking, optimization, validation, adaptive scoring |

## Strict Build Order

| Order | Phase | AI/ML Scope | Public-Safe Output |
| --- | --- | --- | --- |
| 1 | Core System and Architecture Design | Finalize AI system architecture, recommendation schemas, curated travel metadata system, and scoring parameter planning | Architecture notes, schema docs, scoring parameter map |
| 2 | Structured AI Generation Layer | Build structured prompting pipeline, JSON output enforcement, itinerary generation logic, validation systems, and prompt experimentation notes | Structured itinerary contract and validation rules |
| 3 | Travel Intelligence Layer | Build curated travel dataset model, metadata tagging system, and travel intelligence categorization system | Safe sample place metadata and tagging taxonomy |
| 4 | Retrieval Infrastructure Layer | Set up embeddings pipeline design, pgvector integration path, semantic retrieval system, and contextual retrieval testing approach | Vector DB selection, embedding pipeline, chunking strategy, pgvector schema, benchmark scripts, and public-safe retrieval interface |
| 5 | Recommendation and Optimization Engine | Build recommendation ranking engine, budget scoring logic, travel efficiency optimization, and preference balancing logic | Deterministic ranking engine, decision logs, public-safe scoring breakdowns, and retrieval-to-ranking demo |
| 6 | AI Orchestration Layer | Integrate retrieval, ranking, LLM orchestration, dynamic itinerary recalculation, and reasoning refinement | End-to-end AI pipeline demo with structured output |
| 7 | Reliability Layer | Add hallucination reduction, itinerary optimization, recommendation validation pipeline, and route balancing logic | Constraint engine, optimization engine, explanation layer, decision traces, and quality metrics |
| 8 | Launch Refinement | Tune AI quality, expand safe datasets, refine recommendations, and add feedback-driven optimization | Launch-ready AI/ML showcase package |

## Public Repo Rules

Allowed:

- `ai-engine/` source files for safe demos
- `docs/` files explaining public architecture and AI flow
- Synthetic or public-safe sample data
- Schema examples and validation contracts
- Lightweight scoring demos without proprietary weights
- Evaluation examples that do not expose private datasets

Not allowed:

- Private Jaipur intelligence data
- Raw private datasets
- Production prompts
- Vendor API keys or orchestration internals
- Proprietary ranking heuristics
- Internal experiments or generated research artifacts

## Suggested Branch Naming

| Work Type | Branch Pattern |
| --- | --- |
| AI docs | `docs/aiml-architecture-*` |
| Schemas | `feat/ai-schema-*` |
| Ranking demos | `feat/ai-ranking-*` |
| Retrieval demos | `feat/ai-retrieval-*` |
| Validation | `feat/ai-validation-*` |
| Evaluation scripts | `test/ai-evaluation-*` |

## Completion Standard

Each AI/ML contribution should include:

- The public-safe implementation or documentation
- A short explanation of what private/internal details are intentionally excluded
- A runnable demo or verification step when code is changed
- Clear structured inputs and outputs when pipeline behavior changes
