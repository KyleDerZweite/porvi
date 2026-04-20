# ADR 0006: Porvi Rebrand

- Status: accepted
- Date: 2026-04-19

## Context

The active platform repository moved from the legacy `Grimoire` identity to the
`Porvi` identity, but the codebase, docs, package scopes, and runtime defaults
still used the old name in many places.

That left the repo with conflicting public identity and stale operational
strings.

## Decision

Adopt `Porvi` as the canonical repository and platform identity.

- package scopes use `@porvi/*`
- runtime defaults use `.porvi/`
- the default session cookie uses `porvi_session`
- public docs, contracts, and UI copy use `Porvi`

## Consequences

- the rename is a clean break rather than a compatibility alias layer
- future docs and code should treat `Grimoire` only as historical context
- any remaining legacy references should be removed or explicitly marked as
  historical
