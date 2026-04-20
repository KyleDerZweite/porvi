import * as React from 'react';

import {
  createAiRequest,
  createDeployment,
  createDomain,
  createProject,
  createWorkspace,
  fetchMe,
  fetchProjectContract,
  fetchProjects,
  fetchProviders,
  fetchRevisions,
  fetchSession,
  fetchDomains,
  fetchDeployments,
  fetchDeploymentLog,
  fetchAiRequests,
  fetchWorkspaces,
  logout,
  startLogin,
  updateProjectContract,
  type AuthProvider,
  type AiRequestDto,
  type DeploymentDto,
  type DomainDto,
  type MeResponse,
  type ProjectContract,
  type ProjectDto,
  type RevisionDto,
  type SessionDto,
  type WorkspaceDto,
} from './api.js';

type BootstrapState =
  | {
      status: 'loading';
    }
  | {
      status: 'error';
      message: string;
    }
  | {
      status: 'anonymous';
      providers: AuthProvider[];
    }
  | {
      status: 'authenticated';
      providers: AuthProvider[];
      session: SessionDto;
      me: MeResponse;
      workspaces: WorkspaceDto[];
      projects: ProjectDto[];
    };

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function cloneDraft<T>(value: T): T {
  return structuredClone(value);
}

function createDefaultPage(index: number) {
  return {
    slug: index === 0 ? '' : `page-${index + 1}`,
    title: index === 0 ? 'Home' : `Page ${index + 1}`,
    navLabel: index === 0 ? 'Home' : `Page ${index + 1}`,
    description: '',
    hero: {
      eyebrow: '',
      title: '',
      subtitle: '',
      kicker: '',
      primaryCta: {
        label: '',
        href: '',
      },
      secondaryCta: {
        label: '',
        href: '',
      },
    },
    sectionsJson: '[]',
  };
}

function normalizeDraft(contract: ProjectContract) {
  const manifest = cloneDraft(contract.manifest);
  const siteContent = cloneDraft(contract.siteContent);

  return {
    manifest,
    siteContent,
    pages: (siteContent.pages ?? []).map((page: Record<string, any>) => ({
      slug: page.slug ?? '',
      title: page.title ?? '',
      navLabel: page.navLabel ?? '',
      description: page.description ?? '',
      hero: {
        eyebrow: page.hero?.eyebrow ?? '',
        title: page.hero?.title ?? '',
        subtitle: page.hero?.subtitle ?? '',
        kicker: page.hero?.kicker ?? '',
        primaryCta: {
          label: page.hero?.primaryCta?.label ?? '',
          href: page.hero?.primaryCta?.href ?? '',
        },
        secondaryCta: {
          label: page.hero?.secondaryCta?.label ?? '',
          href: page.hero?.secondaryCta?.href ?? '',
        },
      },
      sectionsJson: JSON.stringify(page.sections ?? [], null, 2),
    })),
  };
}

function buildContractPayload(draft: ReturnType<typeof normalizeDraft>) {
  const manifest = cloneDraft(draft.manifest);
  const siteContent = cloneDraft(draft.siteContent);

  siteContent.pages = draft.pages.map((page) => ({
    slug: page.slug,
    title: page.title,
    navLabel: page.navLabel || undefined,
    description: page.description || undefined,
    hero: {
      eyebrow: page.hero.eyebrow || undefined,
      title: page.hero.title || undefined,
      subtitle: page.hero.subtitle || undefined,
      kicker: page.hero.kicker || undefined,
      primaryCta:
        page.hero.primaryCta.label && page.hero.primaryCta.href
          ? {
              label: page.hero.primaryCta.label,
              href: page.hero.primaryCta.href,
            }
          : undefined,
      secondaryCta:
        page.hero.secondaryCta.label && page.hero.secondaryCta.href
          ? {
              label: page.hero.secondaryCta.label,
              href: page.hero.secondaryCta.href,
            }
          : undefined,
    },
    sections: JSON.parse(page.sectionsJson || '[]'),
  }));

  return {
    manifest,
    siteContent,
  };
}

