# Workspace Map

Porvi uses a simple workspace split:

- `apps/*` are runnable entrypoints.
- `packages/*` are reusable libraries and contracts consumed by those entrypoints.

This is the current layout:

## Apps

- `apps/api`
  Control plane HTTP service. Owns API routes, request handling, and service wiring.
- `apps/console`
  Current operator/admin UI.
- `apps/landing`
  Marketing surface plus session bootstrap/auth gate.
- `apps/worker`
  Background job runner and deployment/build processing loop.

## Packages

- `packages/platform-auth`
  Authentication and session primitives, OIDC provider integration, and provider storage helpers.
- `packages/platform-contracts`
  Shared TypeScript and Zod contracts used across the platform boundary.
- `packages/platform-core`
  Core platform domain logic: repositories, jobs, build orchestration, and shared runtime services.
- `packages/platform-db`
  Database bootstrap, schema, and connection helpers.
- `packages/product-core`
  Structured-project contract, validation, and defaults for external site repositories.

## Boundary Rules

- Put code in `apps/*` when it is a deployable surface with its own `dev`, `build`, or `start` behavior.
- Put code in `packages/*` when it is shared by more than one app or defines a stable contract.
- Keep `packages/product-core` focused on the external site-repository contract, not control-plane runtime logic.
- Keep platform runtime concerns under `packages/platform-*`, then compose them from `apps/api` and `apps/worker`.

## Organization Guidance

The current split is sound. The main cleanup priority is discipline, not a large folder rename:

- keep generated build output out of `src/`
- keep `apps/*` thin and compositional
- move reusable domain logic into `packages/*`
- only add a new package when the boundary is clear and likely to stay stable

If the repo grows substantially, the next organizational step would be a grouped package layout such as `packages/platform/*` and `packages/product/*`. That is optional and should wait until the current boundaries stop feeling clear.
