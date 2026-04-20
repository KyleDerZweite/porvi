import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { serve } from '@hono/node-server';
import { zValidator } from '@hono/zod-validator';
import {
  aiRequestSchema,
  authProviderSchema,
  createAiRequestInputSchema,
  createDeploymentInputSchema,
  createDomainInputSchema,
  createProjectInputSchema,
  createWorkspaceInputSchema,
  domainSchema,
  runtimeCapabilitiesSchema,
  projectSchema,
  sessionSchema,
  startLoginInputSchema,
  updateProjectInputSchema,
  workspaceMembershipSchema,
  workspaceSchema,
} from '@porvi/platform-contracts';
import { AuthService, ProviderStore } from '@porvi/platform-auth';
import { EmbeddedJobRunner, PlatformError, PlatformRepository } from '@porvi/platform-core';
import { closeDatabaseContext, createDatabaseContext } from '@porvi/platform-db';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { cors } from 'hono/cors';
import { Hono } from 'hono';

import { readApiEnv, type ApiEnv } from './env.js';

type Variables = {
  userId: string;
  session: unknown;
};

export async function createApiRuntime(env = readApiEnv()) {
  const repoRoot = resolveRepoRoot(env.repoRoot ?? process.cwd());
  const db = await createDatabaseContext({
    dialect: env.databaseDialect,
    sqlitePath: env.sqlitePath,
    postgresUrl: env.postgresUrl,
  });
  const repo = new PlatformRepository(db);
  const providerStore = new ProviderStore(repo, env.providerConfigDir);
  const authService = new AuthService(repo, providerStore, {
    publicApiUrl: env.publicApiUrl,
    publicAppUrl: env.publicAppUrl,
    publicWebUrl: env.publicWebUrl,
    sessionTtlSeconds: env.sessionTtlSeconds,
  });

  await authService.seedProviders();

  const worker = new EmbeddedJobRunner(db, {
    publicApiUrl: env.publicApiUrl,
    publicAppUrl: env.publicAppUrl,
    repoRoot,
    publishRoot: env.publishRoot,
    previewRoot: env.previewRoot,
    nginxMapPath: env.nginxMapPath,
  });

  if (env.databaseDialect === 'sqlite') {
    worker.start();
  }

  return { env, db, repo, authService, worker };
}

