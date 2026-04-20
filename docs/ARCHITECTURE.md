# Porvi Architecture

## Overview

Porvi is a contract-first creator-site platform whose output artifact remains a
static Astro site.

The current runtime is split into:

- a control-plane API
- an operator/admin UI
- a marketing surface plus session bootstrap/auth gate
- an embedded or local worker
- shared packages for contracts, auth, data access, and deployment orchestration

The platform exists around the static site artifact. It manages identity,
permissions, project state, revisions, deployments, domains, assets, and AI
requests without turning the published site itself into a dynamic runtime app.

## System Shape

```text
Browser
  -> apps/landing
     marketing surface plus session bootstrap/auth gate
  -> apps/console
     operator/admin UI
  -> apps/api
     control plane, auth callback origin, session authority
  -> apps/worker
     embedded/local job execution
  -> static Astro output
     preview and published site artifacts
```

## Runtime Components

### `apps/api`

`apps/api` is the control plane.

It exposes:

- auth provider discovery
- OIDC login, callback, logout, and session bootstrap
- authenticated user and session endpoints
- workspaces and projects
- revisions and deployments
- domains and assets
- AI request creation, listing, lookup, and status streaming
- capability reporting for the current runtime

The API is session-first for browser clients. It exchanges upstream OIDC flows
server-side and sets the Porvi session cookie on the API origin.

### `apps/console`

`apps/console` is the current operator/admin UI.

It already supports workspace and project creation, structured editing, revision
creation, domain management, deployment requests, and AI request intake.

### `apps/landing`

`apps/landing` is the marketing surface plus session bootstrap/auth gate.

Its current role is to:

- explain the platform at a high level
- call `GET /v1/session` to detect an authenticated browser session
- route signed-in users toward the console
- route signed-out users into the API-driven auth flow

### `apps/worker`

`apps/worker` runs the embedded/local job runner.

Today it polls due jobs from the database, executes preview and production
deployment jobs, verifies domains, and moves queued AI requests into
`needs_review`.

## Shared Package Roles

- `packages/product-core`
  structured-project contract, validation, and archetype defaults for external
  site repositories
- `packages/platform-contracts`
  shared API and platform types/zod schemas
- `packages/platform-auth`
  OIDC and session services
- `packages/platform-db`
  database bootstrap and schema
- `packages/platform-core`
  repository, build, deployment, and job-runner abstractions

## Structured Project Contract

The stable project contract is centered on:

- `porvi.project.mjs`
- `src/content/site.mjs`
- `@porvi/product-core`

This repo owns that contract, but the normal consumer is now an external site
repository rather than an in-repo `sites/*` workspace.

Revisions capture meaningful changes around the normalized contract payload and
become the source for deployment builds.

## Data Model

The current platform data model includes:

- users and identities
- sessions
- workspaces and memberships
- projects and project memberships
- revisions
- deployments
- domains
- assets
- AI requests
- jobs

## Build, Deploy, And Publish Flow

The implemented flow is:

1. A revision exists for a project.
2. The API creates a deployment record and enqueues a deployment job.
3. The worker resolves the normalized revision contract payload.
4. `LocalBuildService` materializes revision files under `.porvi/runtime`.
5. The build service writes a preview or production static artifact.
6. Production publish promotes the artifact to the project's current published
   path.
7. If host-map syncing is configured, the worker regenerates the ingress map
   from verified published domains.

Preview deployments currently point back into the app/console flow for
inspection. Production deployments optionally resolve a published URL from the
project's primary verified domain.

## Artifact Storage

Current local defaults use `.porvi/` paths for:

- SQLite state
- preview artifacts
- published artifacts
- runtime materialization for revision builds

The repo working tree is the source for platform code and contracts. Built
preview and publish output is stored outside repo-tracked source paths.

## Environment And Config Model

The current apps read `PLATFORM_*` configuration for runtime behavior.

Important current variables include:

- `PLATFORM_PORT`
- `PLATFORM_DATABASE_DIALECT`
- `PLATFORM_SQLITE_PATH`
- `PLATFORM_DATABASE_URL`
- `PLATFORM_PROVIDER_CONFIG_DIR`
- `PLATFORM_REPO_ROOT`
- `PLATFORM_PUBLIC_API_URL`
- `PLATFORM_PUBLIC_APP_URL`
- `PLATFORM_PUBLIC_WEB_URL`
- `PLATFORM_SESSION_COOKIE_NAME`
- `PLATFORM_SESSION_TTL_SECONDS`
- `PLATFORM_PUBLISH_ROOT`
- `PLATFORM_PREVIEW_ROOT`
- `PLATFORM_NGINX_MAP_PATH`

## Near-Term Evolution

These are near-term pressures implied by the current implementation, not
guarantees:

- richer AI generation/review/apply workflows beyond the current
  `needs_review` placeholder step
- a more fully productized customer-facing UI on top of the same contracts
- alternative worker/runtime shapes for deployments where PostgreSQL-backed
  queue infrastructure is preferable
