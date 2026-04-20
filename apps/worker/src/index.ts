import { existsSync } from 'node:fs';
import path from 'node:path';

import { closeDatabaseContext, createDatabaseContext } from '@porvi/platform-db';
import { EmbeddedJobRunner } from '@porvi/platform-core';

const dialect = process.env.PLATFORM_DATABASE_DIALECT === 'postgres' ? 'postgres' : 'sqlite';
const sqlitePath = process.env.PLATFORM_SQLITE_PATH ?? `${process.cwd()}/.porvi/platform.sqlite`;
const postgresUrl = process.env.PLATFORM_DATABASE_URL;
const repoRoot = process.env.PLATFORM_REPO_ROOT ?? resolveRepoRoot(process.cwd());

const db = await createDatabaseContext({
  dialect,
  sqlitePath,
  postgresUrl,
});

const runner = new EmbeddedJobRunner(db, {
  publicApiUrl: process.env.PLATFORM_PUBLIC_API_URL ?? 'http://localhost:3000',
  publicAppUrl: process.env.PLATFORM_PUBLIC_APP_URL ?? 'http://localhost:5173',
  repoRoot,
  publishRoot: process.env.PLATFORM_PUBLISH_ROOT ?? `${process.cwd()}/.porvi/published`,
  previewRoot: process.env.PLATFORM_PREVIEW_ROOT ?? `${process.cwd()}/.porvi/previews`,
  nginxMapPath: process.env.PLATFORM_NGINX_MAP_PATH,
});

runner.start();
console.log(`Porvi worker started in ${dialect} mode.`);

process.on('SIGINT', async () => {
  runner.stop();
  await closeDatabaseContext(db);
  process.exit(0);
});

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
