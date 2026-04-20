# AGENTS.md

## Start Here

Read this file before making changes in the repository.

Porvi is a contract-first creator-site platform. Static Astro output remains the deployment artifact, but the repo now includes the platform around that artifact:

- `apps/api` is the control plane
- `apps/console` is the current operator/admin UI
- `apps/landing` is the marketing surface plus session bootstrap/auth gate
- `packages/product-core` defines the structured project contract for external site repositories

## Source Of Truth

Use this hierarchy when reading or updating the repo:

1. Code, schemas, and checked-in machine-readable contracts
2. `docs/SPEC.md`
3. `docs/PRODUCT.md`
4. `docs/ARCHITECTURE.md`
5. `README.md`
6. `docs/VISION.md`
7. dated notes under `docs/notes/`

If prose drifts from enforced contracts, code and schemas win.

## Working Rules

- Do not describe the repo as a simple static site factory.
- Do not understate `apps/console`; it is already a working operator/admin UI.
- Treat the structured project contract as the first-class platform path.
- Treat external site repositories as the normal consumer of that contract.
- Keep “current state” separate from “planned direction,” especially around AI workflows and future product surfaces.
- Prefer repo-truth over historical wording. Inspect the code before repeating old claims.

## Docs Rules

When editing docs:

- keep terminology consistent with the current platform language:
  - `contract-first creator-site platform`
  - `static Astro output` or `static site artifact`
  - `control plane` for `apps/api`
  - `dashboard` or `operator/admin UI` for `apps/console`
  - `marketing surface plus session bootstrap/auth gate` for `apps/landing`
  - `structured project`
  - `external site repository`
- avoid stale phrases unless explicitly qualified:
  - `site factory`
  - `thin shell`
  - `minimal dashboard`
  - `no database`
  - `no admin panel`
  - `future dashboard`
- keep `README.md` short and contributor/operator-oriented
- keep `docs/VISION.md` principle-level, not implementation inventory
- keep `docs/ARCHITECTURE.md` focused on runtime that actually exists in the repo
- keep `docs/ZITADEL_SETUP.md` generic; tenant-specific probe data belongs in `docs/notes/`

Before finalizing docs work, run the most relevant checks:

```bash
rg -n "No database|no admin panel|thin shell|minimal dashboard|docker-compose.yml|nginx.conf" README.md docs
```

Add narrower `rg` checks when a change touches a specific topic such as auth, AI, or deployment wording.

## ADR Rules

Use an ADR for durable decisions that affect architecture, product boundaries, workflows, or documentation governance.

Create or update ADRs when you:

- choose between meaningful architectural options
- lock a repo-wide docs/process rule
- change a public platform boundary or runtime model
- decide how current behavior should be interpreted long-term

Do not write an ADR for routine edits, bug fixes, copy changes, or small implementation details.

### ADR Location

Store ADRs in `docs/adr/`.

### ADR Naming

Use zero-padded numeric prefixes:

- `0001-short-title.md`
- `0002-another-decision.md`

If a decision supersedes an older ADR, add a note in both files.

### ADR Structure

Each ADR should include:

- title
- status: `proposed`, `accepted`, `superseded`, or `rejected`
- date
- context
- decision
- consequences

Keep ADRs short and concrete. Record the decision that was actually made, not a long brainstorming log.

## Current ADR Baseline

Start from these repo-level decisions unless a newer ADR supersedes them:

- `docs/adr/0001-documentation-governance.md`
- `docs/adr/0002-podman-first-local-compose.md`


## Common Commands

```bash
pnpm run dev
pnpm run dev:api
pnpm run dev:console
pnpm run dev:landing
pnpm test
pnpm run build
```
