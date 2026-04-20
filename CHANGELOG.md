# Changelog

All notable changes to Porvi are recorded here. Historical entries may still
refer to `Grimoire` where they describe the pre-rebrand codebase. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project does
not yet follow semantic versioning — entries are grouped by date until a tagged
release exists.

## [Unreleased]

### Changed
- Rebranded the active repository from `Grimoire` to `Porvi`.
- Switched the full repository to `AGPL-3.0-only`.
- Removed the obsolete in-repo `sites/*` / `templates/*` workflow and its
  validation and scaffolding commands.

### Added
- New marketing landing page (`apps/landing`) ported from the Claude Design
  handoff bundle, with a session-aware nav CTA that swaps between **Sign in**
  and **Open console** based on the control-plane API.
- Root `CHANGELOG.md` (this file).

### Changed
- Renamed `apps/web` → `apps/landing` and `apps/dashboard` → `apps/console` to
  match the platform's surface vocabulary.
- Split the landing page into a layout, components, and a single `global.css`
  rather than one monolithic `index.astro`.

## 2026-04-18

### Changed
- Adopted Podman-first local development (ADR-0002) and reorganized compose
  routing to be driven by site directories.
- Refreshed platform documentation and governance (ADR-0001).

### Added
- Platform workspace and structured-project contracts under
  `packages/product-core`.
