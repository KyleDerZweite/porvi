export const PRODUCT_VERSION: number;
export const SUPPORTED_ARCHETYPES: readonly ['link-hub', 'portfolio', 'creator-site'];
export const AI_MODES: readonly ['structured', 'guided', 'advanced'];
export const SECTION_TYPES: readonly ['text', 'links', 'featured', 'embeds', 'cta'];
export const AUTH_PROVIDER_KINDS: readonly ['zitadel', 'generic-oidc'];
export const SESSION_SUBJECT_TYPES: readonly ['human', 'service'];
export const WORKSPACE_ROLES: readonly [
  'workspace_owner',
  'workspace_admin',
  'project_creator',
  'billing_admin',
  'member',
  'viewer'
];
export const PROJECT_ROLES: readonly [
  'project_owner',
  'project_admin',
  'editor',
  'reviewer',
  'deployer',
  'viewer'
];
export const DEPLOYMENT_STATUSES: readonly [
  'queued',
  'building',
  'ready',
  'failed',
  'cancelled',
  'superseded'
];
export const AI_REQUEST_STATUSES: readonly [
  'draft',
  'queued',
  'running',
  'needs_review',
  'approved',
  'rejected',
  'applied',
  'failed',
  'cancelled'
];
export const AI_REQUEST_TYPES: readonly [
  'generate_initial_site',
  'update_structured_content',
  'restyle_theme',
  'propose_code_change'
];

export interface StarterProjectInput {
  name: string;
  slug: string;
  archetype?: 'link-hub' | 'portfolio' | 'creator-site';
  description?: string;
}

export function createStarterProject(input: StarterProjectInput): {
  manifest: Record<string, unknown>;
  site: Record<string, unknown>;
};

export function getDefaultTheme(): Record<string, unknown>;

export function prepareSiteProject(
  manifestInput: Record<string, unknown>,
  siteInput: Record<string, unknown>
): Record<string, unknown>;

export function createZitadelProviderPreset(input?: Record<string, unknown>): Record<string, unknown>;
