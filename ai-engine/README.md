# WayFinder AI Engine

Python/FastAPI travel intelligence for WayFinder. This service owns preference
fusion, retrieval and ranking, itinerary planning, stable replanning,
confidence, feasibility, and explanations.

It does not own authentication, application jobs, Supabase writes, geocoding,
verified coordinates, or frontend state.

## Structure

```text
app/api/         FastAPI routes
app/contracts/   Pydantic request contracts
app/core/        Shared configuration and primitives
app/engines/     Deterministic intelligence
app/providers/   Replaceable data providers
evals/           Quality cases, metrics, and runner
infra/           Optional AI-owned infrastructure definitions
scripts/         Developer utilities
tests/           Unit, contract, and evaluation tests
docs/            Technical documentation
```

## Commands

From the repository root:

```bash
npm run dev --workspace ai-engine
npm run demo --workspace ai-engine
npm run evaluate --workspace ai-engine
npm run test --workspace ai-engine
```

Focused checks:

```bash
npm run test:unit --workspace ai-engine
npm run test:contract --workspace ai-engine
npm run test:evaluation --workspace ai-engine
```

## Documentation

- `docs/index.md`
- `docs/architecture.md`
- `docs/api-contract.md`
- `docs/dataset.md`
- `docs/vector-store.md`