export function createApiApp(runtime: Awaited<ReturnType<typeof createApiRuntime>>) {
  const app = new Hono<{ Variables: Variables }>();

  app.use(
    '*',
    cors({
      origin: (origin) => {
        if (!origin) {
          return '';
        }

        const allowedOrigins = new Set([runtime.env.publicAppUrl, runtime.env.publicWebUrl]);
        return allowedOrigins.has(origin) ? origin : '';
      },
      credentials: true,
      allowHeaders: ['Content-Type'],
      allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    })
  );

  app.use('*', async (c, next) => {
    const sessionToken = getCookie(c, runtime.env.sessionCookieName);
    if (sessionToken) {
      const session = await runtime.authService.getSessionFromToken(sessionToken);
      if (session) {
        c.set('userId', session.subjectId);
        c.set('session', session);
      }
    }

    await next();
  });

  app.get('/health', (c) =>
    c.json({
      ok: true,
      dialect: runtime.env.databaseDialect,
      time: new Date().toISOString(),
    })
  );

  app.get('/v1/capabilities', (c) =>
    c.json(
      runtimeCapabilitiesSchema.parse({
        dialect: runtime.env.databaseDialect,
        supportsExternalWorker: runtime.env.databaseDialect === 'postgres',
        supportsEmbeddedWorker: true,
        supportsProviderPersistence: true,
        supportsRealBuilds: true,
        supportsManagedPublish: true,
      })
    )
  );

  app.get('/v1/auth/providers', async (c) => {
    const providers = await runtime.authService.listEnabledProviders();
    return c.json({ providers: providers.map((provider) => authProviderSchema.parse(provider)) });
  });

  app.post('/v1/auth/login', zValidator('json', startLoginInputSchema), async (c) => {
    const login = await runtime.authService.startLogin(c.req.valid('json'));
    return c.json(login);
  });

  app.get('/v1/auth/callback/:providerKey', async (c) => {
    const result = await runtime.authService.handleCallback(
      c.req.param('providerKey'),
      c.req.url
    );
    setCookie(c, runtime.env.sessionCookieName, result.sessionToken, {
      httpOnly: true,
      secure: runtime.env.publicApiUrl.startsWith('https://'),
      sameSite: 'Lax',
      path: '/',
      maxAge: runtime.env.sessionTtlSeconds,
    });
    return c.redirect(result.redirectTo, 302);
  });

  app.post('/v1/auth/logout', async (c) => {
    const sessionToken = getCookie(c, runtime.env.sessionCookieName);
    if (sessionToken) {
      await runtime.authService.logout(sessionToken);
    }
    deleteCookie(c, runtime.env.sessionCookieName, { path: '/' });
    return c.body(null, 204);
  });

  app.get('/v1/session', async (c) => {
    const session = c.get('session');
    if (!session) {
      return c.body(null, 401);
    }

    const parsed = sessionSchema.parse(session);
    return c.json(parsed);
  });

  app.get('/v1/me', async (c) => {
    const userId = c.get('userId');
    if (!userId) {
      return c.body(null, 401);
    }

    const [user, workspaceMemberships, projectMemberships] = await Promise.all([
      runtime.repo.getUserById(userId),
      runtime.repo.listWorkspaceMembershipsForUser(userId),
      runtime.repo.listProjectMembershipsForUser(userId),
    ]);

    return c.json({
      user: {
        id: user?.id,
        email: user?.email,
        emailVerified: Boolean(user?.emailVerified),
        displayName: user?.displayName,
        preferredUsername: user?.preferredUsername,
        pictureUrl: user?.pictureUrl,
      },
      identities: [],
      workspaceMemberships,
      projectMemberships,
    });
  });

  app.use('/v1/*', async (c, next) => {
    if (!c.get('userId') && !c.req.path.startsWith('/v1/auth/')) {
      return c.body(null, 401);
    }

    await next();
  });

  app.get('/v1/workspaces', async (c) => {
    const items = await runtime.repo.listWorkspacesForUser(c.get('userId'));
    return c.json({ items: items.map((item: unknown) => workspaceSchema.parse(item)) });
  });

  app.post('/v1/workspaces', zValidator('json', createWorkspaceInputSchema), async (c) => {
    const input = c.req.valid('json');
    const workspace = await runtime.repo.createWorkspace({
      name: input.name,
      slug: input.slug,
      ownerUserId: c.get('userId'),
      billingEmail: input.billingEmail ?? null,
    });
    return c.json(workspaceSchema.parse(workspace), 201);
  });

  app.get('/v1/workspaces/:workspaceId', async (c) => {
    const workspaceId = c.req.param('workspaceId');
    const role = await runtime.repo.getWorkspaceRole(workspaceId, c.get('userId'));
    if (!role) {
      return c.body(null, 404);
    }

    const workspace = await runtime.repo.getWorkspace(workspaceId);
    return workspace ? c.json(workspaceSchema.parse(workspace)) : c.body(null, 404);
  });

  app.get('/v1/workspaces/:workspaceId/memberships', async (c) => {
    await runtime.repo.requireWorkspaceAdmin(c.req.param('workspaceId'), c.get('userId'));
    const items = await runtime.repo.listWorkspaceMemberships(c.req.param('workspaceId'));
    return c.json({ items: items.map((item: unknown) => workspaceMembershipSchema.parse(item)) });
  });

  app.post(
    '/v1/workspaces/:workspaceId/memberships',
    zValidator(
      'json',
      workspaceMembershipSchema.pick({
        userId: true,
        role: true,
      })
    ),
    async (c) => {
      const workspaceId = c.req.param('workspaceId');
      await runtime.repo.requireWorkspaceAdmin(workspaceId, c.get('userId'));
      const input = c.req.valid('json');
      const membership = await runtime.repo.upsertWorkspaceMembership(
        workspaceId,
        input.userId,
        input.role
      );
      return c.json(workspaceMembershipSchema.parse(membership));
    }
  );

  app.get('/v1/projects', async (c) => {
    const workspaceId = c.req.query('workspaceId') || undefined;
    const items = await runtime.repo.listProjectsForUser(c.get('userId'), workspaceId);
    return c.json({ items: items.map((item: unknown) => projectSchema.parse(item)) });
  });

  app.post('/v1/projects', zValidator('json', createProjectInputSchema), async (c) => {
    const input = c.req.valid('json');
    await runtime.repo.requireWorkspaceProjectCreate(input.workspaceId, c.get('userId'));
    const project = await runtime.repo.createProject({
      ...input,
      actorUserId: c.get('userId'),
    });
    return c.json(projectSchema.parse(project), 201);
  });

  app.get('/v1/projects/:projectId', async (c) => {
    await runtime.repo.requireProjectEdit(c.req.param('projectId'), c.get('userId'));
    const project = await runtime.repo.getProjectContract(c.req.param('projectId'));
    return project ? c.json(project) : c.body(null, 404);
  });

  app.patch('/v1/projects/:projectId', zValidator('json', updateProjectInputSchema), async (c) => {
    const projectId = c.req.param('projectId');
    await runtime.repo.requireProjectEdit(projectId, c.get('userId'));
    const input = c.req.valid('json');
    const result = await runtime.repo.updateProjectContract({
      projectId,
      actorUserId: c.get('userId'),
      manifest: input.manifest,
      siteContent: input.siteContent,
      changeSummary: input.changeSummary,
    });
    return c.json(result);
  });

  app.get('/v1/projects/:projectId/revisions', async (c) => {
    await runtime.repo.requireProjectEdit(c.req.param('projectId'), c.get('userId'));
    const items = await runtime.repo.listRevisions(c.req.param('projectId'));
    return c.json({ items });
  });

  app.get('/v1/projects/:projectId/deployments', async (c) => {
    await runtime.repo.requireProjectDeploy(c.req.param('projectId'), c.get('userId'));
    const items = await runtime.repo.listDeployments(c.req.param('projectId'));
    return c.json({ items });
  });

  app.get('/v1/projects/:projectId/deployments/:deploymentId', async (c) => {
    const projectId = c.req.param('projectId');
    await runtime.repo.requireProjectDeploy(projectId, c.get('userId'));
    const deployment = await runtime.repo.getDeployment(projectId, c.req.param('deploymentId'));
    return deployment ? c.json(deployment) : c.body(null, 404);
  });

  app.get('/v1/projects/:projectId/deployments/:deploymentId/log', async (c) => {
    const projectId = c.req.param('projectId');
    await runtime.repo.requireProjectDeploy(projectId, c.get('userId'));
    const deployment = await runtime.repo.getDeployment(projectId, c.req.param('deploymentId'));
    if (!deployment?.buildArtifactPath) {
      return c.body(null, 404);
    }

    const logPath = path.join(path.dirname(deployment.buildArtifactPath), 'build.log');
    try {
      const contents = await readFile(logPath, 'utf8');
      return c.text(contents, 200, {
        'content-type': 'text/plain; charset=utf-8',
      });
    } catch {
      return c.body(null, 404);
    }
  });

  app.post(
    '/v1/projects/:projectId/deployments',
    zValidator('json', createDeploymentInputSchema),
    async (c) => {
      const projectId = c.req.param('projectId');
      await runtime.repo.requireProjectDeploy(projectId, c.get('userId'));
      const input = c.req.valid('json');
      const deployment = await runtime.repo.createDeployment({
        projectId,
        revisionId: input.revisionId,
        environment: input.environment,
      });
      await runtime.repo.enqueueJob(
        input.environment === 'preview' ? 'deployment.preview.build' : 'deployment.production.publish',
        {
          deploymentId: deployment.id,
        }
      );
      return c.json(deployment, 201);
    }
  );

  app.get('/v1/projects/:projectId/domains', async (c) => {
    await runtime.repo.requireProjectDeploy(c.req.param('projectId'), c.get('userId'));
    const items = await runtime.repo.listDomains(c.req.param('projectId'));
    return c.json({ items: items.map((item: unknown) => domainSchema.parse(item)) });
  });

  app.get('/v1/projects/:projectId/domains/:domainId', async (c) => {
    const projectId = c.req.param('projectId');
    await runtime.repo.requireProjectDeploy(projectId, c.get('userId'));
    const domain = await runtime.repo.getDomain(projectId, c.req.param('domainId'));
    return domain ? c.json(domainSchema.parse(domain)) : c.body(null, 404);
  });

  app.post('/v1/projects/:projectId/domains', zValidator('json', createDomainInputSchema), async (c) => {
    const projectId = c.req.param('projectId');
    await runtime.repo.requireProjectDeploy(projectId, c.get('userId'));
    const input = c.req.valid('json');
    const domain = await runtime.repo.createDomain(projectId, input.hostname, input.kind);
    return c.json(domainSchema.parse(domain), 201);
  });

  app.get('/v1/projects/:projectId/assets', async (c) => {
    await runtime.repo.requireProjectEdit(c.req.param('projectId'), c.get('userId'));
    const items = await runtime.repo.listAssets(c.req.param('projectId'));
    return c.json({ items });
  });

  app.get('/v1/projects/:projectId/ai-requests', async (c) => {
    await runtime.repo.requireProjectEdit(c.req.param('projectId'), c.get('userId'));
    const items = await runtime.repo.listAiRequests(c.req.param('projectId'));
    return c.json({ items: items.map((item: unknown) => aiRequestSchema.parse(item)) });
  });

  app.get('/v1/projects/:projectId/ai-requests/:aiRequestId', async (c) => {
    const projectId = c.req.param('projectId');
    await runtime.repo.requireProjectEdit(projectId, c.get('userId'));
    const aiRequest = await runtime.repo.getAiRequest(projectId, c.req.param('aiRequestId'));
    return aiRequest ? c.json(aiRequestSchema.parse(aiRequest)) : c.body(null, 404);
  });

  app.get('/v1/projects/:projectId/ai-requests/:aiRequestId/events', async (c) => {
    const projectId = c.req.param('projectId');
    const aiRequestId = c.req.param('aiRequestId');
    await runtime.repo.requireProjectEdit(projectId, c.get('userId'));

    const encoder = new TextEncoder();
    const terminalStates = new Set(['needs_review', 'approved', 'rejected', 'applied', 'failed', 'cancelled']);

    const stream = new ReadableStream({
      async start(controller) {
        let lastStatus = '';

        for (let attempt = 0; attempt < 30; attempt += 1) {
          const aiRequest = await runtime.repo.getAiRequest(projectId, aiRequestId);
          if (!aiRequest) {
            controller.enqueue(encoder.encode(`event: error\ndata: {"error":"not_found"}\n\n`));
            controller.close();
            return;
          }

          if (aiRequest.status !== lastStatus || attempt === 0) {
            controller.enqueue(
              encoder.encode(`event: status\ndata: ${JSON.stringify(aiRequestSchema.parse(aiRequest))}\n\n`)
            );
            lastStatus = aiRequest.status;
          } else {
            controller.enqueue(
              encoder.encode(`event: heartbeat\ndata: ${JSON.stringify({ status: aiRequest.status })}\n\n`)
            );
          }

          if (terminalStates.has(aiRequest.status)) {
            controller.close();
            return;
          }

          await sleep(1000);
        }

        controller.close();
      },
    });

    return c.newResponse(stream, 200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    });
  });

  app.post(
    '/v1/projects/:projectId/ai-requests',
    zValidator('json', createAiRequestInputSchema),
    async (c) => {
      const projectId = c.req.param('projectId');
      await runtime.repo.requireProjectEdit(projectId, c.get('userId'));
      const input = c.req.valid('json');
      const aiRequest = await runtime.repo.createAiRequest({
        projectId,
        requestedByUserId: c.get('userId'),
        type: input.type,
        prompt: input.prompt,
        scope: input.scope,
        reviewRequired: input.reviewRequired ?? true,
      });
      await runtime.repo.enqueueJob('ai_request.execute', {
        aiRequestId: aiRequest.id,
      });
      return c.json(aiRequestSchema.parse(aiRequest), 201);
    }
  );

  app.onError((error, c) => {
    if (error instanceof PlatformError) {
      return c.json({ error: error.message }, { status: error.status as 400 | 401 | 403 | 404 | 409 | 422 | 500 });
    }

    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  });

  return app;
}

export async function startApiServer(env: ApiEnv = readApiEnv()) {
  const runtime = await createApiRuntime(env);
  const app = createApiApp(runtime);
  const server = serve({
    fetch: app.fetch,
    port: env.port,
  });

  return {
    server,
    close: async () => {
      runtime.worker.stop();
      await closeDatabaseContext(runtime.db);
      server.close();
    },
  };
}

function resolveRepoRoot(startDir: string) {
  if (existsSync(path.join(startDir, 'templates', 'base-astro'))) {
    return startDir;
  }

  return path.resolve(startDir, '../..');
}
