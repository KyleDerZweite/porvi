import { z } from 'zod';

import {
  aiRequestStatuses,
  aiRequestTypes,
  aiScopes,
  archetypes,
  authProviderKinds,
  authProviderRegistrationModes,
  deploymentEnvironments,
  deploymentStatuses,
  domainKinds,
  projectRoles,
  sessionSubjectTypes,
  workspaceRoles,
} from './types.js';

export const authProviderConfigSchema = z.object({
  key: z.string().min(1),
  kind: z.enum(authProviderKinds),
  display_name: z.string().min(1),
  registration_mode: z.enum(authProviderRegistrationModes).default('provider_controlled'),
  issuer: z.string().url(),
  client_id: z.string().min(1),
  client_secret_ref: z.string().min(1),
  scopes: z.array(z.string().min(1)).min(1),
  pkce_required: z.boolean(),
  authorization_params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  claims_mapping: z.record(z.string(), z.string()),
  provisioning: z.object({
    jit_user_creation: z.boolean(),
    jit_workspace_membership: z.boolean(),
    allow_account_linking: z.boolean(),
    auto_create_personal_workspace: z.boolean(),
    default_workspace_role: z.enum(workspaceRoles),
    require_verified_email: z.boolean(),
  }),
  role_mapping: z.array(
    z.object({
      source: z.enum(['claim_value', 'claim_contains', 'claim_regex', 'provider_default']),
      claim: z.string().optional(),
      match: z.union([z.string(), z.array(z.string())]),
      grants: z.array(z.union([z.enum(workspaceRoles), z.enum(projectRoles)])).min(1),
      workspace_selector: z.record(z.string(), z.unknown()).optional(),
      project_selector: z.record(z.string(), z.unknown()).optional(),
      priority: z.number().int().nonnegative(),
    })
  ),
  organization_resolution: z.object({
    mode: z.enum(['none', 'email_domain', 'provider_org', 'explicit_hint']),
    claim: z.string().optional(),
  }),
  enabled: z.boolean(),
});

export const authProviderSchema = z.object({
  key: z.string().min(1),
  kind: z.enum(authProviderKinds),
  displayName: z.string().min(1),
  enabled: z.boolean(),
  loginHintSupported: z.boolean(),
  workspaceDiscoveryMode: z.enum(['none', 'email_domain', 'provider_org', 'explicit_hint']),
  registrationMode: z.enum(authProviderRegistrationModes),
});

export const sessionSchema = z.object({
  sessionId: z.string().min(1),
  subjectId: z.string().min(1),
  subjectType: z.enum(sessionSubjectTypes),
  providerKey: z.string().min(1),
  providerUserId: z.string().optional(),
  workspaceIds: z.array(z.string()),
  activeWorkspaceId: z.string().nullable().optional(),
  amr: z.array(z.string()),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  lastSeenAt: z.string().datetime(),
});

export const workspaceSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  plan: z.enum(['free', 'pro', 'studio', 'enterprise']),
  billingEmail: z.string().email().nullable().optional(),
});

export const workspaceMembershipSchema = z.object({
  workspaceId: z.string(),
  userId: z.string(),
  role: z.enum(workspaceRoles),
});

export const projectSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  slug: z.string(),
  name: z.string(),
  archetype: z.enum(archetypes),
  visibility: z.enum(['private', 'public']),
  hostingMode: z.enum(['managed', 'self-host-export', 'hybrid']),
  currentRevisionId: z.string().nullable().optional(),
  publishedDeploymentId: z.string().nullable().optional(),
});

export const createWorkspaceInputSchema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  billingEmail: z.string().email().optional(),
});

export const createProjectInputSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  archetype: z.enum(archetypes),
});

export const updateProjectInputSchema = z.object({
  manifest: z.record(z.string(), z.unknown()).optional(),
  siteContent: z.record(z.string(), z.unknown()).optional(),
  changeSummary: z.string().optional(),
});

export const startLoginInputSchema = z.object({
  providerKey: z.string().min(1),
  redirectTo: z.string().optional(),
  workspaceHint: z.string().optional(),
});

export const deploymentSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  revisionId: z.string(),
  environment: z.enum(deploymentEnvironments),
  status: z.enum(deploymentStatuses),
  staticUrl: z.string().url().nullable().optional(),
  previewUrl: z.string().url().nullable().optional(),
  publishedUrl: z.string().url().nullable().optional(),
  buildLogUrl: z.string().url().nullable().optional(),
  buildArtifactPath: z.string().nullable().optional(),
  startedAt: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
});

export const createDeploymentInputSchema = z.object({
  revisionId: z.string().min(1),
  environment: z.enum(deploymentEnvironments),
});

export const domainSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  hostname: z.string(),
  kind: z.enum(domainKinds),
  verificationStatus: z.enum(['pending', 'verified', 'failed']),
  certificateStatus: z.enum(['pending', 'active', 'failed']),
  dnsTarget: z.string().nullable().optional(),
  isPrimary: z.boolean(),
  verificationToken: z.string().nullable().optional(),
  verifiedAt: z.string().datetime().nullable().optional(),
});

export const createDomainInputSchema = z.object({
  hostname: z.string().min(1),
  kind: z.enum(domainKinds),
});

export const aiRequestSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  type: z.enum(aiRequestTypes),
  status: z.enum(aiRequestStatuses),
  prompt: z.string(),
  scope: z.array(z.enum(aiScopes)).min(1),
  inputRevisionId: z.string().nullable().optional(),
  outputRevisionId: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  reviewRequired: z.boolean(),
  createdAt: z.string().datetime(),
});

export const runtimeCapabilitiesSchema = z.object({
  dialect: z.enum(['sqlite', 'postgres']),
  supportsExternalWorker: z.boolean(),
  supportsEmbeddedWorker: z.boolean(),
  supportsProviderPersistence: z.boolean(),
  supportsRealBuilds: z.boolean(),
  supportsManagedPublish: z.boolean(),
});

export const createAiRequestInputSchema = z.object({
  type: z.enum(aiRequestTypes),
  prompt: z.string().min(1),
  scope: z.array(z.enum(aiScopes)).min(1),
  reviewRequired: z.boolean().optional(),
});
