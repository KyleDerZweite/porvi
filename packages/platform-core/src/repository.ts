import { and, desc, eq, inArray, or } from 'drizzle-orm';

import type {
  AiRequestDto,
  AuthProviderConfig,
  DeploymentDto,
  DomainDto,
  ProjectDto,
  ProjectMembershipDto,
  RevisionDto,
  SessionDto,
  WorkspaceDto,
  WorkspaceMembershipDto,
} from '@porvi/platform-contracts';
import { createStarterProject } from '@porvi/product-core';
import type { DatabaseContext } from '@porvi/platform-db';

import { PlatformError } from './errors.js';
import { decodeJson, encodeJson, generateId, nowIso, sha256, slugify } from './utils.js';

const workspaceAdminRoles = new Set(['workspace_owner', 'workspace_admin']);
const workspaceProjectCreateRoles = new Set(['workspace_owner', 'workspace_admin', 'project_creator']);
const projectEditRoles = new Set(['project_owner', 'project_admin', 'editor']);
const projectDeployRoles = new Set(['project_owner', 'project_admin', 'deployer']);

export class PlatformRepository {
  constructor(private readonly ctx: DatabaseContext) {}

  private get db() {
    return this.ctx.db;
  }

  private get schema() {
    return this.ctx.schema;
  }

  async upsertProviderConfig(config: AuthProviderConfig) {
    const existing = await this.getProviderConfigByKey(config.key);
    const payload = {
      id: existing?.id ?? generateId('provider'),
      key: config.key,
      kind: config.kind,
      displayName: config.display_name,
      issuer: config.issuer,
      clientId: config.client_id,
      clientSecretRef: config.client_secret_ref,
      scopesJson: encodeJson(config.scopes),
      configJson: encodeJson(config),
      enabled: config.enabled,
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };

    if (existing) {
      await this.db
        .update(this.schema.authProviderConfigs)
        .set(payload)
        .where(eq(this.schema.authProviderConfigs.key, config.key));
      return;
    }

    await this.db.insert(this.schema.authProviderConfigs).values(payload);
  }

  async listEnabledProviderConfigs(): Promise<AuthProviderConfig[]> {
    const rows = await this.db
      .select()
      .from(this.schema.authProviderConfigs)
      .where(eq(this.schema.authProviderConfigs.enabled, true));

    return rows.map((row: any) => decodeJson<AuthProviderConfig>(row.configJson, {} as AuthProviderConfig));
  }

  async getProviderConfigByKey(key: string) {
    const row = await this.db.query.authProviderConfigs.findFirst({
      where: eq(this.schema.authProviderConfigs.key, key),
    });

    return row ?? null;
  }

