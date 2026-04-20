import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, rename, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface BuildRuntimeConfig {
  repoRoot: string;
  templateDir?: string;
  runtimeRoot?: string;
  publishRoot: string;
  previewRoot: string;
}

export interface BuildDeploymentInput {
  deploymentId: string;
  projectId: string;
  revisionId: string;
  environment: 'preview' | 'production';
  manifest: Record<string, unknown>;
  siteContent: Record<string, unknown>;
}

export interface BuildDeploymentResult {
  artifactRoot: string;
  artifactPath: string;
  logPath: string;
}

export class LocalBuildService {
  private readonly templateDir: string;
  private readonly runtimeRoot: string;

  constructor(private readonly config: BuildRuntimeConfig) {
    this.templateDir = config.templateDir ?? path.join(config.repoRoot, 'templates', 'base-astro');
    this.runtimeRoot = config.runtimeRoot ?? path.join(config.repoRoot, '.porvi', 'runtime');
  }

  async buildDeployment(input: BuildDeploymentInput): Promise<BuildDeploymentResult> {
    const { artifactRoot, artifactPath, logPath } = this.getDeploymentPaths(
      input.projectId,
      input.deploymentId,
      input.environment
    );
    const revisionFiles = await this.materializeRevisionFiles(input.projectId, input.revisionId, {
      manifest: input.manifest,
      siteContent: input.siteContent,
    });

    await rm(artifactRoot, { recursive: true, force: true });
    await mkdir(artifactRoot, { recursive: true });

    const { exitCode, output } = existsSync(this.templateDir)
      ? await this.runTemplateBuild({
          manifestPath: revisionFiles.manifestPath,
          siteContentPath: revisionFiles.siteContentPath,
          outDir: artifactPath,
        })
      : await this.runFallbackBuild({
          manifest: input.manifest,
          siteContent: input.siteContent,
          outDir: artifactPath,
        });

    await writeFile(logPath, output, 'utf8');

    if (exitCode !== 0) {
      throw new Error(`Static build failed with exit code ${exitCode}.`);
    }

    return {
      artifactRoot,
      artifactPath,
      logPath,
    };
  }

  async promoteProductionDeployment(projectId: string, artifactPath: string) {
    const projectRoot = path.join(this.config.publishRoot, 'projects', projectId);
    const currentPath = path.join(projectRoot, 'current');
    const nextPath = path.join(projectRoot, `.current-${Date.now()}`);

    await mkdir(projectRoot, { recursive: true });
    await rm(nextPath, { recursive: true, force: true });
    await symlink(artifactPath, nextPath, 'dir');
    await rename(nextPath, currentPath);

    return currentPath;
  }

  getCurrentPublishedPath(projectId: string) {
    return path.join(this.config.publishRoot, 'projects', projectId, 'current');
  }

  getDeploymentPaths(projectId: string, deploymentId: string, environment: 'preview' | 'production') {
    const artifactRoot = this.getArtifactRoot(projectId, deploymentId, environment);
    return {
      artifactRoot,
      artifactPath: path.join(artifactRoot, 'site'),
      logPath: path.join(artifactRoot, 'build.log'),
    };
  }

  private getArtifactRoot(projectId: string, deploymentId: string, environment: 'preview' | 'production') {
    const targetRoot = environment === 'production' ? this.config.publishRoot : this.config.previewRoot;
    return path.join(targetRoot, 'projects', projectId, 'deployments', deploymentId);
  }

  private async materializeRevisionFiles(
    projectId: string,
    revisionId: string,
    payload: {
      manifest: Record<string, unknown>;
      siteContent: Record<string, unknown>;
    }
  ) {
    const revisionRoot = path.join(this.runtimeRoot, 'revisions', projectId, revisionId);
    const manifestPath = path.join(revisionRoot, 'porvi.project.mjs');
    const siteContentPath = path.join(revisionRoot, 'site.mjs');

    await mkdir(revisionRoot, { recursive: true });
    await writeFile(manifestPath, toModuleSource(payload.manifest), 'utf8');
    await writeFile(siteContentPath, toModuleSource(payload.siteContent), 'utf8');

    return { revisionRoot, manifestPath, siteContentPath };
  }

  private async runTemplateBuild(input: {
    manifestPath: string;
    siteContentPath: string;
    outDir: string;
  }) {
    return await new Promise<{ exitCode: number; output: string }>((resolve, reject) => {
      const child = spawn('pnpm', ['run', 'build'], {
        cwd: this.templateDir,
        env: {
          ...process.env,
          PORVI_PROJECT_MANIFEST_PATH: input.manifestPath,
          PORVI_SITE_CONTENT_PATH: input.siteContentPath,
          PORVI_BUILD_OUT_DIR: input.outDir,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let output = '';
      child.stdout.on('data', (chunk) => {
        output += chunk.toString();
      });
      child.stderr.on('data', (chunk) => {
        output += chunk.toString();
      });
      child.on('error', reject);
      child.on('close', (code) => {
        resolve({
          exitCode: code ?? 1,
          output,
        });
      });
    });
  }

  private async runFallbackBuild(input: {
    manifest: Record<string, unknown>;
    siteContent: Record<string, unknown>;
    outDir: string;
  }) {
    const title =
      getNestedString(input.manifest, ['seo', 'title']) ??
      getNestedString(input.manifest, ['name']) ??
      'Porvi site';
    const description =
      getNestedString(input.manifest, ['seo', 'description']) ??
      getNestedString(input.siteContent, ['profile', 'bio']) ??
      'Static site artifact generated by Porvi.';
    const heading = getNestedString(input.siteContent, ['profile', 'name']) ?? title;

    await mkdir(input.outDir, { recursive: true });
    await writeFile(
      path.join(input.outDir, 'index.html'),
      `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        font-family: system-ui, sans-serif;
        background: #f4efe8;
        color: #1f1a16;
      }
      main {
        max-width: 48rem;
        margin: 0 auto;
        padding: 4rem 1.5rem;
      }
      .eyebrow {
        font-size: 0.875rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #8a5d3b;
      }
      h1 {
        margin: 0.5rem 0 1rem;
        font-size: clamp(2.25rem, 8vw, 4rem);
      }
      p {
        line-height: 1.6;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="eyebrow">Built by Porvi</div>
      <h1>${escapeHtml(heading)}</h1>
      <p>${escapeHtml(description)}</p>
    </main>
  </body>
</html>
`,
      'utf8'
    );

    return {
      exitCode: 0,
      output:
        '[build] No in-repo renderer template is available.\n[build] Generated fallback static artifact from the structured project contract.\n',
    };
  }
}

function toModuleSource(value: Record<string, unknown>) {
  return `export default ${JSON.stringify(value, null, 2)};\n`;
}

function getNestedString(value: Record<string, unknown>, pathSegments: string[]) {
  let current: unknown = value;
  for (const segment of pathSegments) {
    if (!current || typeof current !== 'object' || !(segment in current)) {
      return null;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === 'string' && current.length > 0 ? current : null;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
