# Porvi Platform Specification

## Purpose

This document defines the backend and domain contracts for Porvi as a product.
It intentionally does **not** define frontend layouts, component design, or UX
implementation details.

The goal is a contract-first creator-site platform that can be implemented with
different frontend surfaces while keeping backend, auth, storage, and
structured-project formats stable.

## Normativity

This document is canonical prose for platform behavior, but the hard source of
truth remains the code, schemas, and checked-in machine-readable contracts.

If prose here drifts from enforced contracts, the code and schemas win.

## Product Boundary

Porvi is a multi-tenant contract-first creator-site platform for
custom-feeling static creator websites.

It must support:

- self-hosted single-tenant or multi-tenant deployments
- hosted SaaS deployments
- structured editing of creator sites
- preview and publish workflows
- AI-assisted change requests with review gates
- exportable site source and static output

It must not require:

- a custom password system inside Porvi itself
- frontend-specific implementation choices
- runtime site hosting beyond static output

## Core Contract Layers

The platform is split into four contract layers:

1. identity and session layer
2. control-plane API
3. structured-project contract
4. build and deployment contract

The static website remains the output artifact. Everything else exists to manage
identity, permissions, project data, previews, publishing, and AI workflows
around that artifact.

## Identity And Auth

### Native Auth Model

Porvi treats **OIDC as the native identity layer**.

The platform does not implement first-party passwords. Normal end-user sign-in
happens through the configured OIDC provider.

Required browser flow:

1. user clicks `Sign In`
2. frontend calls `POST /v1/auth/login`
3. frontend redirects the browser to the returned `authorizationUrl`
4. user authenticates in the upstream provider UI
5. provider redirects to `GET /v1/auth/callback/{providerKey}`
6. Porvi creates the application session and redirects to the requested app location
7. the console or marketing surface bootstraps authenticated state from
   `GET /v1/session`

Browser sign-in must use:

- Authorization Code Flow
- PKCE
- server-side code exchange
- secure HTTP-only application session cookies

The frontend must never be required to store refresh tokens.

### Session Contract

The Porvi API is session-first for browsers.

Upstream OIDC tokens are exchanged server-side and represented in Porvi by an
application session.

Required session properties include:

- `session_id`
- `subject_id`
- `subject_type`
- `provider_key`
- `provider_user_id`
- `workspace_ids`
- `active_workspace_id`
- `issued_at`
- `expires_at`
- `last_seen_at`
- `amr`

### Registration CTA Contract

Porvi must not hardcode a signup CTA.

Each configured provider declares `registration_mode`, which controls frontend
behavior:

- `disabled`
- `invite_only`
- `provider_controlled`
- `open`

This is configuration-driven because upstream OIDC providers differ widely and
the same provider can be configured differently per installation.

### Supported Provider Kinds

- `zitadel`
- `generic-oidc`

ZITADEL is the default reference provider and must be supported natively.

## Provider Configuration Contract

Each auth provider config must define:

- `key`
- `kind`
- `display_name`
- `registration_mode`
- `issuer`
- `client_id`
- `client_secret_ref`
- `scopes`
- `pkce_required`
- `authorization_params`
- `claims_mapping`
- `provisioning`
- `role_mapping`
- `organization_resolution`
- `enabled`

`claims_mapping` maps upstream claims into Porvi’s identity model.

`provisioning` controls first-login behavior such as JIT user creation,
workspace membership, and verified-email requirements.

`role_mapping` maps provider claims to Porvi roles through ordered rules.

## Structured Project Contract

The stable structured-project surface is centered on:

- `porvi.project.mjs`
- `src/content/site.mjs`
- `@porvi/product-core`

This repo owns that contract, but external site repositories are the normal
consumer. Sites no longer live inside this monorepo.

The contract must remain suitable for:

- validation
- editing
- revision capture
- deployment builds
- future AI-assisted workflows

## Deployment Contract

The deployment flow is:

1. a revision exists for a project
2. the API creates a deployment record and enqueues a deployment job
3. the worker resolves the normalized revision contract payload
4. the build service materializes revision files under `.porvi/runtime`
5. the build service writes a static artifact to the preview or publish root
6. production publish promotes the artifact to the project’s current published
   path

The implementation may evolve, but the contract boundary remains:

- revision in
- static artifact out
- preview and production deployment records tracked by the control plane

## Runtime Surfaces

The current runtime surfaces are:

- `apps/api`
- `apps/console`
- `apps/landing`
- `apps/worker`

The current console is an operator/admin control plane built on these contracts.
This specification does not require it to be the final customer-facing product
surface.