export function App() {
  const [state, setState] = React.useState<BootstrapState>({ status: 'loading' });
  const [busy, setBusy] = React.useState(false);

  const bootstrap = React.useCallback(async () => {
    setState({ status: 'loading' });

    try {
      const providers = await fetchProviders();
      const session = await fetchSession();

      if (!session) {
        setState({
          status: 'anonymous',
          providers,
        });
        return;
      }

      const [me, workspaces] = await Promise.all([fetchMe(), fetchWorkspaces()]);
      const projects = await fetchProjects(session.activeWorkspaceId ?? session.workspaceIds[0]);

      setState({
        status: 'authenticated',
        providers,
        session,
        me,
        workspaces,
        projects,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize dashboard.';
      setState({
        status: 'error',
        message,
      });
    }
  }, []);

  React.useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const primaryProvider =
    state.status === 'anonymous' || state.status === 'authenticated' ? state.providers[0] : null;

  async function handleLogin() {
    if (!primaryProvider) {
      return;
    }

    setBusy(true);
    try {
      const target = `${window.location.origin}/`;
      const result = await startLogin(primaryProvider.key, target);
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      setBusy(false);
      const message = error instanceof Error ? error.message : 'Unable to start login.';
      setState({
        status: 'error',
        message,
      });
    }
  }

  if (state.status === 'authenticated') {
    return (
      <AuthenticatedDashboard
        providers={state.providers}
        session={state.session}
        me={state.me}
        workspaces={state.workspaces}
        initialProjects={state.projects}
        refreshApp={bootstrap}
      />
    );
  }

  return (
    <div className="shell">
      <div className="shell__backdrop" />
      <main className="shell__main">
        <header className="masthead">
          <p className="eyebrow">Control Plane</p>
          <div className="masthead__row">
            <div>
              <h1>Porvi Console</h1>
              <p className="lede">
                Session-backed OIDC auth is live. This shell only proves the flow and the
                control-plane API.
              </p>
            </div>
          </div>
        </header>

        {state.status === 'loading' ? (
          <section className="panel panel--center">
            <p className="eyebrow">Bootstrapping</p>
            <h2>Checking your session</h2>
            <p className="muted">The app is probing `/v1/session` and `/v1/auth/providers`.</p>
          </section>
        ) : null}

        {state.status === 'error' ? (
          <section className="panel panel--center">
            <p className="eyebrow">Unavailable</p>
            <h2>Console bootstrap failed</h2>
            <p className="muted">{state.message}</p>
            <button className="button" onClick={() => void bootstrap()}>
              Retry
            </button>
          </section>
        ) : null}

        {state.status === 'anonymous' ? (
          <section className="panel auth-card">
            <div>
              <p className="eyebrow">Authentication Required</p>
              <h2>Sign in through your configured identity provider</h2>
              <p className="muted">
                The browser will be redirected to the provider login UI, then back to this
                console with an authenticated Porvi session.
              </p>
            </div>

            <dl className="meta-grid">
              <div>
                <dt>Provider</dt>
                <dd>{primaryProvider?.displayName ?? 'No provider configured'}</dd>
              </div>
              <div>
                <dt>Registration</dt>
                <dd>{primaryProvider?.registrationMode ?? 'unknown'}</dd>
              </div>
              <div>
                <dt>Workspace Discovery</dt>
                <dd>{primaryProvider?.workspaceDiscoveryMode ?? 'unknown'}</dd>
              </div>
            </dl>

            <div className="button-row">
              <button className="button" onClick={handleLogin} disabled={!primaryProvider || busy}>
                {busy ? 'Redirecting…' : 'Sign In'}
              </button>
              {primaryProvider?.registrationMode === 'invite_only' ? (
                <span className="status-pill">Invite only</span>
              ) : null}
            </div>
          </section>
        ) : null}

      </main>
    </div>
  );
}

function AuthenticatedDashboard(props: {
  providers: AuthProvider[];
  session: SessionDto;
  me: MeResponse;
  workspaces: WorkspaceDto[];
  initialProjects: ProjectDto[];
  refreshApp: () => Promise<void>;
}) {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = React.useState(
    props.session.activeWorkspaceId ?? props.workspaces[0]?.id ?? ''
  );
  const [projects, setProjects] = React.useState<ProjectDto[]>(props.initialProjects);
  const [selectedProjectId, setSelectedProjectId] = React.useState(props.initialProjects[0]?.id ?? '');
  const [contract, setContract] = React.useState<ProjectContract | null>(null);
  const [draft, setDraft] = React.useState<ReturnType<typeof normalizeDraft> | null>(null);
  const [revisions, setRevisions] = React.useState<RevisionDto[]>([]);
  const [deployments, setDeployments] = React.useState<DeploymentDto[]>([]);
  const [domains, setDomains] = React.useState<DomainDto[]>([]);
  const [aiRequests, setAiRequests] = React.useState<AiRequestDto[]>([]);
  const [logText, setLogText] = React.useState('');
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loadingProject, setLoadingProject] = React.useState(false);
  const [workspaceForm, setWorkspaceForm] = React.useState({
    name: '',
    slug: '',
    billingEmail: props.me.user.email ?? '',
  });
  const [projectForm, setProjectForm] = React.useState({
    name: '',
    slug: '',
    archetype: 'creator-site' as ProjectDto['archetype'],
  });
  const [domainForm, setDomainForm] = React.useState({
    hostname: '',
    kind: 'platform_subdomain' as DomainDto['kind'],
  });
  const [aiForm, setAiForm] = React.useState({
    type: 'update_structured_content' as AiRequestDto['type'],
    prompt: '',
    reviewRequired: true,
    scope: ['content'] as AiRequestDto['scope'],
  });
  const [isMutating, setIsMutating] = React.useState(false);

  const selectedWorkspace = props.workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? null;
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;

  const refreshProjectResources = React.useCallback(async (projectId: string) => {
    setLoadingProject(true);
    setError(null);
    try {
      const [nextContract, nextRevisions, nextDeployments, nextDomains, nextAiRequests] = await Promise.all([
        fetchProjectContract(projectId),
        fetchRevisions(projectId),
        fetchDeployments(projectId),
        fetchDomains(projectId),
        fetchAiRequests(projectId),
      ]);
      setContract(nextContract);
      setDraft(normalizeDraft(nextContract));
      setRevisions(nextRevisions);
      setDeployments(nextDeployments);
      setDomains(nextDomains);
      setAiRequests(nextAiRequests);
      setLogText('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to load project data.');
    } finally {
      setLoadingProject(false);
    }
  }, []);

  React.useEffect(() => {
    if (!selectedWorkspaceId) {
      setProjects([]);
      setSelectedProjectId('');
      return;
    }

    let cancelled = false;
    fetchProjects(selectedWorkspaceId)
      .then((items) => {
        if (cancelled) {
          return;
        }
        setProjects(items);
        setSelectedProjectId((current) =>
          current && items.some((project) => project.id === current) ? current : items[0]?.id ?? ''
        );
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Failed to load workspace projects.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedWorkspaceId]);

  React.useEffect(() => {
    if (!selectedProjectId) {
      setContract(null);
      setDraft(null);
      setRevisions([]);
      setDeployments([]);
      setDomains([]);
      setAiRequests([]);
      setLogText('');
      return;
    }

    void refreshProjectResources(selectedProjectId);
  }, [selectedProjectId, refreshProjectResources]);

  function updateManifest(path: Array<string>, value: string | boolean) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const target = cloneDraft(current);
      let cursor: Record<string, any> = target.manifest;
      for (let index = 0; index < path.length - 1; index += 1) {
        const key = path[index];
        cursor[key] = cursor[key] ? cloneDraft(cursor[key]) : {};
        cursor = cursor[key];
      }
      cursor[path[path.length - 1]] = value;
      return target;
    });
  }

  function updateProfile(field: string, value: string) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const next = cloneDraft(current);
      next.siteContent.profile = {
        ...(next.siteContent.profile ?? {}),
        [field]: value,
      };
      return next;
    });
  }

  function updatePage(index: number, updater: (page: ReturnType<typeof createDefaultPage>) => void) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const next = cloneDraft(current);
      const page = cloneDraft(next.pages[index]);
      updater(page);
      next.pages[index] = page;
      return next;
    });
  }

  async function withMutation(fn: () => Promise<void>) {
    setIsMutating(true);
    setFeedback(null);
    setError(null);
    try {
      await fn();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Action failed.');
    } finally {
      setIsMutating(false);
    }
  }

  async function handleCreateWorkspace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await withMutation(async () => {
      const workspace = await createWorkspace({
        name: workspaceForm.name,
        slug: workspaceForm.slug,
        billingEmail: workspaceForm.billingEmail || undefined,
      });
      setFeedback(`Workspace "${workspace.name}" created.`);
      await props.refreshApp();
    });
  }

  async function handleCreateProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedWorkspaceId) {
      setError('Select or create a workspace first.');
      return;
    }

    await withMutation(async () => {
      const project = await createProject({
        workspaceId: selectedWorkspaceId,
        name: projectForm.name,
        slug: projectForm.slug,
        archetype: projectForm.archetype,
      });
      const items = await fetchProjects(selectedWorkspaceId);
      setProjects(items);
      setSelectedProjectId(project.id);
      setProjectForm({
        name: '',
        slug: '',
        archetype: 'creator-site',
      });
      setFeedback(`Project "${project.name}" created.`);
    });
  }

  async function handleSaveProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProjectId || !draft) {
      return;
    }

    await withMutation(async () => {
      const payload = buildContractPayload(draft);
      await updateProjectContract(selectedProjectId, {
        manifest: payload.manifest,
        siteContent: payload.siteContent,
        changeSummary: 'Updated from console UI',
      });
      await refreshProjectResources(selectedProjectId);
      const items = await fetchProjects(selectedWorkspaceId);
      setProjects(items);
      setFeedback('Project changes saved.');
    });
  }

  async function handleCreateDomain(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProjectId) {
      return;
    }

    await withMutation(async () => {
      await createDomain({
        projectId: selectedProjectId,
        hostname: domainForm.hostname,
        kind: domainForm.kind,
      });
      setDomainForm({
        hostname: '',
        kind: 'platform_subdomain',
      });
      setDomains(await fetchDomains(selectedProjectId));
      setFeedback('Domain attached.');
    });
  }

  async function handleCreateDeployment(environment: 'preview' | 'production') {
    if (!selectedProjectId || !contract) {
      return;
    }

    await withMutation(async () => {
      await createDeployment({
        projectId: selectedProjectId,
        revisionId: contract.revision.id,
        environment,
      });
      setDeployments(await fetchDeployments(selectedProjectId));
      setFeedback(`${environment === 'preview' ? 'Preview' : 'Production'} deployment queued.`);
    });
  }

  async function handleLoadLog(deploymentId: string) {
    if (!selectedProjectId) {
      return;
    }

    await withMutation(async () => {
      const contents = await fetchDeploymentLog(selectedProjectId, deploymentId);
      setLogText(contents);
    });
  }

  async function handleCreateAiRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProjectId) {
      return;
    }

    await withMutation(async () => {
      await createAiRequest({
        projectId: selectedProjectId,
        type: aiForm.type,
        prompt: aiForm.prompt,
        scope: aiForm.scope,
        reviewRequired: aiForm.reviewRequired,
      });
      setAiForm({
        type: 'update_structured_content',
        prompt: '',
        reviewRequired: true,
        scope: ['content'],
      });
      setAiRequests(await fetchAiRequests(selectedProjectId));
      setFeedback('AI request queued.');
    });
  }

  function toggleAiScope(scope: AiRequestDto['scope'][number]) {
    setAiForm((current) => ({
      ...current,
      scope: current.scope.includes(scope)
        ? current.scope.filter((item) => item !== scope)
        : [...current.scope, scope],
    }));
  }

  return (
    <div className="shell">
      <div className="shell__backdrop" />
      <main className="shell__main shell__main--wide">
        <header className="masthead">
          <p className="eyebrow">Control Plane</p>
          <div className="masthead__row">
            <div>
              <h1>Product UI, not just an auth proof.</h1>
              <p className="lede">
                The backend is now exposed through a working dashboard: create workspaces,
                create projects, edit structured content, attach domains, deploy revisions, and
                queue AI changes.
              </p>
            </div>
            <button className="button button--ghost" onClick={() => void logout().then(props.refreshApp)}>
              Sign Out
            </button>
          </div>
        </header>

        <section className="notice-row">
          <div className="status-pill">Signed in as {props.me.user.email ?? props.session.subjectId}</div>
          {feedback ? <div className="notice notice--success">{feedback}</div> : null}
          {error ? <div className="notice notice--error">{error}</div> : null}
        </section>

        <div className="workspace-layout">
          <aside className="panel sidebar">
            <section className="stack">
              <div>
                <p className="eyebrow">Workspaces</p>
                <h3>{props.workspaces.length}</h3>
              </div>
              <div className="list-stack">
                {props.workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    className={`select-card ${selectedWorkspaceId === workspace.id ? 'is-active' : ''}`}
                    onClick={() => setSelectedWorkspaceId(workspace.id)}
                    type="button"
                  >
                    <strong>{workspace.name}</strong>
                    <span>{workspace.slug}</span>
                  </button>
                ))}
              </div>
            </section>

            <form className="stack form-stack" onSubmit={(event) => void handleCreateWorkspace(event)}>
              <div>
                <p className="eyebrow">New Workspace</p>
                <h3>Create tenant</h3>
              </div>
              <label className="field">
                <span>Name</span>
                <input
                  value={workspaceForm.name}
                  onChange={(event) =>
                    setWorkspaceForm((current) => ({
                      ...current,
                      name: event.target.value,
                      slug: current.slug || slugify(event.target.value),
                    }))
                  }
                  placeholder="Night Market Studio"
                />
              </label>
              <label className="field">
                <span>Slug</span>
                <input
                  value={workspaceForm.slug}
                  onChange={(event) =>
                    setWorkspaceForm((current) => ({
                      ...current,
                      slug: slugify(event.target.value),
                    }))
                  }
                  placeholder="night-market-studio"
                />
              </label>
              <label className="field">
                <span>Billing Email</span>
                <input
                  value={workspaceForm.billingEmail}
                  onChange={(event) =>
                    setWorkspaceForm((current) => ({
                      ...current,
                      billingEmail: event.target.value,
                    }))
                  }
                  placeholder="owner@example.com"
                />
              </label>
              <button className="button" disabled={isMutating}>
                Create Workspace
              </button>
            </form>

            <section className="stack">
              <div>
                <p className="eyebrow">Projects</p>
                <h3>{projects.length}</h3>
              </div>
              <div className="list-stack">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    className={`select-card ${selectedProjectId === project.id ? 'is-active' : ''}`}
                    onClick={() => setSelectedProjectId(project.id)}
                    type="button"
                  >
                    <strong>{project.name}</strong>
                    <span>
                      {project.slug} · {project.archetype}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <form className="stack form-stack" onSubmit={(event) => void handleCreateProject(event)}>
              <div>
                <p className="eyebrow">New Project</p>
                <h3>{selectedWorkspace?.name ?? 'Select workspace first'}</h3>
              </div>
              <label className="field">
                <span>Name</span>
                <input
                  value={projectForm.name}
                  onChange={(event) =>
                    setProjectForm((current) => ({
                      ...current,
                      name: event.target.value,
                      slug: current.slug || slugify(event.target.value),
                    }))
                  }
                  placeholder="Creator Site"
                />
              </label>
              <label className="field">
                <span>Slug</span>
                <input
                  value={projectForm.slug}
                  onChange={(event) =>
                    setProjectForm((current) => ({
                      ...current,
                      slug: slugify(event.target.value),
                    }))
                  }
                  placeholder="creator-site"
                />
              </label>
              <label className="field">
                <span>Archetype</span>
                <select
                  value={projectForm.archetype}
                  onChange={(event) =>
                    setProjectForm((current) => ({
                      ...current,
                      archetype: event.target.value as ProjectDto['archetype'],
                    }))
                  }
                >
                  <option value="creator-site">Creator Site</option>
                  <option value="portfolio">Portfolio</option>
                  <option value="link-hub">Link Hub</option>
                </select>
              </label>
              <button className="button" disabled={isMutating || !selectedWorkspaceId}>
                Create Project
              </button>
            </form>
          </aside>

          <section className="content-column">
            {!selectedProject ? (
              <section className="panel panel--center">
                <p className="eyebrow">No Project Selected</p>
                <h2>Create a workspace and your first project</h2>
                <p className="muted">
                  Once a project exists, this dashboard will load its manifest, content,
                  revisions, domains, deployments, and AI requests.
                </p>
              </section>
            ) : null}

            {selectedProject && contract && draft ? (
              <>
                <section className="panel panel--hero">
                  <div className="hero-toolbar">
                    <div>
                      <p className="eyebrow">Project Overview</p>
                      <h2>{contract.project.name}</h2>
                      <p className="muted">
                        Revision <strong>{contract.revision.id}</strong> · Manifest hash{' '}
                        <code>{contract.manifestHash.slice(0, 12)}</code>
                      </p>
                    </div>
                    <div className="button-row">
                      <button
                        className="button button--ghost"
                        onClick={() => void handleCreateDeployment('preview')}
                        disabled={isMutating}
                        type="button"
                      >
                        Deploy Preview
                      </button>
                      <button
                        className="button"
                        onClick={() => void handleCreateDeployment('production')}
                        disabled={isMutating}
                        type="button"
                      >
                        Publish Production
                      </button>
                    </div>
                  </div>
                  <dl className="meta-grid">
                    <div>
                      <dt>Workspace</dt>
                      <dd>{selectedWorkspace?.name ?? contract.project.workspaceId}</dd>
                    </div>
                    <div>
                      <dt>Visibility</dt>
                      <dd>{contract.project.visibility}</dd>
                    </div>
                    <div>
                      <dt>Hosting</dt>
                      <dd>{contract.project.hostingMode}</dd>
                    </div>
                    <div>
                      <dt>Published Deployment</dt>
                      <dd>{contract.project.publishedDeploymentId ?? 'None yet'}</dd>
                    </div>
                  </dl>
                </section>

                <form className="panel stack" onSubmit={(event) => void handleSaveProject(event)}>
                  <div className="panel__header">
                    <div>
                      <p className="eyebrow">Structured Editor</p>
                      <h3>Update the site contract</h3>
                    </div>
                    <button className="button" disabled={isMutating} type="submit">
                      Save Changes
                    </button>
                  </div>

                  <div className="editor-grid">
                    <label className="field">
                      <span>Site Name</span>
                      <input
                        value={draft.manifest.name ?? ''}
                        onChange={(event) => updateManifest(['name'], event.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>Slug</span>
                      <input
                        value={draft.manifest.slug ?? ''}
                        onChange={(event) => updateManifest(['slug'], slugify(event.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>SEO Title</span>
                      <input
                        value={draft.manifest.seo?.title ?? ''}
                        onChange={(event) => updateManifest(['seo', 'title'], event.target.value)}
                      />
                    </label>
                    <label className="field field--wide">
                      <span>SEO Description</span>
                      <textarea
                        rows={3}
                        value={draft.manifest.seo?.description ?? ''}
                        onChange={(event) => updateManifest(['seo', 'description'], event.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>Subdomain</span>
                      <input
                        value={draft.manifest.deployment?.subdomain ?? ''}
                        onChange={(event) =>
                          updateManifest(['deployment', 'subdomain'], slugify(event.target.value))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>AI Mode</span>
                      <select
                        value={draft.manifest.features?.aiMode ?? 'guided'}
                        onChange={(event) => updateManifest(['features', 'aiMode'], event.target.value)}
                      >
                        <option value="structured">Structured</option>
                        <option value="guided">Guided</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Profile Name</span>
                      <input
                        value={draft.siteContent.profile?.name ?? ''}
                        onChange={(event) => updateProfile('name', event.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>Handle</span>
                      <input
                        value={draft.siteContent.profile?.handle ?? ''}
                        onChange={(event) => updateProfile('handle', event.target.value)}
                      />
                    </label>
                    <label className="field field--wide">
                      <span>Bio</span>
                      <textarea
                        rows={4}
                        value={draft.siteContent.profile?.bio ?? ''}
                        onChange={(event) => updateProfile('bio', event.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>Location</span>
                      <input
                        value={draft.siteContent.profile?.location ?? ''}
                        onChange={(event) => updateProfile('location', event.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>Availability</span>
                      <input
                        value={draft.siteContent.profile?.availability ?? ''}
                        onChange={(event) => updateProfile('availability', event.target.value)}
                      />
                    </label>
                  </div>

                  <div className="stack">
                    <div className="panel__header">
                      <div>
                        <p className="eyebrow">Pages</p>
                        <h3>{draft.pages.length}</h3>
                      </div>
                      <button
                        className="button button--ghost"
                        type="button"
                        onClick={() =>
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  pages: [...current.pages, createDefaultPage(current.pages.length)],
                                }
                              : current
                          )
                        }
                      >
                        Add Page
                      </button>
                    </div>

                    {draft.pages.map((page, index) => (
                      <article key={`${page.slug}-${index}`} className="subpanel stack">
                        <div className="subpanel__header">
                          <strong>{page.title || `Page ${index + 1}`}</strong>
                          <button
                            className="button button--ghost button--small"
                            type="button"
                            onClick={() =>
                              setDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      pages: current.pages.filter((_, pageIndex) => pageIndex !== index),
                                    }
                                  : current
                              )
                            }
                            disabled={draft.pages.length <= 1}
                          >
                            Remove
                          </button>
                        </div>
                        <div className="editor-grid">
                          <label className="field">
                            <span>Slug</span>
                            <input
                              value={page.slug}
                              onChange={(event) =>
                                updatePage(index, (item) => {
                                  item.slug = event.target.value;
                                })
                              }
                            />
                          </label>
                          <label className="field">
                            <span>Title</span>
                            <input
                              value={page.title}
                              onChange={(event) =>
                                updatePage(index, (item) => {
                                  item.title = event.target.value;
                                })
                              }
                            />
                          </label>
                          <label className="field">
                            <span>Navigation Label</span>
                            <input
                              value={page.navLabel}
                              onChange={(event) =>
                                updatePage(index, (item) => {
                                  item.navLabel = event.target.value;
                                })
                              }
                            />
                          </label>
                          <label className="field field--wide">
                            <span>Description</span>
                            <textarea
                              rows={2}
                              value={page.description}
                              onChange={(event) =>
                                updatePage(index, (item) => {
                                  item.description = event.target.value;
                                })
                              }
                            />
                          </label>
                          <label className="field">
                            <span>Hero Title</span>
                            <input
                              value={page.hero.title}
                              onChange={(event) =>
                                updatePage(index, (item) => {
                                  item.hero.title = event.target.value;
                                })
                              }
                            />
                          </label>
                          <label className="field">
                            <span>Hero Eyebrow</span>
                            <input
                              value={page.hero.eyebrow}
                              onChange={(event) =>
                                updatePage(index, (item) => {
                                  item.hero.eyebrow = event.target.value;
                                })
                              }
                            />
                          </label>
                          <label className="field field--wide">
                            <span>Hero Subtitle</span>
                            <textarea
                              rows={3}
                              value={page.hero.subtitle}
                              onChange={(event) =>
                                updatePage(index, (item) => {
                                  item.hero.subtitle = event.target.value;
                                })
                              }
                            />
                          </label>
                          <label className="field field--wide">
                            <span>Sections JSON</span>
                            <textarea
                              rows={8}
                              value={page.sectionsJson}
                              onChange={(event) =>
                                updatePage(index, (item) => {
                                  item.sectionsJson = event.target.value;
                                })
                              }
                            />
                          </label>
                        </div>
                      </article>
                    ))}
                  </div>
                </form>

                <div className="dashboard-grid dashboard-grid--two">
                  <section className="panel stack">
                    <div className="panel__header">
                      <div>
                        <p className="eyebrow">Domains</p>
                        <h3>{domains.length}</h3>
                      </div>
                    </div>
                    <div className="entity-list">
                      {domains.map((domain) => (
                        <div key={domain.id} className="entity-list__item">
                          <div>
                            <strong>{domain.hostname}</strong>
                            <p>
                              {domain.kind} · verification {domain.verificationStatus} · cert{' '}
                              {domain.certificateStatus}
                            </p>
                            {domain.verificationToken ? (
                              <p>Verification token: {domain.verificationToken}</p>
                            ) : null}
                          </div>
                          {domain.isPrimary ? <span className="status-pill">Primary</span> : null}
                        </div>
                      ))}
                    </div>

                    <form className="form-inline" onSubmit={(event) => void handleCreateDomain(event)}>
                      <input
                        value={domainForm.hostname}
                        onChange={(event) =>
                          setDomainForm((current) => ({
                            ...current,
                            hostname: event.target.value,
                          }))
                        }
                        placeholder="creator.porvi.test"
                      />
                      <select
                        value={domainForm.kind}
                        onChange={(event) =>
                          setDomainForm((current) => ({
                            ...current,
                            kind: event.target.value as DomainDto['kind'],
                          }))
                        }
                      >
                        <option value="platform_subdomain">Platform subdomain</option>
                        <option value="custom_domain">Custom domain</option>
                      </select>
                      <button className="button button--ghost" disabled={isMutating}>
                        Add Domain
                      </button>
                    </form>
                  </section>

                  <section className="panel stack">
                    <div className="panel__header">
                      <div>
                        <p className="eyebrow">Deployments</p>
                        <h3>{deployments.length}</h3>
                      </div>
                    </div>
                    <div className="entity-list">
                      {deployments.map((deployment) => (
                        <div key={deployment.id} className="entity-list__item">
                          <div>
                            <strong>
                              {deployment.environment} · {deployment.status}
                            </strong>
                            <p>{formatDate(deployment.createdAt)}</p>
                            <p>{deployment.previewUrl ?? deployment.publishedUrl ?? deployment.staticUrl ?? 'No URL yet'}</p>
                          </div>
                          <button
                            className="button button--ghost button--small"
                            type="button"
                            onClick={() => void handleLoadLog(deployment.id)}
                          >
                            View Log
                          </button>
                        </div>
                      ))}
                    </div>
                    <textarea
                      className="log-viewer"
                      readOnly
                      value={logText || 'Select a deployment log to inspect build output.'}
                    />
                  </section>
                </div>

                <div className="dashboard-grid dashboard-grid--two">
                  <section className="panel stack">
                    <div className="panel__header">
                      <div>
                        <p className="eyebrow">Revisions</p>
                        <h3>{revisions.length}</h3>
                      </div>
                    </div>
                    <div className="entity-list">
                      {revisions.map((revision) => (
                        <div key={revision.id} className="entity-list__item">
                          <div>
                            <strong>{revision.id}</strong>
                            <p>
                              {revision.source} · {revision.status}
                            </p>
                            <p>{revision.changeSummary || 'No summary'}</p>
                          </div>
                          <span className="status-pill">{formatDate(revision.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="panel stack">
                    <div className="panel__header">
                      <div>
                        <p className="eyebrow">AI Requests</p>
                        <h3>{aiRequests.length}</h3>
                      </div>
                    </div>
                    <div className="entity-list">
                      {aiRequests.map((request) => (
                        <div key={request.id} className="entity-list__item">
                          <div>
                            <strong>
                              {request.type} · {request.status}
                            </strong>
                            <p>{request.prompt}</p>
                          </div>
                          <span className="status-pill">{request.scope.join(', ')}</span>
                        </div>
                      ))}
                    </div>
                    <form className="stack form-stack" onSubmit={(event) => void handleCreateAiRequest(event)}>
                      <label className="field">
                        <span>Request Type</span>
                        <select
                          value={aiForm.type}
                          onChange={(event) =>
                            setAiForm((current) => ({
                              ...current,
                              type: event.target.value as AiRequestDto['type'],
                            }))
                          }
                        >
                          <option value="update_structured_content">Update structured content</option>
                          <option value="restyle_theme">Restyle theme</option>
                          <option value="generate_initial_site">Generate initial site</option>
                          <option value="propose_code_change">Propose code change</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Prompt</span>
                        <textarea
                          rows={4}
                          value={aiForm.prompt}
                          onChange={(event) =>
                            setAiForm((current) => ({
                              ...current,
                              prompt: event.target.value,
                            }))
                          }
                          placeholder="Make the homepage sharper, more editorial, and reduce bio copy."
                        />
                      </label>
                      <div className="scope-row">
                        {(['manifest', 'content', 'theme', 'code'] as const).map((scope) => (
                          <label key={scope} className="checkbox">
                            <input
                              checked={aiForm.scope.includes(scope)}
                              onChange={() => toggleAiScope(scope)}
                              type="checkbox"
                            />
                            <span>{scope}</span>
                          </label>
                        ))}
                      </div>
                      <label className="checkbox">
                        <input
                          checked={aiForm.reviewRequired}
                          onChange={(event) =>
                            setAiForm((current) => ({
                              ...current,
                              reviewRequired: event.target.checked,
                            }))
                          }
                          type="checkbox"
                        />
                        <span>Require review before apply</span>
                      </label>
                      <button className="button button--ghost" disabled={isMutating || aiForm.scope.length === 0}>
                        Queue AI Request
                      </button>
                    </form>
                  </section>
                </div>
              </>
            ) : null}

            {loadingProject ? (
              <section className="panel panel--center">
                <p className="eyebrow">Loading</p>
                <h2>Fetching project resources</h2>
                <p className="muted">Manifest, content, revisions, domains, deployments, and AI requests.</p>
              </section>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
