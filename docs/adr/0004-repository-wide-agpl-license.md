# ADR 0004: Repository-Wide AGPL License

- Status: accepted
- Date: 2026-04-19

Supersedes `0003-repository-licensing-model.md`.

## Context

The repository previously used a mixed-license model that split software,
templates, and creator or site assets across different legal terms.

Porvi is now the active platform repo, and the repository boundary has been
reduced to platform code, platform docs, contracts, and related runtime assets.
The mixed model no longer matches the desired repo policy.

## Decision

License the entire repository under `AGPL-3.0-only`.

- all tracked files in the repo are covered by AGPL
- there are no template, demo, media, or branding carve-outs in this repo
- canonical license texts live in `LICENSE` and `LICENSES/AGPL-3.0-only.txt`
- machine-readable licensing metadata remains in `REUSE.toml`

## Consequences

- downstream users receive one consistent repo-wide license
- the old PolyForm and restricted-asset model is no longer part of the active
  repo policy
- future additions to the repo should assume full AGPL coverage unless a newer
  ADR changes that decision
