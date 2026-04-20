# ADR 0007: External Repo Builds With Origin And Pangolin Edge

- Status: accepted
- Date: 2026-04-20

## Context

Porvi no longer treats in-repo `sites/*` workspaces as the deployment source.
Creator sites now live in external repositories, but parts of the repo still
implied an older deployment shape:

- nginx config assumed `Host -> /sites/<name>/dist`
- the worker model was still framed around repo-local site/template assumptions
- edge routing was described as a local host-map concern rather than a distinct
  origin-plus-edge setup

The deployment boundary needs to stay light, but it also needs to match the new
external-repository model and existing self-hosted infrastructure.

## Decision

Adopt a lightweight four-stage deployment model:

1. source acquisition
2. build execution
3. artifact publishing
4. edge routing

The durable repo-level decisions are:

- Porvi remains the source of truth for projects, revisions, deployments,
  domains, and publish state.
- Deployment builds are expected to fetch site source from an external
  repository rather than an in-repo site workspace.
- Build execution should happen in an isolated ephemeral workspace rather than
  directly inside the platform repo tree.
- Production publish writes a static artifact to a stable published path and
  promotes a `current` artifact pointer for the project.
- nginx is reduced to an internal static origin that serves published artifacts
  from a generated host map.
- Pangolin is the preferred public edge for verified production domains:
  certificates, public routing, and optional access policy live there.
- Pangolin integration should be declarative. The preferred runtime path is the
  Pangolin Integration API. A CLI helper may exist later as an operator-facing
  convenience wrapper, not as the core source of truth.
- Preview deployments stay out of Pangolin in the initial model unless a later
  ADR chooses otherwise.

## Consequences

- the old `Host -> /sites/<name>/dist` nginx model is obsolete
- deployment concerns should be separated into fetch, build, publish, and edge
  sync adapters
- external site repositories become the normal deployment input, while Porvi
  continues to own the structured contract and deployment metadata
- production edge sync should target Pangolin resources or blueprints derived
  from Porvi state
- this ADR establishes the target deployment boundary, but does not require the
  full end-to-end runtime implementation to land in the same change
