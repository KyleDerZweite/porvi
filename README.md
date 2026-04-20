# Porvi

Porvi is a contract-first creator-site platform. Static Astro output remains the
deployment artifact, while this repository contains the platform around that
artifact: the control plane, the current operator/admin UI, the marketing
surface plus session bootstrap/auth gate, and the shared structured-project
contract used by external site repositories.

## Current Platform Surfaces

- `apps/api`
  Hono control plane for auth, sessions, workspaces, projects, revisions,
  deployments, domains, assets, AI requests, and job orchestration.
- `apps/console`
  Current operator/admin UI for workspace and project management, structured
  editing, domains, deployments, and AI request intake.
- `apps/landing`
  Marketing surface plus session bootstrap/auth gate for the browser flow.
- `packages/product-core`
  Canonical structured-project contract and archetype defaults for external
  Porvi-managed or Porvi-compatible site repositories.

## Repo Model

- This monorepo no longer hosts site workspaces under `sites/*`.
- External site repositories consume the structured project contract from
  `packages/product-core`.
- The preferred product model remains `contract base + custom code`: a stable
  project contract with room for individualized implementation above it.
- [docs/WORKSPACES.md](docs/WORKSPACES.md) explains the current `apps/*` and
  `packages/*` boundaries.

## Docs Hierarchy

- Code, schemas, and checked-in contracts are the hard source of truth.
- [docs/SPEC.md](docs/SPEC.md) is the canonical behavioral contract document.
- [docs/PRODUCT.md](docs/PRODUCT.md) is the canonical product narrative.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) describes the current runtime.
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) records the accepted external-repo
  build plus origin-and-edge deployment model.
- [docs/VISION.md](docs/VISION.md) captures durable principles.
- [docs/ZITADEL_SETUP.md](docs/ZITADEL_SETUP.md) is the generic Zitadel setup guide.

## Workflow

```bash
pnpm run dev
pnpm test
pnpm run build
```

## Licensing

This repository is licensed under [`AGPL-3.0-only`](LICENSE). See
[REUSE.toml](REUSE.toml) for the canonical repo-wide licensing metadata.
