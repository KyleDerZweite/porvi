export const authProviderKinds = ['zitadel', 'generic-oidc'] as const;
export const authProviderRegistrationModes = [
  'disabled',
  'invite_only',
  'provider_controlled',
  'open',
] as const;
export const sessionSubjectTypes = ['human', 'service'] as const;
export const workspaceRoles = [
  'workspace_owner',
  'workspace_admin',
  'project_creator',
  'billing_admin',
  'member',
  'viewer',
] as const;
export const projectRoles = [
  'project_owner',
  'project_admin',
  'editor',
  'reviewer',
  'deployer',
  'viewer',
] as const;
export const archetypes = ['link-hub', 'portfolio', 'creator-site'] as const;
export const deploymentStatuses = [
  'queued',
  'building',
  'ready',
  'failed',
  'cancelled',
  'superseded',
] as const;
export const aiRequestStatuses = [
  'draft',
  'queued',
  'running',
  'needs_review',
  'approved',
  'rejected',
  'applied',
  'failed',
  'cancelled',
] as const;
export const aiRequestTypes = [
  'generate_initial_site',
  'update_structured_content',
  'restyle_theme',
  'propose_code_change',
] as const;
export const aiScopes = ['manifest', 'content', 'theme', 'code'] as const;
export const domainKinds = ['platform_subdomain', 'custom_domain'] as const;
export const deploymentEnvironments = ['preview', 'production'] as const;

export type AuthProviderKind = (typeof authProviderKinds)[number];
export type AuthProviderRegistrationMode = (typeof authProviderRegistrationModes)[number];
export type SessionSubjectType = (typeof sessionSubjectTypes)[number];
export type WorkspaceRole = (typeof workspaceRoles)[number];
export type ProjectRole = (typeof projectRoles)[number];
export type Archetype = (typeof archetypes)[number];
export type DeploymentStatus = (typeof deploymentStatuses)[number];
export type AiRequestStatus = (typeof aiRequestStatuses)[number];
export type AiRequestType = (typeof aiRequestTypes)[number];
export type AiScope = (typeof aiScopes)[number];
export type DomainKind = (typeof domainKinds)[number];
export type DeploymentEnvironment = (typeof deploymentEnvironments)[number];

export interface AuthProviderConfig {
  key: string;
  kind: AuthProviderKind;
  display_name: string;
  registration_mode: AuthProviderRegistrationMode;
  issuer: string;
  client_id: string;
  client_secret_ref: string;
  scopes: string[];
  pkce_required: boolean;
  authorization_params?: Record<string, string | number | boolean>;
  claims_mapping: Record<string, string>;
  provisioning: {
    jit_user_creation: boolean;
    jit_workspace_membership: boolean;
    allow_account_linking: boolean;
    auto_create_personal_workspace: boolean;
    default_workspace_role: WorkspaceRole;
    require_verified_email: boolean;
  };
  role_mapping: Array<{
    source: 'claim_value' | 'claim_contains' | 'claim_regex' | 'provider_default';
    claim?: string;
    match: string | string[];
    grants: Array<WorkspaceRole | ProjectRole>;
    workspace_selector?: Record<string, unknown>;
    project_selector?: Record<string, unknown>;
    priority: number;
  }>;
  organization_resolution: {
    mode: 'none' | 'email_domain' | 'provider_org' | 'explicit_hint';
    claim?: string;
  };
  enabled: boolean;
}

export interface AuthProviderDto {
  key: string;
  kind: AuthProviderKind;
  displayName: string;
  enabled: boolean;
  loginHintSupported: boolean;
  workspaceDiscoveryMode: 'none' | 'email_domain' | 'provider_org' | 'explicit_hint';
  registrationMode: AuthProviderRegistrationMode;
}

export interface SessionDto {
  sessionId: string;
  subjectId: string;
  subjectType: SessionSubjectType;
  providerKey: string;
  providerUserId?: string;
  workspaceIds: string[];
  activeWorkspaceId?: string | null;
  amr: string[];
  issuedAt: string;
  expiresAt: string;
  lastSeenAt: string;
}

export interface UserDto {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName?: string | null;
  preferredUsername?: string | null;
  pictureUrl?: string | null;
}

export interface IdentityDto {
  providerKey: string;
  providerUserId: string;
  userId: string;
  email?: string | null;
  claimsVersion?: number | null;
}

export interface WorkspaceDto {
  id: string;
  slug: string;
  name: string;
  plan: 'free' | 'pro' | 'studio' | 'enterprise';
  billingEmail?: string | null;
}

export interface WorkspaceMembershipDto {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
}

export interface ProjectMembershipDto {
  projectId: string;
  userId: string;
  role: ProjectRole;
}

export interface ProjectDto {
  id: string;
  workspaceId: string;
  slug: string;
  name: string;
  archetype: Archetype;
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
  environment: DeploymentEnvironment;
  status: DeploymentStatus;
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
  kind: DomainKind;
  verificationStatus: 'pending' | 'verified' | 'failed';
  certificateStatus: 'pending' | 'active' | 'failed';
  dnsTarget?: string | null;
  isPrimary: boolean;
  verificationToken?: string | null;
  verifiedAt?: string | null;
}

export interface AssetDto {
  id: string;
  projectId: string;
  kind: 'image' | 'video' | 'audio' | 'document' | 'other';
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256?: string | null;
  storageKey?: string | null;
  publicUrl: string;
}

export interface AiRequestDto {
  id: string;
  projectId: string;
  type: AiRequestType;
  status: AiRequestStatus;
  prompt: string;
  scope: AiScope[];
  inputRevisionId?: string | null;
  outputRevisionId?: string | null;
  summary?: string | null;
  reviewRequired: boolean;
  createdAt: string;
}

export interface RuntimeCapabilities {
  dialect: 'sqlite' | 'postgres';
  supportsExternalWorker: boolean;
  supportsEmbeddedWorker: boolean;
  supportsProviderPersistence: boolean;
  supportsRealBuilds: boolean;
  supportsManagedPublish: boolean;
}
