<div align="center">

# WayFinder

### AI-assisted travel planning that learns how people actually travel.

[![Status](https://img.shields.io/badge/status-public%20showcase-0f766e)](#)
[![Stack](https://img.shields.io/badge/stack-React%20%7C%20Node%20%7C%20AI%20Engine-10201f)](#)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Portfolio](https://img.shields.io/badge/portfolio-ready-14b8a6)](#)

</div>

WayFinder is a public showcase repository for an AI travel planning platform that combines semantic itinerary generation, collaborative spatial planning, and adaptive preference memory.

This repository is intentionally curated for public review. It demonstrates the system architecture, product thinking, and selected implementation patterns without exposing private datasets, proprietary ranking heuristics, production credentials, or internal experimentation systems.

---

## Why WayFinder

Most itinerary apps generate a static list of places. WayFinder is designed around a different idea:

> Travel planning should feel like co-designing a journey with an intelligent assistant.

WayFinder turns trips into a visual planning workspace where activities can be arranged spatially, evaluated semantically, adapted to user behavior, and explained in human terms.

## Product Highlights

- Collaborative planning canvas for arranging itinerary nodes across day swimlanes
- Semantic place graph with clusters, roles, fatigue, weather fit, and routing context
- AI copilot surface for route, pacing, and recovery recommendations
- Adaptive preference memory that learns from edits, pins, replacements, and accepted suggestions
- Explainable itinerary generation lifecycle
- Public-safe AI engine demo with semantic ranking and preference-aware scoring
- Startup-style architecture docs for recruiters, reviewers, and collaborators

## Repository Structure

```text
WayFinder-Travel-Platform/
├── frontend/          # Public showcase React UI
├── backend/           # Public-safe API shell
├── ai-engine/         # Demonstration AI planning logic
├── docs/              # Architecture and product docs
├── assets/            # Screenshot and architecture placeholders
├── .github/           # Issue and PR templates
├── CONTRIBUTING.md
├── SECURITY.md
└── README.md
```

## Architecture

WayFinder is organized as five public-facing layers:

```text
User Workspace
  ↓
Planning API
  ↓
AI Engine
  ↓
Semantic Place Graph
  ↓
Preference Memory
```

The production platform contains deeper internal services, but this showcase keeps the public repo focused on safe architecture and demo logic.

Read more:
- [System Design](docs/SYSTEM_DESIGN.md)
- [AI Pipeline Flow](docs/AI_PIPELINE_FLOW.md)
- [Ranking Engine](docs/RANKING_ENGINE.md)
- [Itinerary Lifecycle](docs/ITINERARY_LIFECYCLE.md)
- [Adaptive Memory Lifecycle](docs/ADAPTIVE_MEMORY_LIFECYCLE.md)

## AI Planning Engine Overview

The public AI engine demonstrates a simplified version of the WayFinder planning loop:

1. Normalize trip intent
2. Retrieve candidate places from a safe sample set
3. Score places with semantic and adaptive signals
4. Build day-level itinerary lanes
5. Return structured activities with explanations

This repo uses intentionally simple scoring weights. The production platform uses richer internal heuristics, evaluation traces, and private place intelligence.

## Semantic Ranking System

The demo ranker evaluates candidates across:

- Semantic fit to trip interests
- Adaptive fit to learned preference profile
- Pacing fit based on fatigue tolerance
- Cluster fit for smoother travel zones
- Weather fit for practical resilience

See [Ranking Engine](docs/RANKING_ENGINE.md).

## Adaptive Preference Memory

WayFinder learns from behavior signals such as:

- Activity pinned
- Activity replaced
- High-fatigue activity removed
- Recovery stop added
- Food or heritage preference reinforced

Those signals update a normalized profile that can influence future recommendations.

See [Adaptive Memory Lifecycle](docs/ADAPTIVE_MEMORY_LIFECYCLE.md).

## Screenshots

Public screenshots can be added under `assets/screenshots/`.

Suggested images:

| Canvas Workspace | AI Copilot | Adaptive Memory |
| --- | --- | --- |
| `assets/screenshots/canvas.png` | `assets/screenshots/copilot.png` | `assets/screenshots/memory.png` |

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, CSS |
| Backend | Node.js, Express |
| AI Engine | JavaScript modules, semantic scoring demo |
| Architecture | Modular frontend/backend/AI separation |
| Documentation | Markdown system design and lifecycle docs |

## Local Setup

```bash
git clone https://github.com/PRRanavvv/WayFinder-Travel-Platform.git
cd WayFinder-Travel-Platform
npm install
```

Run frontend:

```bash
npm run dev --workspace frontend
```

Run backend:

```bash
npm run dev --workspace backend
```

Run AI engine demo:

```bash
npm run demo:ai
```

## Roadmap

- Add public screenshots and product walkthrough GIFs
- Add hosted demo link
- Add richer public test harness
- Add safe mock collaboration flow
- Add OpenAPI docs for the showcase backend
- Add lightweight design system documentation

## Public Scope

This repository does not include:

- Production secrets or environment variables
- MongoDB data, binaries, dumps, or lock files
- Raw proprietary datasets
- Internal ranking heuristics
- Vendor prompts or model orchestration internals
- Private experiments, research PDFs, or generated artifacts

See [Public Repository Scope](docs/PUBLIC_REPO_SCOPE.md).

## Contributing

This is a showcase repository, but contributions to docs, demo UX, safe examples, and issue quality are welcome.

Read [CONTRIBUTING.md](CONTRIBUTING.md).

## Author

Built by [PRRanavvv](https://github.com/PRRanavvv) as a portfolio-ready AI product engineering project.

