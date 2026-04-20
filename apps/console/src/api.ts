export interface AuthProvider {
  key: string;
  kind: 'zitadel' | 'generic-oidc';
  displayName: string;
  enabled: boolean;
  loginHintSupported: boolean;
  workspaceDiscoveryMode: 'none' | 'email_domain' | 'provider_org' | 'explicit_hint';
  registrationMode: 'disabled' | 'invite_only' | 'provider_controlled' | 'open';
}

export interface SessionDto {
  sessionId: string;
  subjectId: string;
  subjectType: 'human' | 'service';
  providerKey: string;
  providerUserId?: string;
  workspaceIds: string[];
  activeWorkspaceId?: string | null;
  amr: string[];
  issuedAt: string;
  expiresAt: string;
  lastSeenAt: string;
}

export interface MeResponse {
  user: {
    id?: string;
    email?: string;
    emailVerified: boolean;
    displayName?: string | null;
    preferredUsername?: string | null;
    pictureUrl?: string | null;
  };
  identities: Array<unknown>;
  workspaceMemberships: Array<{
    workspaceId: string;
    userId: string;
    role: string;
  }>;
  projectMemberships: Array<{
    projectId: string;
    userId: string;
    role: string;
  }>;
}

export interface WorkspaceDto {
  id: string;
  slug: string;
  name: string;
  plan: 'free' | 'pro' | 'studio' | 'enterprise';
  billingEmail?: string | null;
}

export interface ProjectDto {
  id: string;
  workspaceId: string;
  slug: string;
  name: string;
  archetype: 'link-hub' | 'portfolio' | 'creator-site';
  visibility: 'private' | 'public';
  hostingMode: 'managed' | 'self-host-export' | 'hybrid';
  currentRevisionId?: string | null;
  publishedDeploymentId?: string | null;
}

export interface RevisionDto {
  id: string;
  projectId: string;
  source: 'manual' | 'api' | 'ai' | 'import';
  status: 'draft' | 'ready' | 'published' | 'reverted' | 'failed';
  baseRevisionId?: string | null;
  changeSummary?: string | null;
  createdAt: string;
}

export interface DeploymentDto {
  id: string;
  projectId: string;
  revisionId: string;
  environment: 'preview' | 'production';
  status: 'queued' | 'building' | 'ready' | 'failed' | 'cancelled' | 'superseded';
  staticUrl?: string | null;
  previewUrl?: string | null;
  publishedUrl?: string | null;
  buildLogUrl?: string | null;
  buildArtifactPath?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

export interface DomainDto {
  id: string;
  projectId: string;
  hostname: string;
  kind: 'platform_subdomain' | 'custom_domain';
  verificationStatus: 'pending' | 'verified' | 'failed';
  certificateStatus: 'pending' | 'active' | 'failed';
  dnsTarget?: string | null;
  isPrimary: boolean;
  verificationToken?: string | null;
  verifiedAt?: string | null;
}

export interface AiRequestDto {
  id: string;
  projectId: string;
  type:
    | 'generate_initial_site'
    | 'update_structured_content'
    | 'restyle_theme'
    | 'propose_code_change';
  status:
    | 'draft'
    | 'queued'
    | 'running'
    | 'needs_review'
    | 'approved'
    | 'rejected'
    | 'applied'
    | 'failed'
    | 'cancelled';
  prompt: string;
  scope: Array<'manifest' | 'content' | 'theme' | 'code'>;
  inputRevisionId?: string | null;
  outputRevisionId?: string | null;
  summary?: string | null;
  reviewRequired: boolean;
  createdAt: string;
}

export interface ProjectContract {
  project: ProjectDto;
  revision: RevisionDto;
  manifest: Record<string, any>;
  siteContent: Record<string, any>;
  manifestHash: string;
  contentHash: string;
}

const DEFAULT_API_URL = 'http://localhost:3000';

export function getApiUrl() {
  return (import.meta.env.VITE_PLATFORM_API_URL as string | undefined) ?? DEFAULT_API_URL;
}

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(pathname: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiUrl()}${pathname}`, {
    credentials: 'include',
    headers: init?.body
      ? {
          'content-type': 'application/json',
          ...(init?.headers ?? {}),
        }
      : init?.headers,
    ...init,
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) {
        message = payload.error;
      }
    } catch {
      // Ignore JSON parsing failures for non-JSON error responses.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function fetchProviders() {
  return request<{ providers: AuthProvider[] }>('/v1/auth/providers').then((payload) => payload.providers);
}

export async function fetchSession() {
  const response = await fetch(`${getApiUrl()}/v1/session`, {
    credentials: 'include',
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch session: ${response.status}`);
  }

  return (await response.json()) as SessionDto;
}

