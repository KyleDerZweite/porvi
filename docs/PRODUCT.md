# Porvi Product

## Product Definition

Porvi is a contract-first creator-site platform.

The product exists to ship creator websites that still feel authored and
specific, while giving the platform a stable structured-project contract for
editing, validation, deployment, auth, and future AI workflows.

The core promise is:

> Ship a website that feels custom-built without turning every update into a
> custom-dev maintenance problem.

## Source Of Truth

The source-of-truth hierarchy is:

1. code, schemas, and checked-in contracts
2. [Platform Spec](./SPEC.md)
3. this product document

If prose here drifts from enforced contracts, the code and schemas win.

## Product Boundary

The static Astro site is the output artifact, not the whole product.

Porvi owns the platform around that artifact:

- auth and sessions
- workspaces and projects
- revisions and deployments
- domains and assets
- AI requests and job execution
- the structured-project contract consumed by site repositories

Published sites are expected to be built from external site repositories and
served as static artifacts through lightweight origin and edge infrastructure.

## Current Repo Boundary

This repository does **not** host site workspaces under `sites/*`.

Instead, the repo contains:

- `apps/api`
  the control plane
- `apps/console`
  the current operator/admin UI
- `apps/landing`
  the marketing surface plus session bootstrap/auth gate
- `packages/product-core`
  the canonical structured-project contract for external site repositories

External site repositories are the normal consumer of the contract package. They
remain responsible for their own implementation details above the stable Porvi
contract surface.

## Structured Project Contract

The contract surface is centered on:

- `@porvi/product-core`
- `porvi.project.mjs`
- `src/content/site.mjs`

This contract provides stable project metadata, archetype defaults, SEO and
theme tokens, and structured site content for profile and page-level sections.

Supported archetypes currently include:

- `link-hub`
- `portfolio`
- `creator-site`

## Customization Model

The preferred model is `contract base + custom code`.

That does **not** mean sites should become generic. The contract gives Porvi a
durable platform surface, while renderer extension, implementation-specific
code, and future AI-assisted workflows preserve a highly individualized result.

## Dashboard Position

`apps/console` is already a working operator/admin control plane.

It supports workspace and project creation, structured editing, domains,
deployments, and AI request intake. It should be documented as real current
runtime, not as a future placeholder, while still leaving room for more
customer-facing surfaces later.

## AI Posture

Current state:

- the API accepts AI requests
- AI requests are stored with scope and review settings
- the embedded/local worker currently advances queued execution to `needs_review`

Planned direction:

- supervised generation and review workflows
- revision-producing AI changes
- explicit approval and apply flows before publish

Current behavior and planned direction must stay clearly separated in docs.

## Contract Sources Of Truth

- [Platform Spec](./SPEC.md)
- [OpenAPI contract](./contracts/openapi.yaml)
- [Project manifest schema](./contracts/project-manifest.schema.json)
- [Site content schema](./contracts/site-content.schema.json)
- [Auth provider schema](./contracts/auth-provider.schema.json)
- [Zitadel provider example](./contracts/zitadel-provider.example.json)
