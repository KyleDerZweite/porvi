import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { DatabaseContext } from '@porvi/platform-db';

import { LocalBuildService } from './build.js';
import { PlatformRepository } from './repository.js';
import { nowIso } from './utils.js';

export interface JobRuntimeConfig {
  publicApiUrl: string;
  publicAppUrl: string;
  repoRoot: string;
  templateDir?: string;
  publishRoot: string;
  previewRoot: string;
  nginxMapPath?: string;
  siteProtocol?: 'http' | 'https';
}

export class EmbeddedJobRunner {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private readonly buildService: LocalBuildService;

  constructor(
    private readonly db: DatabaseContext,
    private readonly config: JobRuntimeConfig
  ) {
    this.buildService = new LocalBuildService({
      repoRoot: config.repoRoot,
      templateDir: config.templateDir,
      publishRoot: config.publishRoot,
      previewRoot: config.previewRoot,
    });
  }

  start(intervalMs = 3000) {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      void this.tick();
    }, intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick() {
    if (this.running) {
      return;
    }

    this.running = true;
    const repo = new PlatformRepository(this.db);

    try {
      const jobs = await repo.listDueJobs(5);
      for (const job of jobs as any[]) {
        await repo.markJobRunning(job.id);
        try {
          await this.executeJob(repo, job.jobType, JSON.parse(job.payloadJson));
          await repo.markJobComplete(job.id);
        } catch (error) {
          await repo.markJobFailed(job.id, error instanceof Error ? error.message : 'Unknown job failure');
        }
      }
    } finally {
      this.running = false;
    }
  }

  private async executeJob(repo: PlatformRepository, jobType: string, payload: Record<string, unknown>) {
    switch (jobType) {
      case 'deployment.preview.build':
      case 'deployment.production.publish':
        await this.handleDeployment(repo, payload);
        return;
      case 'domain.verify':
        await this.handleDomainVerification(repo, payload);
        return;
      case 'ai_request.execute':
        await repo.updateAiRequest(String(payload.aiRequestId), {
          status: 'needs_review',
          summary: 'AI request captured and queued for supervised execution.',
        });
        return;
      default:
        return;
    }
  }

  private async handleDeployment(repo: PlatformRepository, payload: Record<string, unknown>) {
    const deploymentId = String(payload.deploymentId);
    const deployment = await repo.getDeploymentRecord(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found.`);
    }

    const paths = this.buildService.getDeploymentPaths(
      deployment.projectId,
      deployment.id,
      deployment.environment
    );
    const buildLogUrl = this.getBuildLogUrl(deployment.projectId, deployment.id);
    const startedAt = nowIso();

    await repo.updateDeployment(deploymentId, {
      status: 'building',
      buildArtifactPath: paths.artifactPath,
      buildLogUrl,
      startedAt,
    });

    const revision = await repo.getProjectContractByRevision(deployment.projectId, deployment.revisionId);
    if (!revision) {
      await repo.updateDeployment(deploymentId, {
        status: 'failed',
        completedAt: nowIso(),
      });
      throw new Error(`Revision ${deployment.revisionId} not found for deployment ${deploymentId}.`);
    }

    try {
      await this.buildService.buildDeployment({
        deploymentId: deployment.id,
        projectId: deployment.projectId,
        revisionId: deployment.revisionId,
        environment: deployment.environment,
        manifest: revision.manifest,
        siteContent: revision.siteContent,
      });
    } catch (error) {
      await repo.updateDeployment(deploymentId, {
        status: 'failed',
        buildArtifactPath: paths.artifactPath,
        buildLogUrl,
        completedAt: nowIso(),
      });
      throw error;
    }

    const previewUrl =
      deployment.environment === 'preview'
        ? `${this.config.publicAppUrl}/projects/${deployment.projectId}/deployments/${deployment.id}`
        : null;

    let publishedUrl: string | null = null;
    if (deployment.environment === 'production') {
      await this.buildService.promoteProductionDeployment(deployment.projectId, paths.artifactPath);
      await repo.markPublishedDeployment(deployment.projectId, deployment.id);
      await repo.setRevisionStatus(deployment.revisionId, 'published');
      const primaryDomain = await repo.getPrimaryDomain(deployment.projectId, true);
      if (primaryDomain) {
        publishedUrl = `${this.config.siteProtocol ?? 'https'}://${primaryDomain.hostname}`;
      }
      await this.syncIngressMap(repo);
    }

    await repo.updateDeployment(deploymentId, {
      status: 'ready',
      buildArtifactPath: paths.artifactPath,
      buildLogUrl,
      staticUrl: publishedUrl ?? previewUrl,
      previewUrl,
      publishedUrl,
      completedAt: nowIso(),
    });
  }

  private async handleDomainVerification(repo: PlatformRepository, payload: Record<string, unknown>) {
    const domainId = String(payload.domainId);
    const domain = await repo.getDomainRecord(domainId);
    if (!domain) {
      throw new Error(`Domain ${domainId} not found.`);
    }

    await repo.updateDomain(domainId, {
      verificationStatus: 'verified',
      certificateStatus: 'active',
      dnsTarget: 'pangolin-managed',
      verifiedAt: nowIso(),
    });
    await this.syncIngressMap(repo);
  }

  private async syncIngressMap(repo: PlatformRepository) {
    if (!this.config.nginxMapPath) {
      return;
    }

    const domains = await repo.listVerifiedPublishedDomains();
    const lines = ['map $host $site_root {'];
    for (const domain of domains) {
      lines.push(`    ${domain.hostname} ${this.buildService.getCurrentPublishedPath(domain.projectId)};`);
    }
    lines.push('    default "";');
    lines.push('}');

    await mkdir(path.dirname(this.config.nginxMapPath), { recursive: true });
    await writeFile(this.config.nginxMapPath, `${lines.join('\n')}\n`, 'utf8');
  }

  private getBuildLogUrl(projectId: string, deploymentId: string) {
    return `${this.config.publicApiUrl}/v1/projects/${projectId}/deployments/${deploymentId}/log`;
  }
}
