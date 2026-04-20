# ADR 0005: External Site Repositories

- Status: accepted
- Date: 2026-04-19

## Context

The repo still contained workflow assumptions for in-repo `sites/*` workspaces,
site validation commands, and local scaffolding scripts even though creator
sites now live outside this monorepo.

That mismatch caused stale docs, broken validation commands, and a repo boundary
that no longer reflected current practice.

## Decision

Treat external repositories as the normal home for creator sites.

- remove the in-repo `sites/*` workspace model
- remove local site scaffolding and validation commands from this repo
- keep `packages/product-core` as the canonical structured-project contract for
  external site repositories

## Consequences

- this repo now focuses on the platform runtime, docs, and shared contracts
- external site repositories remain the primary consumer of the Porvi contract
- docs and tooling should no longer assume in-repo site workspaces exist