export async function fetchMe() {
  return request<MeResponse>('/v1/me');
}

export async function fetchWorkspaces() {
  return request<{ items: WorkspaceDto[] }>('/v1/workspaces').then((payload) => payload.items);
}

export async function fetchProjects(workspaceId?: string) {
  const search = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : '';
  return request<{ items: ProjectDto[] }>(`/v1/projects${search}`).then((payload) => payload.items);
}

export async function createWorkspace(input: {
  name: string;
  slug: string;
  billingEmail?: string;
}) {
  return request<WorkspaceDto>('/v1/workspaces', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function createProject(input: {
  workspaceId: string;
  name: string;
  slug: string;
  archetype: 'link-hub' | 'portfolio' | 'creator-site';
}) {
  return request<ProjectDto>('/v1/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function fetchProjectContract(projectId: string) {
  return request<ProjectContract>(`/v1/projects/${projectId}`);
}

export async function updateProjectContract(
  projectId: string,
  input: {
    manifest?: Record<string, unknown>;
    siteContent?: Record<string, unknown>;
    changeSummary?: string;
  }
) {
  return request<{ project: ProjectDto; revision: RevisionDto }>(`/v1/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function fetchRevisions(projectId: string) {
  return request<{ items: RevisionDto[] }>(`/v1/projects/${projectId}/revisions`).then(
    (payload) => payload.items
  );
}

export async function fetchDeployments(projectId: string) {
  return request<{ items: DeploymentDto[] }>(`/v1/projects/${projectId}/deployments`).then(
    (payload) => payload.items
  );
}

export async function createDeployment(input: {
  projectId: string;
  revisionId: string;
  environment: 'preview' | 'production';
}) {
  return request<DeploymentDto>(`/v1/projects/${input.projectId}/deployments`, {
    method: 'POST',
    body: JSON.stringify({
      revisionId: input.revisionId,
      environment: input.environment,
    }),
  });
}

export async function fetchDeploymentLog(projectId: string, deploymentId: string) {
  const response = await fetch(`${getApiUrl()}/v1/projects/${projectId}/deployments/${deploymentId}/log`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new ApiError(`Failed to fetch deployment log: ${response.status}`, response.status);
  }

  return response.text();
}

export async function fetchDomains(projectId: string) {
  return request<{ items: DomainDto[] }>(`/v1/projects/${projectId}/domains`).then((payload) => payload.items);
}

export async function createDomain(input: {
  projectId: string;
  hostname: string;
  kind: 'platform_subdomain' | 'custom_domain';
}) {
  return request<DomainDto>(`/v1/projects/${input.projectId}/domains`, {
    method: 'POST',
    body: JSON.stringify({
      hostname: input.hostname,
      kind: input.kind,
    }),
  });
}

export async function fetchAiRequests(projectId: string) {
  return request<{ items: AiRequestDto[] }>(`/v1/projects/${projectId}/ai-requests`).then(
    (payload) => payload.items
  );
}

export async function createAiRequest(input: {
  projectId: string;
  type: AiRequestDto['type'];
  prompt: string;
  scope: AiRequestDto['scope'];
  reviewRequired: boolean;
}) {
  return request<AiRequestDto>(`/v1/projects/${input.projectId}/ai-requests`, {
    method: 'POST',
    body: JSON.stringify({
      type: input.type,
      prompt: input.prompt,
      scope: input.scope,
      reviewRequired: input.reviewRequired,
    }),
  });
}

export async function startLogin(providerKey: string, redirectTo: string) {
  return request<{ authorizationUrl: string; state: string }>('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      providerKey,
      redirectTo,
    }),
  });
}

export async function logout() {
  await request<void>('/v1/auth/logout', {
    method: 'POST',
  });
}

export { ApiError };
