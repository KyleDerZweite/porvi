import { lstat, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

import { hashSessionToken } from '@porvi/platform-auth';
import { closeDatabaseContext } from '@porvi/platform-db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApiApp, createApiRuntime } from './app.js';

describe('Porvi API', () => {
  const testRoot = path.join(process.cwd(), '.porvi-test');
  const sqlitePath = path.join(testRoot, 'platform.sqlite');
  let runtime: Awaited<ReturnType<typeof createApiRuntime>>;
  let sessionToken = 'integration-session-token';
  let workspaceId = '';

  beforeAll(async () => {
    await rm(testRoot, { recursive: true, force: true });
    await mkdir(testRoot, { recursive: true });

    runtime = await createApiRuntime({
      port: 0,
      databaseDialect: 'sqlite',
      sqlitePath,
      providerConfigDir: undefined,
      publicApiUrl: 'http://localhost:3999',
      publicAppUrl: 'http://localhost:5173',
      publicWebUrl: 'http://localhost:4321',
      sessionCookieName: '__Host-porvi_session',
      sessionTtlSeconds: 3600,
      publishRoot: path.join(testRoot, 'published'),
      previewRoot: path.join(testRoot, 'previews'),
      nginxMapPath: path.join(testRoot, 'nginx', 'sites.map'),
    });
    runtime.worker.stop();

    await runtime.repo.upsertProviderConfig({
      key: 'zitadel',
      kind: 'zitadel',
      display_name: 'Zitadel',
      registration_mode: 'invite_only',
      issuer: 'https://auth.example.com',
      client_id: 'porvi-web',
      client_secret_ref: 'none',
      scopes: ['openid', 'profile', 'email'],
      pkce_required: true,
      authorization_params: {
        prompt: 'login',
      },
      claims_mapping: {
        subject: 'sub',
        email: 'email',
        email_verified: 'email_verified',
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
    });

    const user = await runtime.repo.createUser({
      email: 'tester@example.com',
      emailVerified: true,
      displayName: 'Tester',
      preferredUsername: 'tester',
    });
    const workspace = await runtime.repo.createWorkspace({
      name: 'Test Workspace',
      slug: 'test-workspace',
      ownerUserId: user.id,
      billingEmail: user.email,
    });

    workspaceId = workspace.id;

    await runtime.repo.createSession({
      userId: user.id,
      providerKey: 'zitadel',
      tokenHash: hashSessionToken(sessionToken),
      activeWorkspaceId: workspace.id,
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      amr: ['oidc'],
    });
  });

  afterAll(async () => {
    runtime.worker.stop();
    await closeDatabaseContext(runtime.db);
    await rm(testRoot, { recursive: true, force: true });
  });

  it('returns health information', async () => {
    const app = createApiApp(runtime);
    const response = await app.request('/health');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, dialect: 'sqlite' });
  });

  it('returns runtime capabilities', async () => {
    const app = createApiApp(runtime);
    const response = await app.request('/v1/capabilities');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      dialect: 'sqlite',
      supportsEmbeddedWorker: true,
      supportsRealBuilds: true,
      supportsManagedPublish: true,
    });
  });

  it('rejects unauthenticated session requests', async () => {
    const app = createApiApp(runtime);
    const response = await app.request('/v1/session');
    expect(response.status).toBe(401);
  });

  it('exposes provider registration mode for frontend CTA decisions', async () => {
    const app = createApiApp(runtime);
    const response = await app.request('/v1/auth/providers');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      providers: [
        {
          key: 'zitadel',
          registrationMode: 'invite_only',
          workspaceDiscoveryMode: 'provider_org',
        },
      ],
    });
  });

  it('allows credentialed session bootstrap from the marketing origin', async () => {
    const app = createApiApp(runtime);
    const response = await app.request('/v1/session', {
      headers: {
        origin: 'http://localhost:4321',
        cookie: `__Host-porvi_session=${sessionToken}`,
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:4321');
    expect(response.headers.get('access-control-allow-credentials')).toBe('true');
  });

  it('rejects login redirect targets outside the configured app and web origins', async () => {
    const app = createApiApp(runtime);
    const response = await app.request('/v1/auth/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        providerKey: 'zitadel',
        redirectTo: 'https://evil.example.com/pwn',
      }),
    });

    expect(response.status).toBe(400);
  });

  it('creates and lists a project when authenticated', async () => {
    const app = createApiApp(runtime);
    const cookieHeader = `__Host-porvi_session=${sessionToken}`;

    const createResponse = await app.request('/v1/projects', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: cookieHeader,
      },
      body: JSON.stringify({
        workspaceId,
        name: 'Integration Project',
        slug: 'integration-project',
        archetype: 'creator-site',
      }),
    });

    expect(createResponse.status).toBe(201);
    const createdProject = await createResponse.json();
    expect(createdProject.slug).toBe('integration-project');

    const listResponse = await app.request(`/v1/projects?workspaceId=${workspaceId}`, {
      headers: {
        cookie: cookieHeader,
      },
    });
    expect(listResponse.status).toBe(200);
    const payload = await listResponse.json();
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].name).toBe('Integration Project');
  });

  it('does not create a new revision for a no-op project update', async () => {
    const app = createApiApp(runtime);
    const cookieHeader = `__Host-porvi_session=${sessionToken}`;

    const createResponse = await app.request('/v1/projects', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: cookieHeader,
      },
      body: JSON.stringify({
        workspaceId,
        name: 'Noop Project',
        slug: 'noop-project',
        archetype: 'portfolio',
      }),
    });

    const createdProject = await createResponse.json();
    const projectResponse = await app.request(`/v1/projects/${createdProject.id}`, {
      headers: { cookie: cookieHeader },
    });
    const contract = await projectResponse.json();

    const updateResponse = await app.request(`/v1/projects/${createdProject.id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        cookie: cookieHeader,
      },
      body: JSON.stringify({
        manifest: contract.manifest,
        siteContent: contract.siteContent,
        changeSummary: 'No-op update',
      }),
    });

    expect(updateResponse.status).toBe(200);
    const updated = await updateResponse.json();
    expect(updated.revision.id).toBe(createdProject.currentRevisionId);
  });

  it('builds and publishes a production deployment through the worker', async () => {
    const app = createApiApp(runtime);
    const cookieHeader = `__Host-porvi_session=${sessionToken}`;

    const createResponse = await app.request('/v1/projects', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: cookieHeader,
      },
      body: JSON.stringify({
        workspaceId,
        name: 'Publish Project',
        slug: 'publish-project',
        archetype: 'creator-site',
      }),
    });
    const createdProject = await createResponse.json();

    const domainResponse = await app.request(`/v1/projects/${createdProject.id}/domains`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: cookieHeader,
      },
      body: JSON.stringify({
        hostname: 'publish-project.kylehub.dev',
        kind: 'platform_subdomain',
      }),
    });
    expect(domainResponse.status).toBe(201);

    const deploymentResponse = await app.request(`/v1/projects/${createdProject.id}/deployments`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: cookieHeader,
      },
      body: JSON.stringify({
        revisionId: createdProject.currentRevisionId,
        environment: 'production',
      }),
    });
    expect(deploymentResponse.status).toBe(201);
    const deployment = await deploymentResponse.json();

    await runtime.worker.tick();

    const refreshedResponse = await app.request(
      `/v1/projects/${createdProject.id}/deployments/${deployment.id}`,
      {
        headers: { cookie: cookieHeader },
      }
    );
    expect(refreshedResponse.status).toBe(200);
    const refreshedDeployment = await refreshedResponse.json();
    expect(refreshedDeployment.status).toBe('ready');
    expect(refreshedDeployment.buildArtifactPath).toBeTruthy();
    expect(refreshedDeployment.publishedUrl).toBe('https://publish-project.kylehub.dev');

    const currentPath = path.join(testRoot, 'published', 'projects', createdProject.id, 'current');
    const currentStats = await lstat(currentPath);
    expect(currentStats.isSymbolicLink()).toBe(true);

    const logResponse = await app.request(
      `/v1/projects/${createdProject.id}/deployments/${deployment.id}/log`,
      {
        headers: { cookie: cookieHeader },
      }
    );
    expect(logResponse.status).toBe(200);
    expect(await logResponse.text()).toContain('[build]');
  });
});
