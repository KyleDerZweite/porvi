# ADRs

This directory stores Architecture Decision Records for durable repo-level decisions.

## When To Add One

Add an ADR when a change locks in a meaningful decision about:

- architecture
- product boundaries
- documentation governance
- runtime or deployment model
- long-lived workflow/process rules

Do not add ADRs for routine edits or low-level implementation details.

## File Naming

Use zero-padded numeric prefixes:

- `0001-documentation-governance.md`
- `0002-runtime-model.md`

## Minimal Template

```md
# ADR 000X: Title

- Status: accepted
- Date: YYYY-MM-DD

## Context

What changed or why a decision was needed.

## Decision

The decision that was made.

## Consequences

What this enables, constrains, or rules out.
```

