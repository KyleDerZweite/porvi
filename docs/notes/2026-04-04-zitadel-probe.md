# Zitadel Probe Notes - 2026-04-04

This file preserves the dated tenant-specific probe information that used to live in `docs/ZITADEL_SETUP.md`.

It is not the canonical setup guide. Use [../ZITADEL_SETUP.md](../ZITADEL_SETUP.md) for the reusable Porvi setup contract.

## Probed State

### OIDC Discovery

The issuer probed on `2026-04-04` was:

- Issuer: `https://auth.kylehub.dev`
- Authorize: `https://auth.kylehub.dev/oauth/v2/authorize`
- Token: `https://auth.kylehub.dev/oauth/v2/token`
- Device authorization: `https://auth.kylehub.dev/oauth/v2/device_authorization`
- Userinfo: `https://auth.kylehub.dev/oidc/v1/userinfo`
- Introspection: `https://auth.kylehub.dev/oauth/v2/introspect`
- End session: `https://auth.kylehub.dev/oidc/v1/end_session`
- JWKS: `https://auth.kylehub.dev/oauth/v2/keys`

### Porvi OIDC App

Observed app/client details:

- Porvi OIDC client id: `367086772372373509`
- Token auth method for the Porvi config: `none`
- PKCE: `S256`

Interpretation at the time:

- treat the Porvi web app as a public PKCE client
- `registration_mode=invite_only`
- frontend should default to `Sign In`, not open signup

### Service User Probe

Observed service-user credentials and behavior:

- Client id: `api-playground`
- Client secret: configured and working for client credentials

Verified:

- `client_credentials` token minting worked
- `oidc/v1/userinfo` worked and identified the machine user as `API Playground`
- `GET /management/v1/projects/367086328984109061` worked

Project state readable with the then-current permission set:

- Project id: `367086328984109061`
- Name: `porvi`
- State: `PROJECT_STATE_ACTIVE`
- Project role assertion: `true`
- Project role check: `true`
- Has project check: `true`
- Private labeling setting:
  `PRIVATE_LABELING_SETTING_ALLOW_LOGIN_USER_RESOURCE_OWNER_POLICY`
- Resource owner: `350172011454070788`
- Created at: `2026-04-04T09:55:02.432692Z`
- Updated at: `2026-04-04T09:55:14.977762Z`

Still failing with the then-current service-user scope:

- `GET /management/v1/orgs/me` returned `403`
- Error: `No matching permissions found (AUTH-5mWD2)`
- `GET /management/v1/users/me` returned `403`
- `GET /management/v1/projects/367086328984109061/apps` returned `404`
- `GET /management/v1/projects/367086328984109061/apps/oidc` returned
  `Errors.App.NotExisting (QUERY-pCP8P)`

Observed token-shape notes:

- the minted access token worked against the management API when the
  `urn:zitadel:iam:org:project:id:zitadel:aud` audience was requested
- the machine user appeared to have visibility to the specific Porvi project record
- broader org-level and user-level inspection remained partial or unavailable

## Porvi-Side Files Referenced At The Time

- Provider bootstrap config:
  [configs/providers/zitadel.kylehub.json](/home/kyle/CodingProjects/porvi/configs/providers/zitadel.kylehub.json)
- Example env values:
  [.env.example](/home/kyle/CodingProjects/porvi/.env.example)
- Local env:
  [.env](/home/kyle/CodingProjects/porvi/.env)

## Frontend Flow Contract Snapshot

The flow captured at the time was:

1. user clicks `Sign In`
2. frontend calls `POST /v1/auth/login` with `providerKey=zitadel`
3. frontend redirects the browser to the returned `authorizationUrl`
4. user signs in on the ZITADEL login UI
5. ZITADEL redirects back to the Porvi callback
6. Porvi sets the HTTP-only session cookie and redirects to the dashboard

Marketing-site expectation at the time:

- `GET /v1/session` returning `200` should render `Open Dashboard`
- `GET /v1/session` returning `401` should render `Sign In`

## Reproducing The Probe

### OIDC Discovery

```bash
curl -fsSL https://auth.kylehub.dev/.well-known/openid-configuration
```

### Device Authorization Probe

```bash
curl -sS -H 'content-type: application/x-www-form-urlencoded' \
  -d 'client_id=367086772372373509&scope=openid%20profile%20email' \
  https://auth.kylehub.dev/oauth/v2/device_authorization
```

### Service User Token + Management API Check

```bash
TOKEN=$(curl -fsS \
  -u "api-playground:${PORVI_ZITADEL_SERVICE_USER_CLIENT_SECRET}" \
  -H 'content-type: application/x-www-form-urlencoded' \
  -d 'grant_type=client_credentials' \
  --data-urlencode 'scope=openid profile email urn:zitadel:iam:org:project:id:zitadel:aud' \
  https://auth.kylehub.dev/oauth/v2/token | python -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')

curl -i -H "Authorization: Bearer $TOKEN" \
  https://auth.kylehub.dev/management/v1/orgs/me
```

Project verification check used at the time:

```bash
curl -fsS -H "Authorization: Bearer $TOKEN" \
  https://auth.kylehub.dev/management/v1/projects/367086328984109061
```
