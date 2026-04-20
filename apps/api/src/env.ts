import { existsSync } from 'node:fs';
import path from 'node:path';

export interface ApiEnv {
  port: number;
  databaseDialect: 'sqlite' | 'postgres';
  sqlitePath: string;
  postgresUrl?: string;
  providerConfigDir?: string;
  repoRoot?: string;
  publicApiUrl: string;
  publicAppUrl: string;
  publicWebUrl: string;
  sessionCookieName: string;
  sessionTtlSeconds: number;
  publishRoot: string;
  previewRoot: string;
  nginxMapPath?: string;
}

export function readApiEnv(): ApiEnv {
  const rootDir = process.cwd();
  const repoRoot = resolveRepoRoot(rootDir);
  const publicApiUrl = process.env.PLATFORM_PUBLIC_API_URL ?? 'http://localhost:3000';
  const resolveRepoPath = (value: string) =>
    path.isAbsolute(value) ? value : path.join(repoRoot, value);
  return {
    port: Number(process.env.PLATFORM_PORT ?? 3000),
    databaseDialect: process.env.PLATFORM_DATABASE_DIALECT === 'postgres' ? 'postgres' : 'sqlite',
    sqlitePath: resolveRepoPath(
      process.env.PLATFORM_SQLITE_PATH ?? path.join('.porvi', 'platform.sqlite')
    ),
    postgresUrl: process.env.PLATFORM_DATABASE_URL,
    providerConfigDir: process.env.PLATFORM_PROVIDER_CONFIG_DIR
      ? resolveRepoPath(process.env.PLATFORM_PROVIDER_CONFIG_DIR)
      : undefined,
    repoRoot: process.env.PLATFORM_REPO_ROOT ?? repoRoot,
    publicApiUrl,
    publicAppUrl: process.env.PLATFORM_PUBLIC_APP_URL ?? 'http://localhost:5173',
    publicWebUrl: process.env.PLATFORM_PUBLIC_WEB_URL ?? 'http://localhost:4321',
    sessionCookieName:
      process.env.PLATFORM_SESSION_COOKIE_NAME ??
      (publicApiUrl.startsWith('https://') ? '__Host-porvi_session' : 'porvi_session'),
    sessionTtlSeconds: Number(process.env.PLATFORM_SESSION_TTL_SECONDS ?? 604800),
    publishRoot: resolveRepoPath(
      process.env.PLATFORM_PUBLISH_ROOT ?? path.join('.porvi', 'published')
    ),
    previewRoot: resolveRepoPath(
      process.env.PLATFORM_PREVIEW_ROOT ?? path.join('.porvi', 'previews')
    ),
    nginxMapPath: process.env.PLATFORM_NGINX_MAP_PATH
      ? resolveRepoPath(process.env.PLATFORM_NGINX_MAP_PATH)
      : undefined,
  };
}

function resolveRepoRoot(startDir: string) {
  let currentDir = startDir;

  while (true) {
    if (
      existsSync(path.join(currentDir, 'pnpm-workspace.yaml')) &&
      existsSync(path.join(currentDir, 'package.json'))
    ) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return startDir;
    }

    currentDir = parentDir;
  }
}
