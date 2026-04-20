# Pangolin Scaffold

This directory contains scaffolding for the accepted Porvi deployment shape:

- Porvi is the deployment source of truth
- nginx is the internal static origin
- Pangolin is the public edge

## Intended Usage

Porvi should eventually render one public HTTP resource per verified production
domain and point it at the internal origin service.

Preferred automation path:

- Porvi renders desired resource state
- Porvi applies it through the Pangolin Integration API

Optional operator helper path:

- render a blueprint file
- inspect or diff it
- apply it with `pangolin apply blueprint --file ...`

The CLI path is a convenience layer only. It should not become the primary
source of truth for deployment state.

## Site Target Model

The blueprint template assumes a Pangolin site that can reach the internal
origin service:

- `Local Site` when Pangolin runs on the same host or network as the origin
- `Newt Site` when the origin sits on a different node or remote network

## What Is Deliberately Missing

- no generated blueprints from live Porvi state yet
- no Pangolin API client yet
- no role or policy mapping yet
- no preview-resource orchestration yet
