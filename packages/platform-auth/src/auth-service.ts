import { readFile } from 'node:fs/promises';

import {
  authorizationCodeGrant,
  buildAuthorizationUrl,
  calculatePKCECodeChallenge,
  discovery,
  randomPKCECodeVerifier,
  randomState,
} from 'openid-client';

import type { AuthProviderConfig } from '@porvi/platform-contracts';
import { PlatformError, PlatformRepository, slugify } from '@porvi/platform-core';

import { ProviderStore } from './provider-store.js';
import { createSessionToken, hashSessionToken } from './session.js';

export interface AuthServiceConfig {
  publicApiUrl: string;
  publicAppUrl: string;
  publicWebUrl: string;
  sessionTtlSeconds: number;
}

export class AuthService {
  constructor(
    private readonly repo: PlatformRepository,
    private readonly providerStore: ProviderStore,
    private readonly config: AuthServiceConfig
  ) {}

  async seedProviders() {
    await this.providerStore.seedFromFilesystem();
  }

  async listEnabledProviders() {
    const providers = await this.providerStore.listEnabled();
    return providers.map((provider) => ({
      key: provider.key,
      kind: provider.kind,
      displayName: provider.display_name,
      enabled: provider.enabled,
      loginHintSupported: true,
      workspaceDiscoveryMode: provider.organization_resolution.mode,
      registrationMode: provider.registration_mode,
    }));
  }

