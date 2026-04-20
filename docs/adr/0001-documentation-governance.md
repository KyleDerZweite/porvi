# ADR 0001: Documentation Governance

- Status: accepted
- Date: 2026-04-18

## Context

The repo shifted from a simple static-site-factory framing to a contract-first creator-site platform with a DB-backed control plane, working dashboard, structured project contract, and runtime services around static Astro output.

The older instruction and documentation shape no longer gave agents a reliable hierarchy for deciding what was canonical, how docs should be updated, or where durable decisions should be recorded.

## Decision

Use this documentation hierarchy:

1. code, schemas, and machine-readable contracts
2. `docs/SPEC.md`
3. `docs/PRODUCT.md`
4. `docs/ARCHITECTURE.md`
5. `README.md`
6. `docs/VISION.md`
7. dated notes in `docs/notes/`

Use `AGENTS.md` as the top-level agent instruction file for repo-wide working rules.

Keep `CLAUDE.md` only as a pointer that tells Claude to read `AGENTS.md` first.

Record durable repo-level decisions in `docs/adr/` using numbered Architecture Decision Records.

## Consequences

- agents must verify repo truth in code before updating narrative docs
- documentation changes must distinguish current behavior from planned direction
- tenant-specific operational notes stay out of canonical setup guides
- future durable decisions should be easier to find, review, and supersede explicitly
