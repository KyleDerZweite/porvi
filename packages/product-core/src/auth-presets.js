export function createZitadelProviderPreset({
  key = 'zitadel',
  displayName = 'ZITADEL',
  issuer,
  clientId,
  clientSecretRef,
  loginHintAllowed = true,
} = {}) {
  if (!issuer) {
    throw new Error('createZitadelProviderPreset requires an issuer.');
  }

  if (!clientId) {
    throw new Error('createZitadelProviderPreset requires a clientId.');
  }

  if (!clientSecretRef) {
    throw new Error('createZitadelProviderPreset requires a clientSecretRef.');
  }

  return {
    key,
    kind: 'zitadel',
    display_name: displayName,
    issuer,
    client_id: clientId,
    client_secret_ref: clientSecretRef,
    scopes: ['openid', 'profile', 'email', 'offline_access'],
    pkce_required: true,
    authorization_params: loginHintAllowed
      ? {
          prompt: 'login',
        }
      : {},
    claims_mapping: {
      subject: 'sub',
      email: 'email',
      email_verified: 'email_verified',
      preferred_username: 'preferred_username',
      display_name: 'name',
      given_name: 'given_name',
      family_name: 'family_name',
      picture: 'picture',
      locale: 'locale',
      roles: 'urn:zitadel:iam:org:project:roles',
    },
    provisioning: {
      jit_user_creation: true,
      jit_workspace_membership: true,
      allow_account_linking: true,
      auto_create_personal_workspace: true,
      default_workspace_role: 'member',
      require_verified_email: true,
    },
    role_mapping: [
      {
        source: 'claim_contains',
        claim: 'urn:zitadel:iam:org:project:roles',
        match: 'workspace_owner',
        grants: ['workspace_owner'],
        priority: 100,
      },
      {
        source: 'claim_contains',
        claim: 'urn:zitadel:iam:org:project:roles',
        match: 'workspace_admin',
        grants: ['workspace_admin'],
        priority: 90,
      },
      {
        source: 'claim_contains',
        claim: 'urn:zitadel:iam:org:project:roles',
        match: 'project_creator',
        grants: ['project_creator'],
        priority: 80,
      },
      {
        source: 'provider_default',
        match: 'authenticated',
        grants: ['member'],
        priority: 10,
      },
    ],
    organization_resolution: {
      mode: 'provider_org',
      claim: 'urn:zitadel:iam:user:resourceowner:id',
    },
    enabled: true,
  };
}
