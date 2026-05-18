# System Design

WayFinder is designed as an adaptive travel planning platform rather than a static itinerary generator.

## High-Level Architecture

```text
Frontend Planning Canvas
  - Trip workspace
  - Day swimlanes
  - Activity nodes
  - AI copilot panel

Backend API
  - Planning endpoints
  - Interaction capture
  - Preference profile access
  - Itinerary persistence boundary

AI Engine
  - Semantic ranking
  - Preference-aware scoring
  - Itinerary assembly
  - Reasoning summaries

Data Layer
  - Places
  - Clusters
  - User/group preference profile
  - Interaction signals
```

## Design Principles

- Keep workspace state separate from generated itinerary state.
- Treat generated itineraries as proposals, not immutable output.
- Use behavior signals to evolve preferences gradually.
- Keep ranking logic composable so future scoring modules can be added safely.
- Generate explanations alongside planner decisions.
- Avoid exposing proprietary production heuristics in public code.

## Public Showcase Boundaries

This repo contains a simplified API and AI engine. The production system may include deeper optimization, private datasets, authenticated persistence, model orchestration, and evaluation infrastructure.