  async startLogin(input: {
    providerKey: string;
    redirectTo?: string;
    workspaceHint?: string;
  }) {
    const provider = await this.providerStore.getRequired(input.providerKey);
    const redirectTo = this.normalizeRedirectTo(input.redirectTo);
    const oidcConfig = await this.discoverProvider(provider);
    const codeVerifier = randomPKCECodeVerifier();
    const codeChallenge = await calculatePKCECodeChallenge(codeVerifier);
    const state = randomState();
    const redirectUri = this.getCallbackUrl(provider.key);

    await this.repo.createAuthTransaction({
      providerKey: provider.key,
      state,
      codeVerifier,
      redirectTo,
      workspaceHint: input.workspaceHint,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

    const authorizationUrl = buildAuthorizationUrl(oidcConfig, {
      redirect_uri: redirectUri,
      scope: provider.scopes.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      ...provider.authorization_params,
    });

    return {
      authorizationUrl: authorizationUrl.toString(),
      state,
    };
  }

  async handleCallback(providerKey: string, callbackUrl: string) {
    const provider = await this.providerStore.getRequired(providerKey);
    const oidcConfig = await this.discoverProvider(provider);
    const url = new URL(callbackUrl);
    const state = url.searchParams.get('state');

    if (!state) {
      throw new PlatformError('Missing callback state.', 400);
    }

    const transaction = await this.repo.getAuthTransactionByState(state);
    if (!transaction) {
      throw new PlatformError('Unknown or expired auth transaction.', 400);
    }

    const tokens = await authorizationCodeGrant(oidcConfig, url, {
      pkceCodeVerifier: transaction.codeVerifier,
      expectedState: transaction.state,
    });
    const claims = tokens.claims() as Record<string, unknown>;
    const normalized = this.extractIdentity(provider, claims);

    if (!normalized.email) {
      throw new PlatformError('Provider did not return an email claim.', 400);
    }

    const provisioned = await this.provisionUser(provider, normalized, transaction.workspaceHint ?? undefined);
    const sessionToken = createSessionToken();
    const expiresAt = new Date(Date.now() + this.config.sessionTtlSeconds * 1000).toISOString();

    const workspaceIds = await this.repo.listWorkspacesForUser(provisioned.userId);
    const activeWorkspaceId = workspaceIds[0]?.id ?? null;

    await this.repo.createSession({
      userId: provisioned.userId,
      providerKey: provider.key,
      providerUserId: normalized.subject,
      tokenHash: hashSessionToken(sessionToken),
      activeWorkspaceId,
      amr: ['oidc'],
      expiresAt,
    });
    await this.repo.deleteAuthTransaction(state);

    return {
      sessionToken,
      redirectTo: transaction.redirectTo ?? `${this.config.publicAppUrl}/`,
      expiresAt,
    };
  }

  async getSessionFromToken(sessionToken: string) {
    const tokenHash = hashSessionToken(sessionToken);
    const session = await this.repo.getSessionByTokenHash(tokenHash);
    if (!session) {
      return null;
    }

    if (Date.parse(session.expiresAt) <= Date.now()) {
      await this.repo.deleteSessionByTokenHash(tokenHash);
      return null;
    }

    await this.repo.touchSession(session.id);
    return this.repo.buildSessionDto(session);
  }

  async logout(sessionToken: string) {
    await this.repo.deleteSessionByTokenHash(hashSessionToken(sessionToken));
  }

  private async discoverProvider(provider: AuthProviderConfig) {
    return discovery(
      new URL(provider.issuer),
      provider.client_id,
      await this.resolveClientSecret(provider.client_secret_ref),
      undefined,
      {
        execute: [],
      }
    );
  }

  private getCallbackUrl(providerKey: string) {
    return `${this.config.publicApiUrl}/v1/auth/callback/${providerKey}`;
  }

  private normalizeRedirectTo(candidate?: string) {
    if (!candidate) {
      return `${this.config.publicAppUrl}/`;
    }

    const appOrigin = new URL(this.config.publicAppUrl).origin;
    const webOrigin = new URL(this.config.publicWebUrl).origin;

    if (candidate.startsWith('/')) {
      return new URL(candidate, this.config.publicAppUrl).toString();
    }

    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      throw new PlatformError('Unsupported redirect target.', 400);
    }

    if (parsed.origin !== appOrigin && parsed.origin !== webOrigin) {
      throw new PlatformError('Unsupported redirect target.', 400);
    }

    return parsed.toString();
  }

  private extractIdentity(provider: AuthProviderConfig, claims: Record<string, unknown>) {
    const claim = (key: string) => {
      const path = provider.claims_mapping[key];
      return path ? claims[path] : undefined;
    };

    return {
      subject: String(claim('subject') ?? claims.sub ?? ''),
      email: claim('email') ? String(claim('email')) : undefined,
      emailVerified: Boolean(claim('email_verified') ?? claims.email_verified ?? false),
      displayName: claim('display_name') ? String(claim('display_name')) : undefined,
      preferredUsername: claim('preferred_username')
        ? String(claim('preferred_username'))
        : undefined,
      pictureUrl: claim('picture') ? String(claim('picture')) : undefined,
      roles: this.extractRoles(provider, claims),
      claims,
    };
  }

  private extractRoles(provider: AuthProviderConfig, claims: Record<string, unknown>) {
    const keys = new Set<string>();
    if (provider.claims_mapping.roles) {
      keys.add(provider.claims_mapping.roles);
    }

    for (const key of Object.keys(claims)) {
      if (
        key === 'urn:zitadel:iam:org:project:roles' ||
        /^urn:zitadel:iam:org:project:[^:]+:roles$/.test(key)
      ) {
        keys.add(key);
      }
    }

    const values = [...keys].flatMap((key) => this.normalizeRoleValues(claims[key]));
    return [...new Set(values)];
  }

  private async provisionUser(
    provider: AuthProviderConfig,
    identity: {
      subject: string;
      email?: string;
      emailVerified: boolean;
      displayName?: string;
      preferredUsername?: string;
      pictureUrl?: string;
      roles: string[];
      claims: Record<string, unknown>;
    },
    workspaceHint?: string
  ) {
    const existingIdentity = await this.repo.findIdentity(provider.key, identity.subject);
    let userId = existingIdentity?.userId ?? null;

    if (
      !userId &&
      provider.provisioning.allow_account_linking &&
      identity.email &&
      identity.emailVerified
    ) {
      const existingUser = await this.repo.findUserByEmail(identity.email);
      if (existingUser) {
        userId = existingUser.id;
      }
    }

    if (!userId) {
      if (!provider.provisioning.jit_user_creation) {
        throw new PlatformError('User provisioning is disabled.', 403);
      }

      if (provider.provisioning.require_verified_email && !identity.emailVerified) {
        throw new PlatformError('Verified email is required for sign-in.', 403);
      }

      const createdUser = await this.repo.createUser({
        email: identity.email!,
        emailVerified: identity.emailVerified,
        displayName: identity.displayName ?? null,
        preferredUsername: identity.preferredUsername ?? null,
        pictureUrl: identity.pictureUrl ?? null,
      });
      userId = createdUser.id;
    } else {
      await this.repo.updateUser(userId, {
        emailVerified: identity.emailVerified,
        displayName: identity.displayName ?? null,
        preferredUsername: identity.preferredUsername ?? null,
        pictureUrl: identity.pictureUrl ?? null,
      });
    }

    await this.repo.upsertIdentity({
      userId,
      providerKey: provider.key,
      providerUserId: identity.subject,
      email: identity.email ?? null,
      claims: identity.claims,
    });

    const membershipRole =
      this.resolveWorkspaceRole(provider, identity.roles, identity.claims) ??
      provider.provisioning.default_workspace_role;

    if (workspaceHint && provider.provisioning.jit_workspace_membership) {
      await this.repo.upsertWorkspaceMembership(workspaceHint, userId, membershipRole);
    } else if (provider.provisioning.auto_create_personal_workspace) {
      const personalWorkspace = await this.repo.createPersonalWorkspace(
        userId,
        slugify(identity.preferredUsername ?? identity.displayName ?? identity.email ?? 'user'),
        identity.email ?? null
      );
      await this.repo.upsertWorkspaceMembership(personalWorkspace.id, userId, membershipRole);
    }

    return { userId };
  }

  private resolveWorkspaceRole(
    provider: AuthProviderConfig,
    roles: string[],
    claims: Record<string, unknown>
  ) {
    const orderedMappings = [...provider.role_mapping].sort((left, right) => right.priority - left.priority);
    for (const mapping of orderedMappings) {
      const grant = mapping.grants.find((value) =>
        ['workspace_owner', 'workspace_admin', 'project_creator', 'billing_admin', 'member', 'viewer'].includes(
          value
        )
      );
      if (!grant) {
        continue;
      }

      const candidates = Array.isArray(mapping.match) ? mapping.match : [mapping.match];
      const claimValues = mapping.claim ? this.normalizeRoleValues(claims[mapping.claim]) : roles;

      if (mapping.source === 'provider_default' && candidates.includes('authenticated')) {
        return grant;
      }

      if (mapping.source === 'claim_contains' && candidates.some((candidate) => claimValues.includes(candidate))) {
        return grant;
      }

      if (mapping.source === 'claim_value' && claimValues.length === 1 && candidates.includes(claimValues[0])) {
        return grant;
      }

      if (
        mapping.source === 'claim_regex' &&
        claimValues.some((value) => candidates.some((candidate) => new RegExp(candidate).test(value)))
      ) {
        return grant;
      }
    }

    return null;
  }

  private normalizeRoleValues(raw: unknown): string[] {
    if (Array.isArray(raw)) {
      return raw.map(String);
    }

    if (raw && typeof raw === 'object') {
      return Object.keys(raw as Record<string, unknown>);
    }

    if (typeof raw === 'string') {
      return raw.split(',').map((value) => value.trim()).filter(Boolean);
    }

    return [];
  }

  private async resolveClientSecret(reference: string) {
    if (reference === 'none' || reference === 'public') {
      return undefined;
    }

    if (reference.startsWith('env:')) {
      const envKey = reference.slice(4);
      const value = process.env[envKey];
      if (!value) {
        throw new PlatformError(`Missing provider secret environment variable "${envKey}".`, 500);
      }
      return value;
    }

    if (reference.startsWith('file:')) {
      const filePath = reference.slice(5);
      return (await readFile(filePath, 'utf8')).trim();
    }

    const envValue = process.env[reference];
    if (envValue) {
      return envValue;
    }

    throw new PlatformError(`Unsupported provider secret reference "${reference}".`, 500);
  }
}
