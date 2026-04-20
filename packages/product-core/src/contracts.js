export const PRODUCT_VERSION = 1;

export const SUPPORTED_ARCHETYPES = ['link-hub', 'portfolio', 'creator-site'];

export const AI_MODES = ['structured', 'guided', 'advanced'];

export const SECTION_TYPES = ['text', 'links', 'featured', 'embeds', 'cta'];

export const AUTH_PROVIDER_KINDS = ['zitadel', 'generic-oidc'];

export const SESSION_SUBJECT_TYPES = ['human', 'service'];

export const WORKSPACE_ROLES = [
  'workspace_owner',
  'workspace_admin',
  'project_creator',
  'billing_admin',
  'member',
  'viewer',
];

export const PROJECT_ROLES = [
  'project_owner',
  'project_admin',
  'editor',
  'reviewer',
  'deployer',
  'viewer',
];

export const DEPLOYMENT_STATUSES = [
  'queued',
  'building',
  'ready',
  'failed',
  'cancelled',
  'superseded',
];

export const AI_REQUEST_STATUSES = [
  'draft',
  'queued',
  'running',
  'needs_review',
  'approved',
  'rejected',
  'applied',
  'failed',
  'cancelled',
];

export const AI_REQUEST_TYPES = [
  'generate_initial_site',
  'update_structured_content',
  'restyle_theme',
  'propose_code_change',
];
