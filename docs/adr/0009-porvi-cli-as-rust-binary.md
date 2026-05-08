# ADR 0009: Porvi CLI as a Separate Rust Binary

- Status: accepted
- Date: 2026-05-06
- Related: `Porvi/cli` ADR 0002 (implementation language Rust),
  `Porvi/cli` ADR 0006 (platform integration boundary),
  this repo's ADR 0008 (repo split)

## Context

Earlier roadmaps assumed the platform would grow a build/validate
engine internally and possibly expose a CLI as a thin wrapper. The
current direction inverts that: the CLI is the canonical
implementation of validation and build, and the platform's worker
**invokes the CLI as a subprocess**.

The reason for the inversion is structural. Sites are external
repositories (ADR 0005); their builds run arbitrary Node/Hugo/Zola
toolchains. Building those safely needs sandboxing primitives that are
much cleaner to express in Rust than in Node. Doing that work *once*
inside the CLI — and having the worker shell out — produces a single
correct implementation rather than two that drift.

That decision pushes onto this repo:

1. The platform stops trying to own a build/validate engine.
2. The platform's worker becomes orchestration only: clone repo →
   invoke `porvi build`/`porvi validate` → collect output → publish
   artifact.
3. Manifest schema details belong to the CLI, not the platform.

## Decision

The Porvi CLI is a separate codebase, hosted at `Porvi/cli`,
implemented in Rust, distributed as native per-target binaries, and
licensed Apache-2.0 (see CLI ADR 0004).

For this repository, the consequences are:

- **`packages/platform-core`** retains site-shape contracts that the
  *platform* needs (project, revision, deployment), but **stops
  carrying manifest-parsing or build-orchestration code**. Those
  responsibilities move to the CLI.
- **`apps/worker`** integrates by spawning the `porvi` binary as a
  subprocess. It does not import CLI crates, does not re-parse
  `porvi.toml`, and does not implement validation rules in
  TypeScript. The worker reads the CLI's `--json` output and treats it
  as the source of truth.
- **The worker pins a minimum CLI version.** A `PORVI_CLI_MIN_VERSION`
  config (e.g. `0.4.0`) is checked at worker startup. If the
  discovered binary is older, the worker refuses to run.
- **The worker discovers the CLI binary** in a controlled way. Order:
  1. `PORVI_CLI_BIN` env var (explicit path).
  2. A pinned binary inside the worker image (`/usr/local/bin/porvi`).
  3. The system `PATH` (last resort, intended for development).
- **Schema docs** live in the CLI repo. The platform repo's
  `docs/SPEC.md` cross-links to them; it does not duplicate them.

The full I/O contract — JSON envelope shape, commands, version
negotiation — is owned by the CLI repo and documented in `Porvi/cli`
ADR 0006.

## Consequences

- The platform repo gets smaller and more focused: orchestration,
  identity, persistence, and UI. No build engine.
- A class of bugs disappears: "the worker validated the manifest
  differently than the CLI did" cannot happen, because there is one
  validator.
- A new dependency appears: the worker's container image must include a
  pinned `porvi` binary at a known path. This is a small ops task,
  documented under ADR 0007's edge model.
- Local development of a site is genuinely identical to what the
  worker does. Whatever `porvi validate` says locally is what the
  platform will say on publish.
- Future split-out of the worker into its own service (e.g. moving it
  off Node entirely) costs nothing at this boundary — it's already
  shell-shaped.
- The platform must accept being a slower-moving consumer of the CLI's
  API. Breaking changes to the CLI's `--json` envelope require a
  coordinated update; the CLI's `io_version` field flags these
  explicitly so the worker can refuse incompatible binaries cleanly.
