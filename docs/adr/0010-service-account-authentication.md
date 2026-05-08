# ADR 0010: Service-Account Authentication

- Status: accepted
- Date: 2026-05-06
- Related: ADR 0009 (Porvi CLI as a Rust binary),
  ADR 0007 (external repo builds with origin and Pangolin edge)

## Context

The platform currently has only one authentication path: interactive
OIDC against Zitadel (or any configured provider), exchanged
server-side for an HTTP-only `porvi_session` cookie. That works for
the browser console and the marketing landing's session bootstrap.

Two new use cases now need a non-interactive credential:

1. **The Porvi CLI** must be able to call the platform API
   (`POST /v1/projects/:projectId/deployments`, etc.) without a
   browser. Today the only path is interactive OIDC with a hijacked
   cookie — viable but ugly and not safely automatable.
2. **The platform itself must call Pangolin** to provision routes and
   certs whenever a domain becomes verified (ADR 0007). Pangolin's
   API requires its own credentials, scoped to a specific Pangolin
   org.

These are *two distinct machine identities*, with different trust
boundaries, blast radii, and rotation policies. Earlier discussion
risked conflating them into one "machine account" — a category mistake
that would have made both harder to reason about.

The platform's session schema already includes
`sessionSubjectType ∈ {'human', 'service'}` (forward-looking
infrastructure that nothing currently emits).

## Decision

Introduce **two independent service-account primitives**:

### A. Pangolin machine account (platform → Pangolin)

- A dedicated Pangolin org named `porvi-platform`, separate from any
  user-owned Pangolin org (e.g. `kylehub`).
- One Pangolin API token issued in that org, used by the platform to
  call Pangolin's API for resource/cert provisioning.
- Stored in platform env as `PLATFORM_PANGOLIN_API_TOKEN` and
  `PLATFORM_PANGOLIN_ORG_ID` — slots already reserved in
  `.env.example`.
- Rotation: manual today, via Pangolin's UI; automation deferred.
- Blast radius if leaked: limited to the Porvi-managed Pangolin org;
  cannot affect user-owned orgs on the same Pangolin instance.

### B. Porvi service tokens (CLI → platform)

- A new database table `service_tokens` with columns:
  `id`, `workspaceId`, `tokenHash`, `name`, `lastUsedAt`,
  `revokedAt`, `createdAt`, `createdBy`.
- Token format: `porvi_svc_<base62>`. The `_svc_` infix marks them as
  service credentials; this is *not* a personal-access-token (the
  audience is automation, not a human's pocket).
- Tokens are **workspace-scoped**, not global. A token issued for the
  `kyle` workspace can act on any project within it; it cannot reach
  another workspace.
- Endpoints:
  - `POST /v1/workspaces/:id/tokens` — create. Plaintext returned
    once.
  - `GET /v1/workspaces/:id/tokens` — list (no plaintext).
  - `DELETE /v1/tokens/:id` — revoke.
- API middleware: when an `Authorization: Bearer porvi_svc_<…>` header
  is present, look up the token by hash and attach a synthetic session
  with `sessionSubjectType = 'service'` and the token's `workspaceId`
  in scope. The existing `subjectType='service'` enum value is
  finally produced by code and consumed downstream by repository-layer
  authorization checks.
- Console UI: a "Tokens" panel in workspace settings — create, list,
  revoke. Plaintext is shown exactly once on creation.

### Deliberate non-decisions

- **No global / org-level Porvi tokens.** Workspace-scoped only.
- **No automatic token rotation.** Users revoke and reissue.
- **No token expiry by default.** Optional `expiresAt` may be added
  later if a use case demands it.
- **No OIDC client-credentials flow yet.** A future ADR may add Zitadel
  service-user support if the audience grows beyond CLI-shaped clients.

## Consequences

- The CLI gets a clean non-interactive auth path: `porvi login`
  performs OIDC interactively once, then mints a service token via
  the new endpoint and stores it in `~/.config/porvi/credentials`.
  Subsequent commands are pure bearer-token requests with no browser.
- The platform gets a clean non-interactive auth path *outbound* via
  the Pangolin token, decoupled from any user identity.
- The two boundaries can be rotated, audited, and revoked
  independently. A leaked CLI service token doesn't grant any access
  to Pangolin; a leaked Pangolin token doesn't grant any access to the
  Porvi API.
- The schema migration for `service_tokens` is small and additive.
- Existing browser-based session flows are unaffected.
- The work is sequenced: Pangolin machine account is config-only and
  can ship today; Porvi service tokens require a small platform feature
  (table, endpoints, middleware, UI panel) that lands before the CLI
  ships its `porvi login` and `porvi deploy` commands.
