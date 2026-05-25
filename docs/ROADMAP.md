# Roadmap

WayFinder-Labs is the main public MVP repository from this point onward.

This roadmap records the team direction while keeping implementation ownership clear. Pranav's public contributions should follow the AI/ML-only boundary defined in [AIML Implementation Order](AIML_IMPLEMENTATION_ORDER.md).

## Team Ownership

| Member | Role | Roadmap Ownership |
| --- | --- | --- |
| Harsh | Frontend Architecture / Backend Infrastructure / System Integration Lead | Micro-frontend foundation, backend infrastructure, auth, API gateway, persistence, deployment |
| Pranav | AI Systems / Product Intelligence Lead | AI architecture, structured generation, travel intelligence, retrieval, ranking, optimization, validation |
| Ayushman | Product / Website Designer | Website design, product UX, planning workspace design, design system, visual assets |

## AI/ML Public Build Order

| Week | Focus | Pranav AI/ML Deliverable |
| --- | --- | --- |
| Week 1 | Core System and Architecture Design | AI architecture docs, recommendation schemas, metadata system plan, scoring parameter plan |
| Week 2 | AI Generation Layer | Structured prompting pipeline, JSON output contract, itinerary generation logic, validation rules |
| Week 3 | Intelligence Layer | Safe travel metadata model, tagging taxonomy, public-safe categorization examples |
| Week 4 | Retrieval Layer | pgvector selection, embeddings pipeline, chunking strategy, retrieval benchmark flow |
| Week 5 | Recommendation Engine | Ranking engine demo, budget scoring logic, efficiency optimization, preference balancing |
| Week 6 | Orchestration Layer | Retrieval + ranking + LLM orchestration plan, dynamic recalculation flow, reasoning refinement |
| Week 7 | Reliability Layer | Hallucination reduction, itinerary optimization, recommendation validation, route balancing |
| Week 8 | Launch Refinement | AI tuning, safe dataset expansion, quality refinement, feedback-driven optimization |

## Public Release Priorities

- Keep public AI/ML examples safe, explainable, and runnable.
- Preserve private datasets, prompts, scoring weights, and internal experiments outside the repo.
- Add frontend/backend/design implementation only through the relevant owner workstreams.
- Keep architecture docs aligned with the micro-frontend and microservices MVP direction.
