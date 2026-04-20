# Zitadel Setup For Porvi

This document is the canonical generic setup guide for using Zitadel as an OIDC
provider for Porvi.

For dated environment-specific probe notes, use the files under `docs/notes/`.

## What Porvi Expects From An OIDC Provider

Porvi expects an OIDC provider that can support:

- Authorization Code Flow
- PKCE
- server-side code exchange
- standard discovery metadata
- browser sign-in that ends in a Porvi-managed HTTP-only session cookie

Porvi does not implement first-party passwords. Normal end-user sign-in happens
through the configured OIDC provider.

## Zitadel Application Setup

Create or update a Zitadel application for Porvi with these properties:

- Type: `OIDC`
- App kind: `Web`
- PKCE: enabled
- Code challenge method: `S256`
- Authentication method:
  - preferred for the current Porvi browser flow: public PKCE client
  - if you switch to confidential mode later, provide a real client secret and
    update the Porvi provider config accordingly

## Redirect And Logout URIs

Required callback pattern:

- local development API callback:
  `http://localhost:3000/v1/auth/callback/<providerKey>`
- deployed API callback:
  `https://api.<your-domain>/v1/auth/callback/<providerKey>`

Recommended post-logout targets:

- local console root:
  `http://localhost:5173/`
- deployed console root:
  `https://app.<your-domain>/`

The callback must terminate on the API origin, because Porvi completes the code
exchange server-side and sets the application session cookie there.

## Scopes

Recommended scopes:

- `openid`
- `profile`
- `email`
- `offline_access`

Additional scopes may be required if your deployment uses Zitadel management
APIs for operational verification or provisioning workflows.

## Role And Claim Mapping

Porvi supports two Zitadel-compatible role patterns:

1. native Zitadel project role claims
2. custom flat claims emitted through a Zitadel Action

The platform should be able to consume either:

- `urn:zitadel:iam:org:project:{projectId}:roles`
- `urn:zitadel:iam:org:project:roles`
- a configured custom claim such as `porvi_roles`

If you want explicit role mapping beyond the default authenticated-user
behavior, emit or map values such as:

- `workspace_owner`
- `workspace_admin`
- `project_creator`

## Registration And Frontend Behavior

Porvi frontend behavior is provider-driven, not hardcoded.

Each provider config declares `registration_mode`, which controls whether the
frontend should:

- show no signup CTA
- suppress signup unless a custom invite flow exists
- show a provider-owned signup route
- show normal open signup behavior

## Frontend Session Bootstrap Contract

The browser flow is:

1. User clicks `Sign In`
2. Frontend calls `POST /v1/auth/login` with the chosen provider key
3. Frontend redirects the browser to the returned authorization URL
4. User signs in through Zitadel
5. Zitadel redirects to the Porvi API callback
6. Porvi exchanges the code server-side, sets the HTTP-only session cookie, and
   redirects back to the requested app location
7. The console or marketing site bootstraps auth state from `GET /v1/session`

For the marketing surface:

- if `GET /v1/session` returns `200`, the primary CTA can become `Open console`
- if it returns `401`, the primary CTA should remain `Sign In`

## Service-User Guidance

A service user is optional for end-user browser login.

It is only needed if you want Porvi-adjacent ops tooling to inspect or verify
Zitadel tenant or project state through the management API.

If you use a service user:

- request the correct Zitadel API audience scopes
- grant only the org or project permissions needed for the inspection tasks you
  actually perform
- do not treat broader org-level access as required for basic browser auth

## Related Files

- canonical product and platform behavior: [SPEC.md](./SPEC.md)
- provider contract examples: [contracts/zitadel-provider.example.json](./contracts/zitadel-provider.example.json)
- environment-specific probe notes: `docs/notes/`