  async createAuthTransaction(input: {
    providerKey: string;
    state: string;
    codeVerifier: string;
    redirectTo?: string;
    workspaceHint?: string;
    expiresAt: string;
  }) {
    const row = {
      id: generateId('auth_tx'),
      providerKey: input.providerKey,
      state: input.state,
      codeVerifier: input.codeVerifier,
      redirectTo: input.redirectTo ?? null,
      workspaceHint: input.workspaceHint ?? null,
      expiresAt: input.expiresAt,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    await this.db.insert(this.schema.authTransactions).values(row);
    return row;
  }

  async getAuthTransactionByState(state: string) {
    const row = await this.db.query.authTransactions.findFirst({
      where: eq(this.schema.authTransactions.state, state),
    });

    return row ?? null;
  }

  async deleteAuthTransaction(state: string) {
    await this.db.delete(this.schema.authTransactions).where(eq(this.schema.authTransactions.state, state));
  }

  async getUserById(userId: string) {
    return (
      (await this.db.query.users.findFirst({
        where: eq(this.schema.users.id, userId),
      })) ?? null
    );
  }

  async findUserByEmail(email: string) {
    return (
      (await this.db.query.users.findFirst({
        where: eq(this.schema.users.email, email.toLowerCase()),
      })) ?? null
    );
  }

  async findIdentity(providerKey: string, providerUserId: string) {
    return (
      (await this.db.query.identities.findFirst({
        where: and(
          eq(this.schema.identities.providerKey, providerKey),
          eq(this.schema.identities.providerUserId, providerUserId)
        ),
      })) ?? null
    );
  }

  async createUser(input: {
    email: string;
    emailVerified: boolean;
    displayName?: string | null;
    preferredUsername?: string | null;
    pictureUrl?: string | null;
  }) {
    const row = {
      id: generateId('usr'),
      email: input.email.toLowerCase(),
      emailVerified: input.emailVerified,
      displayName: input.displayName ?? null,
      preferredUsername: input.preferredUsername ?? null,
      pictureUrl: input.pictureUrl ?? null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await this.db.insert(this.schema.users).values(row);
    return row;
  }

  async updateUser(
    userId: string,
    updates: Partial<{
      emailVerified: boolean;
      displayName: string | null;
      preferredUsername: string | null;
      pictureUrl: string | null;
    }>
  ) {
    await this.db
      .update(this.schema.users)
      .set({
        ...updates,
        updatedAt: nowIso(),
      })
      .where(eq(this.schema.users.id, userId));
  }

  async upsertIdentity(input: {
    userId: string;
    providerKey: string;
    providerUserId: string;
    email?: string | null;
    claims?: Record<string, unknown>;
  }) {
    const existing = await this.findIdentity(input.providerKey, input.providerUserId);
    const payload = {
      id: existing?.id ?? generateId('ident'),
      userId: input.userId,
      providerKey: input.providerKey,
      providerUserId: input.providerUserId,
      email: input.email ?? null,
      claimsJson: encodeJson(input.claims ?? {}),
      claimsVersion: 1,
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };

    if (existing) {
      await this.db
        .update(this.schema.identities)
        .set(payload)
        .where(eq(this.schema.identities.id, existing.id));
      return existing.id;
    }

    await this.db.insert(this.schema.identities).values(payload);
    return payload.id;
  }

  async createSession(input: {
    userId: string;
    providerKey: string;
    providerUserId?: string | null;
    tokenHash: string;
    activeWorkspaceId?: string | null;
    amr?: string[];
    expiresAt: string;
  }) {
    const row = {
      id: generateId('sess'),
      userId: input.userId,
      providerKey: input.providerKey,
      providerUserId: input.providerUserId ?? null,
      tokenHash: input.tokenHash,
      activeWorkspaceId: input.activeWorkspaceId ?? null,
      amrJson: encodeJson(input.amr ?? ['oidc']),
      expiresAt: input.expiresAt,
      lastSeenAt: nowIso(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await this.db.insert(this.schema.sessions).values(row);
    return row;
  }

  async getSessionByTokenHash(tokenHash: string) {
    return (
      (await this.db.query.sessions.findFirst({
        where: eq(this.schema.sessions.tokenHash, tokenHash),
      })) ?? null
    );
  }

  async touchSession(sessionId: string) {
    await this.db
      .update(this.schema.sessions)
      .set({ lastSeenAt: nowIso(), updatedAt: nowIso() })
      .where(eq(this.schema.sessions.id, sessionId));
  }

  async deleteSessionByTokenHash(tokenHash: string) {
    await this.db.delete(this.schema.sessions).where(eq(this.schema.sessions.tokenHash, tokenHash));
  }

  async createWorkspace(input: {
    name: string;
    slug: string;
    ownerUserId: string;
    billingEmail?: string | null;
    role?: string;
  }) {
    const workspaceId = generateId('ws');
    const workspace = {
      id: workspaceId,
      slug: slugify(input.slug),
      name: input.name,
      plan: 'free',
      ownerUserId: input.ownerUserId,
      billingEmail: input.billingEmail ?? null,
      defaultAuthPolicyId: null,
      archivedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    await this.db.insert(this.schema.workspaces).values(workspace);
    await this.db.insert(this.schema.workspaceMemberships).values({
      id: generateId('wsm'),
      workspaceId,
      userId: input.ownerUserId,
      role: input.role ?? 'workspace_owner',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });

    return this.toWorkspaceDto(workspace);
  }

  async createPersonalWorkspace(userId: string, preferredName: string, billingEmail?: string | null) {
    const slug = slugify(preferredName || `user-${userId.slice(-8)}`);
    const existing = await this.db.query.workspaces.findFirst({
      where: eq(this.schema.workspaces.slug, slug),
    });
    if (existing) {
      return this.toWorkspaceDto(existing);
    }

    return this.createWorkspace({
      name: `${preferredName} workspace`,
      slug,
      ownerUserId: userId,
      billingEmail,
      role: 'workspace_owner',
    });
  }

  async listWorkspacesForUser(userId: string): Promise<WorkspaceDto[]> {
    const memberships = await this.db
      .select()
      .from(this.schema.workspaceMemberships)
      .where(eq(this.schema.workspaceMemberships.userId, userId));

    if (memberships.length === 0) {
      return [];
    }

    const workspaceIds = memberships.map((row: any) => row.workspaceId);
    const rows = await this.db
      .select()
      .from(this.schema.workspaces)
      .where(inArray(this.schema.workspaces.id, workspaceIds));

    return rows.map((row: any) => this.toWorkspaceDto(row));
  }

  async listWorkspaceMembershipsForUser(userId: string): Promise<WorkspaceMembershipDto[]> {
    const rows = await this.db
      .select()
      .from(this.schema.workspaceMemberships)
      .where(eq(this.schema.workspaceMemberships.userId, userId));

    return rows.map((row: any) => ({
      workspaceId: row.workspaceId,
      userId: row.userId,
      role: row.role,
    }));
  }

  async getWorkspace(workspaceId: string) {
    const row = await this.db.query.workspaces.findFirst({
      where: eq(this.schema.workspaces.id, workspaceId),
    });
    return row ? this.toWorkspaceDto(row) : null;
  }

  async listWorkspaceMemberships(workspaceId: string): Promise<WorkspaceMembershipDto[]> {
    const rows = await this.db
      .select()
      .from(this.schema.workspaceMemberships)
      .where(eq(this.schema.workspaceMemberships.workspaceId, workspaceId));

    return rows.map((row: any) => ({
      workspaceId: row.workspaceId,
      userId: row.userId,
      role: row.role,
    }));
  }

  async getWorkspaceRole(workspaceId: string, userId: string) {
    const row = await this.db.query.workspaceMemberships.findFirst({
      where: and(
        eq(this.schema.workspaceMemberships.workspaceId, workspaceId),
        eq(this.schema.workspaceMemberships.userId, userId)
      ),
    });
    return row?.role ?? null;
  }

  async upsertWorkspaceMembership(workspaceId: string, userId: string, role: string) {
    const existing = await this.db.query.workspaceMemberships.findFirst({
      where: and(
        eq(this.schema.workspaceMemberships.workspaceId, workspaceId),
        eq(this.schema.workspaceMemberships.userId, userId)
      ),
    });

    const payload = {
      id: existing?.id ?? generateId('wsm'),
      workspaceId,
      userId,
      role,
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };

    if (existing) {
      await this.db
        .update(this.schema.workspaceMemberships)
        .set(payload)
        .where(eq(this.schema.workspaceMemberships.id, existing.id));
    } else {
      await this.db.insert(this.schema.workspaceMemberships).values(payload);
    }

    return { workspaceId, userId, role } as WorkspaceMembershipDto;
  }

  async listProjectsForUser(userId: string, workspaceId?: string): Promise<ProjectDto[]> {
    const projectMemberships = await this.db
      .select()
      .from(this.schema.projectMemberships)
      .where(eq(this.schema.projectMemberships.userId, userId));

    const workspaceMemberships = await this.db
      .select()
      .from(this.schema.workspaceMemberships)
      .where(eq(this.schema.workspaceMemberships.userId, userId));

    const projectIds = new Set(projectMemberships.map((row: any) => row.projectId));
    const workspaceIds = new Set(workspaceMemberships.map((row: any) => row.workspaceId));

    const whereClause = workspaceId
      ? eq(this.schema.projects.workspaceId, workspaceId)
      : or(
          projectIds.size ? inArray(this.schema.projects.id, [...projectIds]) : undefined,
          workspaceIds.size ? inArray(this.schema.projects.workspaceId, [...workspaceIds]) : undefined
        );

    const rows = whereClause
      ? await this.db.select().from(this.schema.projects).where(whereClause)
      : [];

    return rows.map((row: any) => this.toProjectDto(row));
  }

  async listProjectMembershipsForUser(userId: string): Promise<ProjectMembershipDto[]> {
    const rows = await this.db
      .select()
      .from(this.schema.projectMemberships)
      .where(eq(this.schema.projectMemberships.userId, userId));

    return rows.map((row: any) => ({
      projectId: row.projectId,
      userId: row.userId,
      role: row.role,
    }));
  }

  async createProject(input: {
    workspaceId: string;
    name: string;
    slug: string;
    archetype: 'link-hub' | 'portfolio' | 'creator-site';
    actorUserId: string;
  }) {
    const projectId = generateId('prj');
    const revisionId = generateId('rev');
    const startedAt = nowIso();
    const { manifest, site } = createStarterProject({
      name: input.name,
      slug: input.slug,
      archetype: input.archetype,
    });
    const manifestJson = encodeJson(manifest);
    const siteContentJson = encodeJson(site);
    const manifestHash = sha256(manifestJson);
    const contentHash = sha256(siteContentJson);
    const project = {
      id: projectId,
      workspaceId: input.workspaceId,
      slug: slugify(input.slug),
      name: input.name,
      archetype: input.archetype,
      visibility: 'private',
      hostingMode: 'managed',
      defaultBranch: 'main',
      currentRevisionId: revisionId,
      publishedDeploymentId: null,
      archivedAt: null,
      createdAt: startedAt,
      updatedAt: startedAt,
    };

    await this.db.insert(this.schema.projects).values(project);
    await this.db.insert(this.schema.projectMemberships).values({
      id: generateId('prm'),
      projectId,
      userId: input.actorUserId,
      role: 'project_owner',
      createdAt: startedAt,
      updatedAt: startedAt,
    });
    await this.db.insert(this.schema.revisions).values({
      id: revisionId,
      projectId,
      source: 'api',
      actorUserId: input.actorUserId,
      baseRevisionId: null,
      status: 'ready',
      changeSummary: 'Initial project scaffold',
      createdAt: startedAt,
    });
    await this.db.insert(this.schema.projectManifests).values({
      id: generateId('pmf'),
      projectId,
      revisionId,
      manifestJson,
      manifestHash,
      createdAt: startedAt,
      updatedAt: startedAt,
    });
    await this.db.insert(this.schema.projectSiteContents).values({
      id: generateId('psc'),
      projectId,
      revisionId,
      siteContentJson,
      contentHash,
      createdAt: startedAt,
      updatedAt: startedAt,
    });

    return this.toProjectDto(project);
  }

  async getProject(projectId: string) {
    const row = await this.db.query.projects.findFirst({
      where: eq(this.schema.projects.id, projectId),
    });
    return row ? this.toProjectDto(row) : null;
  }

  async getProjectRecord(projectId: string) {
    return (
      (await this.db.query.projects.findFirst({
        where: eq(this.schema.projects.id, projectId),
      })) ?? null
    );
  }

  async getProjectRole(projectId: string, userId: string) {
    const row = await this.db.query.projectMemberships.findFirst({
      where: and(
        eq(this.schema.projectMemberships.projectId, projectId),
        eq(this.schema.projectMemberships.userId, userId)
      ),
    });
    return row?.role ?? null;
  }

  async getProjectContract(projectId: string) {
    const project = await this.getProjectRecord(projectId);
    if (!project) {
      return null;
    }

    if (!project.currentRevisionId) {
      throw new PlatformError('Project has no active revision.', 500);
    }

    return this.getProjectContractByRevision(projectId, project.currentRevisionId);
  }

  async getProjectContractByRevision(projectId: string, revisionId: string) {
    const project = await this.getProjectRecord(projectId);
    if (!project) {
      return null;
    }

    const revision = await this.db.query.revisions.findFirst({
      where: and(eq(this.schema.revisions.id, revisionId), eq(this.schema.revisions.projectId, projectId)),
    });
    if (!revision) {
      return null;
    }

    const [manifest, siteContent] = await Promise.all([
      this.db.query.projectManifests.findFirst({
        where: and(
          eq(this.schema.projectManifests.projectId, projectId),
          eq(this.schema.projectManifests.revisionId, revisionId)
        ),
      }),
      this.db.query.projectSiteContents.findFirst({
        where: and(
          eq(this.schema.projectSiteContents.projectId, projectId),
          eq(this.schema.projectSiteContents.revisionId, revisionId)
        ),
      }),
    ]);

    if (!manifest || !siteContent) {
      throw new PlatformError('Revision content is incomplete.', 500);
    }

    return {
      project: this.toProjectDto(project),
      revision: this.toRevisionDto(revision),
      manifest: decodeJson<Record<string, unknown>>(manifest.manifestJson, {}),
      siteContent: decodeJson<Record<string, unknown>>(siteContent.siteContentJson, {}),
      manifestHash: manifest.manifestHash,
      contentHash: siteContent.contentHash,
    };
  }

  async updateProjectContract(input: {
    projectId: string;
    actorUserId: string;
    manifest?: Record<string, unknown>;
    siteContent?: Record<string, unknown>;
    changeSummary?: string;
  }) {
    const current = await this.getProjectContract(input.projectId);
    if (!current) {
      throw new PlatformError('Project not found.', 404);
    }

    const manifest = input.manifest ?? current.manifest;
    const siteContent = input.siteContent ?? current.siteContent;
    const manifestJson = encodeJson(manifest);
    const siteContentJson = encodeJson(siteContent);
    const manifestHash = sha256(manifestJson);
    const contentHash = sha256(siteContentJson);

    if (manifestHash === current.manifestHash && contentHash === current.contentHash) {
      return {
        project: current.project,
        revision: current.revision,
      };
    }

    const revisionId = generateId('rev');
    const createdAt = nowIso();

    await this.db.insert(this.schema.revisions).values({
      id: revisionId,
      projectId: input.projectId,
      source: 'api',
      actorUserId: input.actorUserId,
      baseRevisionId: current.project.currentRevisionId,
      status: 'ready',
      changeSummary: input.changeSummary ?? 'Project contract updated',
      createdAt,
    });
    await this.db.insert(this.schema.projectManifests).values({
      id: generateId('pmf'),
      projectId: input.projectId,
      revisionId,
      manifestJson,
      manifestHash,
      createdAt,
      updatedAt: createdAt,
    });
    await this.db.insert(this.schema.projectSiteContents).values({
      id: generateId('psc'),
      projectId: input.projectId,
      revisionId,
      siteContentJson,
      contentHash,
      createdAt,
      updatedAt: createdAt,
    });
    await this.db
      .update(this.schema.projects)
      .set({
        currentRevisionId: revisionId,
        updatedAt: createdAt,
      })
      .where(eq(this.schema.projects.id, input.projectId));

    return {
      project: {
        ...current.project,
        currentRevisionId: revisionId,
      },
      revision: {
        id: revisionId,
        projectId: input.projectId,
        source: 'api',
        status: 'ready',
        baseRevisionId: current.project.currentRevisionId,
        changeSummary: input.changeSummary ?? 'Project contract updated',
        createdAt,
      } as RevisionDto,
    };
  }

  async listRevisions(projectId: string): Promise<RevisionDto[]> {
    const rows = await this.db
      .select()
      .from(this.schema.revisions)
      .where(eq(this.schema.revisions.projectId, projectId))
      .orderBy(desc(this.schema.revisions.createdAt));

    return rows.map((row: any) => this.toRevisionDto(row));
  }

  async setRevisionStatus(revisionId: string, status: RevisionDto['status']) {
    await this.db
      .update(this.schema.revisions)
      .set({
        status,
      })
      .where(eq(this.schema.revisions.id, revisionId));
  }

  async createDeployment(input: {
    projectId: string;
    revisionId: string;
    environment: 'preview' | 'production';
  }): Promise<DeploymentDto> {
    const revision = await this.db.query.revisions.findFirst({
      where: and(
        eq(this.schema.revisions.id, input.revisionId),
        eq(this.schema.revisions.projectId, input.projectId)
      ),
    });
    if (!revision) {
      throw new PlatformError('Revision not found for project.', 404);
    }

    const row = {
      id: generateId('dep'),
      projectId: input.projectId,
      revisionId: input.revisionId,
      environment: input.environment,
      status: 'queued',
      staticUrl: null,
      previewUrl: null,
      publishedUrl: null,
      buildLogUrl: null,
      buildArtifactPath: null,
      startedAt: null,
      completedAt: null,
      createdAt: nowIso(),
    };
    await this.db.insert(this.schema.deployments).values(row);
    return this.toDeploymentDto(row);
  }

  async listDeployments(projectId: string): Promise<DeploymentDto[]> {
    const rows = await this.db
      .select()
      .from(this.schema.deployments)
      .where(eq(this.schema.deployments.projectId, projectId))
      .orderBy(desc(this.schema.deployments.createdAt));

    return rows.map((row: any) => this.toDeploymentDto(row));
  }

  async getDeploymentRecord(deploymentId: string) {
    return (
      (await this.db.query.deployments.findFirst({
        where: eq(this.schema.deployments.id, deploymentId),
      })) ?? null
    );
  }

  async getDeployment(projectId: string, deploymentId: string): Promise<DeploymentDto | null> {
    const row = await this.db.query.deployments.findFirst({
      where: and(
        eq(this.schema.deployments.id, deploymentId),
        eq(this.schema.deployments.projectId, projectId)
      ),
    });
    return row ? this.toDeploymentDto(row) : null;
  }

  async updateDeployment(deploymentId: string, updates: Partial<Record<string, unknown>>) {
    await this.db
      .update(this.schema.deployments)
      .set(updates)
      .where(eq(this.schema.deployments.id, deploymentId));
  }

  async markPublishedDeployment(projectId: string, deploymentId: string) {
    const productionRows = await this.db
      .select()
      .from(this.schema.deployments)
      .where(
        and(
          eq(this.schema.deployments.projectId, projectId),
          eq(this.schema.deployments.environment, 'production')
        )
      );

    for (const row of productionRows as any[]) {
      if (row.id !== deploymentId && row.status === 'ready') {
        await this.db
          .update(this.schema.deployments)
          .set({ status: 'superseded' })
          .where(eq(this.schema.deployments.id, row.id));
      }
    }

    await this.db
      .update(this.schema.projects)
      .set({
        publishedDeploymentId: deploymentId,
        updatedAt: nowIso(),
      })
      .where(eq(this.schema.projects.id, projectId));
  }

  async createDomain(projectId: string, hostname: string, kind: string): Promise<DomainDto> {
    const normalizedHostname = hostname.trim().toLowerCase();
    const existingByHost = await this.db.query.domains.findFirst({
      where: eq(this.schema.domains.hostname, normalizedHostname),
    });
    if (existingByHost) {
      throw new PlatformError('Domain hostname already exists.', 409);
    }

    const existingProjectDomains = await this.listDomains(projectId);
    const createdAt = nowIso();
    const isPrimary = existingProjectDomains.every((domain) => !domain.isPrimary);
    const isPlatformSubdomain = kind === 'platform_subdomain';
    const row = {
      id: generateId('dom'),
      projectId,
      hostname: normalizedHostname,
      kind,
      verificationStatus: isPlatformSubdomain ? 'verified' : 'pending',
      certificateStatus: isPlatformSubdomain ? 'active' : 'pending',
      dnsTarget: 'pangolin-managed',
      isPrimary,
      verificationToken: isPlatformSubdomain ? null : generateId('verify'),
      verifiedAt: isPlatformSubdomain ? createdAt : null,
      createdAt,
    };
    await this.db.insert(this.schema.domains).values(row);
    return this.toDomainDto(row);
  }

  async listDomains(projectId: string): Promise<DomainDto[]> {
    const rows = await this.db
      .select()
      .from(this.schema.domains)
      .where(eq(this.schema.domains.projectId, projectId));

    return rows.map((row: any) => this.toDomainDto(row));
  }

  async getDomain(projectId: string, domainId: string): Promise<DomainDto | null> {
    const row = await this.db.query.domains.findFirst({
      where: and(eq(this.schema.domains.id, domainId), eq(this.schema.domains.projectId, projectId)),
    });
    return row ? this.toDomainDto(row) : null;
  }

  async getDomainRecord(domainId: string) {
    return (
      (await this.db.query.domains.findFirst({
        where: eq(this.schema.domains.id, domainId),
      })) ?? null
    );
  }

  async updateDomain(domainId: string, updates: Partial<Record<string, unknown>>) {
    await this.db.update(this.schema.domains).set(updates).where(eq(this.schema.domains.id, domainId));
  }

  async listVerifiedPublishedDomains() {
    const projects = await this.db.select().from(this.schema.projects);

    const publishedProjectIds = new Set(
      (projects as any[])
        .filter((row) => row.publishedDeploymentId)
        .map((row) => row.id)
    );

    if (publishedProjectIds.size === 0) {
      return [] as Array<{ hostname: string; projectId: string }>;
    }

    const domains = await this.db
      .select()
      .from(this.schema.domains)
      .where(eq(this.schema.domains.verificationStatus, 'verified'));

    return (domains as any[])
      .filter((row) => publishedProjectIds.has(row.projectId))
      .map((row) => ({
        hostname: row.hostname,
        projectId: row.projectId,
      }));
  }

  async getPrimaryDomain(projectId: string, verifiedOnly = true): Promise<DomainDto | null> {
    const domains = await this.listDomains(projectId);
    const filtered = verifiedOnly
      ? domains.filter((domain) => domain.verificationStatus === 'verified')
      : domains;
    return filtered.find((domain) => domain.isPrimary) ?? filtered[0] ?? null;
  }

  async listAssets(projectId: string) {
    return this.db.select().from(this.schema.assets).where(eq(this.schema.assets.projectId, projectId));
  }

  async createAiRequest(input: {
    projectId: string;
    requestedByUserId: string;
    type: string;
    prompt: string;
    scope: string[];
    reviewRequired: boolean;
  }): Promise<AiRequestDto> {
    const project = await this.getProjectRecord(input.projectId);
    const row = {
      id: generateId('air'),
      projectId: input.projectId,
      requestedByUserId: input.requestedByUserId,
      type: input.type,
      status: 'queued',
      prompt: input.prompt,
      scopeJson: encodeJson(input.scope),
      inputRevisionId: project?.currentRevisionId ?? null,
      outputRevisionId: null,
      summary: null,
      reviewRequired: input.reviewRequired,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await this.db.insert(this.schema.aiRequests).values(row);
    return this.toAiRequestDto(row);
  }

  async listAiRequests(projectId: string): Promise<AiRequestDto[]> {
    const rows = await this.db
      .select()
      .from(this.schema.aiRequests)
      .where(eq(this.schema.aiRequests.projectId, projectId))
      .orderBy(desc(this.schema.aiRequests.createdAt));

    return rows.map((row: any) => this.toAiRequestDto(row));
  }

  async getAiRequest(projectId: string, aiRequestId: string): Promise<AiRequestDto | null> {
    const row = await this.db.query.aiRequests.findFirst({
      where: and(eq(this.schema.aiRequests.id, aiRequestId), eq(this.schema.aiRequests.projectId, projectId)),
    });
    return row ? this.toAiRequestDto(row) : null;
  }

  async getAiRequestRecord(aiRequestId: string) {
    return (
      (await this.db.query.aiRequests.findFirst({
        where: eq(this.schema.aiRequests.id, aiRequestId),
      })) ?? null
    );
  }

  async updateAiRequest(aiRequestId: string, updates: Partial<Record<string, unknown>>) {
    await this.db
      .update(this.schema.aiRequests)
      .set({ ...updates, updatedAt: nowIso() })
      .where(eq(this.schema.aiRequests.id, aiRequestId));
  }

  async enqueueJob(jobType: string, payload: Record<string, unknown>) {
    const row = {
      id: generateId('job'),
      jobType,
      payloadJson: encodeJson(payload),
      status: 'queued',
      attempts: 0,
      errorSummary: null,
      availableAt: nowIso(),
      startedAt: null,
      completedAt: null,
      createdAt: nowIso(),
    };
    await this.db.insert(this.schema.jobRuns).values(row);
    return row;
  }

  async listDueJobs(limit = 10) {
    return this.db
      .select()
      .from(this.schema.jobRuns)
      .where(and(eq(this.schema.jobRuns.status, 'queued')))
      .orderBy(this.schema.jobRuns.createdAt)
      .limit(limit);
  }

  async markJobRunning(jobId: string) {
    const existing = await this.db.query.jobRuns.findFirst({
      where: eq(this.schema.jobRuns.id, jobId),
    });

    await this.db
      .update(this.schema.jobRuns)
      .set({
        status: 'running',
        attempts: (existing?.attempts ?? 0) + 1,
        startedAt: nowIso(),
      })
      .where(eq(this.schema.jobRuns.id, jobId));
  }

  async markJobComplete(jobId: string) {
    await this.db
      .update(this.schema.jobRuns)
      .set({
        status: 'completed',
        completedAt: nowIso(),
      })
      .where(eq(this.schema.jobRuns.id, jobId));
  }

  async markJobFailed(jobId: string, errorSummary: string) {
    await this.db
      .update(this.schema.jobRuns)
      .set({
        status: 'failed',
        completedAt: nowIso(),
        errorSummary,
      })
      .where(eq(this.schema.jobRuns.id, jobId));
  }

  async requireWorkspaceAdmin(workspaceId: string, userId: string) {
    const role = await this.getWorkspaceRole(workspaceId, userId);
    if (!role || !workspaceAdminRoles.has(role)) {
      throw new PlatformError('Forbidden.', 403);
    }
  }

  async requireWorkspaceProjectCreate(workspaceId: string, userId: string) {
    const role = await this.getWorkspaceRole(workspaceId, userId);
    if (!role || !workspaceProjectCreateRoles.has(role)) {
      throw new PlatformError('Forbidden.', 403);
    }
  }

  async requireProjectEdit(projectId: string, userId: string) {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new PlatformError('Project not found.', 404);
    }

    const workspaceRole = await this.getWorkspaceRole(project.workspaceId, userId);
    if (workspaceRole && workspaceAdminRoles.has(workspaceRole)) {
      return;
    }

    const projectRole = await this.getProjectRole(projectId, userId);
    if (!projectRole || !projectEditRoles.has(projectRole)) {
      throw new PlatformError('Forbidden.', 403);
    }
  }

  async requireProjectDeploy(projectId: string, userId: string) {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new PlatformError('Project not found.', 404);
    }

    const workspaceRole = await this.getWorkspaceRole(project.workspaceId, userId);
    if (workspaceRole && workspaceAdminRoles.has(workspaceRole)) {
      return;
    }

    const projectRole = await this.getProjectRole(projectId, userId);
    if (!projectRole || !projectDeployRoles.has(projectRole)) {
      throw new PlatformError('Forbidden.', 403);
    }
  }

  async buildSessionDto(session: any): Promise<SessionDto> {
    const workspaces = await this.listWorkspacesForUser(session.userId);
    return {
      sessionId: session.id,
      subjectId: session.userId,
      subjectType: 'human',
      providerKey: session.providerKey,
      providerUserId: session.providerUserId ?? undefined,
      workspaceIds: workspaces.map((workspace) => workspace.id),
      activeWorkspaceId: session.activeWorkspaceId,
      amr: decodeJson<string[]>(session.amrJson, ['oidc']),
      issuedAt: session.createdAt,
      expiresAt: session.expiresAt,
      lastSeenAt: session.lastSeenAt,
    };
  }

  private toWorkspaceDto(row: any): WorkspaceDto {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      plan: row.plan,
      billingEmail: row.billingEmail,
    };
  }

  private toProjectDto(row: any): ProjectDto {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      slug: row.slug,
      name: row.name,
      archetype: row.archetype,
      visibility: row.visibility,
      hostingMode: row.hostingMode,
      currentRevisionId: row.currentRevisionId,
      publishedDeploymentId: row.publishedDeploymentId,
    };
  }

  private toRevisionDto(row: any): RevisionDto {
    return {
      id: row.id,
      projectId: row.projectId,
      source: row.source,
      status: row.status,
      baseRevisionId: row.baseRevisionId,
      changeSummary: row.changeSummary,
      createdAt: row.createdAt,
    };
  }

  private toDeploymentDto(row: any): DeploymentDto {
    return {
      id: row.id,
      projectId: row.projectId,
      revisionId: row.revisionId,
      environment: row.environment,
      status: row.status,
      staticUrl: row.staticUrl,
      previewUrl: row.previewUrl,
      publishedUrl: row.publishedUrl,
      buildLogUrl: row.buildLogUrl,
      buildArtifactPath: row.buildArtifactPath,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
    };
  }

  private toDomainDto(row: any): DomainDto {
    return {
      id: row.id,
      projectId: row.projectId,
      hostname: row.hostname,
      kind: row.kind,
      verificationStatus: row.verificationStatus,
      certificateStatus: row.certificateStatus,
      dnsTarget: row.dnsTarget,
      isPrimary: Boolean(row.isPrimary),
      verificationToken: row.verificationToken,
      verifiedAt: row.verifiedAt,
    };
  }

  private toAiRequestDto(row: any): AiRequestDto {
    return {
      id: row.id,
      projectId: row.projectId,
      type: row.type,
      status: row.status,
      prompt: row.prompt,
      scope: decodeJson<AiRequestDto['scope']>(row.scopeJson, []),
      inputRevisionId: row.inputRevisionId,
      outputRevisionId: row.outputRevisionId,
      summary: row.summary,
      reviewRequired: Boolean(row.reviewRequired),
      createdAt: row.createdAt,
    };
  }
}
