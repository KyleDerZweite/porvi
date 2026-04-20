# ADR 0003: Repository Licensing Model

- Status: superseded
- Date: 2026-04-19

Superseded by `0004-repository-wide-agpl-license.md`.

## Context

This ADR recorded the previous mixed-license model for the repository.

The repo has since moved to a repository-wide `AGPL-3.0-only` model, so this
decision is retained only as historical context.

## Decision

The repo used a mixed-license model:

- default source code, configuration, contracts, scripts, templates, and
  documentation are licensed under PolyForm Noncommercial 1.0.0
- creator/site media and branding assets used a separate restricted asset license
- machine-readable licensing metadata lives in `REUSE.toml`
- full license texts live in `LICENSES/`

## Consequences

- this ADR no longer describes the current repository state
- repo-wide licensing decisions now live in `0004-repository-wide-agpl-license.md`
