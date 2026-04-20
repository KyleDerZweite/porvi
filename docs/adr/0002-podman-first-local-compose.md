# ADR 0002: Podman-First Local Compose

- Status: accepted
- Date: 2026-04-18

## Context

The repo still contained a stale legacy compose file centered on an old
builder/router/newt tunnel flow. It did not run the current platform surfaces
for local development and did not reflect the fastest path for working on the
control plane, dashboard/operator UI, and marketing surface together.

The current product needs a localhost-first workflow that:

- runs the actual platform apps
- uses the real Zitadel tenant for browser auth
- keeps public origins on `localhost`
- works cleanly with Podman as the primary container runtime

Local HTTP development also cannot rely on a `__Host-` session cookie name, because that prefix requires the `Secure` attribute.

## Decision

Use a Podman-first `compose.yml` as the canonical local container workflow.

The local compose stack runs:

- `apps/api`
- `apps/console`
- `apps/landing`

It uses:

- bind-mounted repo source
- a shared PNPM store volume
- localhost public origins for API, dashboard/operator UI, and marketing surface
- the real configured Zitadel issuer and client settings from the repo env/provider config

For local SQLite development, the API's embedded worker remains the default job runner, so the local compose stack does not start a separate worker service by default.

Default session cookie behavior must be localhost-safe on insecure HTTP and retain `__Host-` semantics automatically for HTTPS deployments.

## Consequences

- `podman compose up --build` becomes the primary local container entrypoint
- localhost auth callbacks target `http://localhost:3000/v1/auth/callback/zitadel`
- local browser sessions use `porvi_session` unless the deployment is HTTPS
- the old tunnel-oriented compose flow is no longer the primary local runtime model
