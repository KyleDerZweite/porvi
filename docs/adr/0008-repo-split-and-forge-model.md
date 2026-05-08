# ADR 0008: Repo Split and Forge Model

- Status: accepted
- Date: 2026-05-06
- Supersedes (in part): the implicit "single repo on GitHub" assumption
  baked into earlier ADRs.

## Context

Porvi began as a single repository on GitHub containing the platform
(api, console, landing, worker), shared packages, ops scaffolding, and
documentation. Two pressures emerged:

1. **The CLI's needs diverge from the platform's.** The CLI is a
   developer tool installed on user machines, with permissive licensing
   needs (ADR 0009). The platform is a SaaS-shaped runtime with
   defensive licensing needs (ADR 0004). Forcing both into one repo
   forces one license to lose; either CLI adoption is taxed by AGPL
   review, or the platform loses SaaS-clone protection.
2. **GitHub no longer aligns with the project's values.** The `.de`
   domain, AGPL licensing, editorial brand, and the broader Porvi
   ethos point at a non-corporate, EU-aligned forge. Codeberg
   (Codeberg e.V., Germany, Forgejo-based, non-profit) fits cleanly.

A "split into N repos" temptation also exists. Splitting the marketing
landing or the console out of the platform was rejected: the landing
calls platform auth endpoints on every load and the console depends
directly on platform contracts and types. They are facets of the
platform, not separate products.

## Decision

### Repo split

Three top-level repositories, no more:

| Codeberg path        | License        | Contents                                                  |
| -------------------- | -------------- | --------------------------------------------------------- |
| `Porvi/porvi`        | AGPL-3.0-only  | The platform — `apps/api`, `apps/console`, `apps/landing`, `apps/worker`, all `packages/*`. |
| `Porvi/cli`          | Apache-2.0     | The Porvi CLI — Rust workspace, distributed as native binaries. |
| `Porvi/docs`         | CC-BY-4.0 + MIT | Public documentation site. **To be created when needed**, not pre-created. |

Each subfolder of the local workspace at `~/CodingProjects/porvi.de/`
maps to one repository. The workspace folder is **not** a meta-repo and
must not be `git init`'d.

The CLI lives in `Porvi/cli` from the first commit — not extracted later
from the platform monorepo.

### Forge model

- **Codeberg is the primary forge.** All issues, pull requests, releases,
  and contributor activity happen there.
- **GitHub is a discovery mirror only.** Each repository is mirrored
  read-only to `kylehub/porvi`, `kylehub/porvi-cli`, and (eventually)
  `kylehub/porvi-docs` under the existing `kylehub` GitHub
  organisation.
- The GitHub mirrors carry a top-of-README banner pointing at the
  Codeberg primary. Contributions opened on the mirrors are politely
  redirected.

### What does **not** split

The following surfaces stay inside `Porvi/porvi` and are not candidates
for extraction:

- `apps/landing` — it is the platform's session-bootstrap surface; calls
  `/v1/auth/providers` and `/v1/session` on load.
- `apps/console` — it is the platform's UI; depends directly on platform
  contracts and types.
- `packages/platform-contracts` — internal to the platform; not a public
  package.

## Consequences

- Different surfaces get the licensing they need without forcing
  compromise on each other.
- Issue trackers are scoped: a CLI bug doesn't sit next to 50
  platform issues, and vice versa.
- Each repo has independent versioning and release cadence. The CLI
  ships when it's ready; the platform ships when it's ready.
- Cross-cutting changes (e.g. a manifest schema bump) require a PR in
  the CLI followed by a CLI version pin update in the platform — an
  acceptable cost given the architecture is designed to make this
  rare (see ADR 0009).
- Codeberg has a smaller ecosystem than GitHub. The mirror keeps the
  GitHub footprint for discovery without giving GitHub the canonical
  history.
- A future change of forge primary (e.g. self-hosted Forgejo) is cheap:
  it's another remote on the same repos, not a re-architecture.
