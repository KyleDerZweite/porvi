# Porvi Deployment Model

This document records the accepted deployment direction for Porvi after the move
away from in-repo site workspaces.

Current runtime behavior and target topology are intentionally separated below.

## Current Implementation Boundary

Today the worker:

- resolves a revision contract payload
- materializes revision files under `.porvi/runtime`
- builds a static artifact
- writes preview and production artifacts to local publish roots
- can regenerate a host map for a static origin

That is still a local build/publish implementation. It is not yet the full
external-repo deployment runtime.

## Accepted Target Topology

The accepted lightweight topology is:

```text
Porvi API / worker
  -> fetch external site repository
  -> build static artifact in isolated workspace
  -> publish artifact to stable origin path
  -> sync verified production domains to Pangolin

Pangolin
  -> public edge, TLS, routing, optional auth/policy
  -> forwards to internal Porvi origin

Porvi origin (nginx)
  -> serves published static artifacts from generated host map
```

## Design Rules

- Porvi stays authoritative for project, deployment, domain, and publish state.
- Site repositories remain external to this monorepo.
- The build stage may combine external site-repo source with Porvi-managed
  structured contract inputs.
- The published output remains a static site artifact.
- The public edge should stay light. Avoid per-site app containers or a
  heavyweight orchestrator unless a later ADR requires it.

## Recommended Production Shape

### 1. Source Acquisition

For each deployment, the worker should resolve:

- repository URL
- branch, tag, or commit
- source credentials reference
- install command
- build command
- output directory

The checkout should happen in an ephemeral work directory, not in the Porvi
repo tree.

### 2. Build Execution

The build should run inside a light isolated runner, ideally a rootless Podman
container based on a standard builder image.

The goal is not a full CI platform. The goal is:

- predictable runtime
- no host-level source pollution
- limited secret exposure
- static artifact out

### 3. Artifact Publishing

The worker should publish to a stable structure like:

```text
/srv/porvi/published/projects/<projectId>/deployments/<deploymentId>/site
/srv/porvi/published/projects/<projectId>/current -> deployments/<deploymentId>/site
```

Preview output can continue to live under a separate preview root.

### 4. Edge Routing

Use Pangolin as the public edge and keep nginx as an internal origin.

Recommended split:

- Pangolin: public domains, TLS, certificates, routing, optional policy/auth
- nginx: static file serving from the published artifact path
- Porvi: desired-state generator for host maps and Pangolin resources

## Pangolin Integration

The preferred runtime integration is the Pangolin Integration API.

An operator-facing helper can exist later, but should remain a thin wrapper
around declarative state:

- `render`
- `diff`
- `apply`

The helper should not replace Porvi as the source of truth.

## Scaffold In This Repo

This repo now includes scaffold files for the accepted direction:

- [nginx.conf](../nginx.conf)
  internal static origin example, no `sites/*` assumption
- [ops/pangolin/README.md](../ops/pangolin/README.md)
  Pangolin integration notes and expected usage
- [ops/pangolin/porvi-published-sites.blueprint.yaml](../ops/pangolin/porvi-published-sites.blueprint.yaml)
  template blueprint showing the intended edge resource shape
- [.env.example](../.env.example)
  reserved variables for external-repo build and Pangolin sync

These files are scaffolding only. They do not mean the worker already performs
external repo checkouts or Pangolin API sync end to end.

## Explicit Non-Goals For This Change

- no full external-repo build implementation yet
- no Pangolin API client yet
- no CLI helper yet
- no production-grade secret manager yet
- no preview-domain orchestration in Pangolin yet
