import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'astro/config';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig({
  output: 'static',
  server: {
    port: 4321,
  },
  vite: {
    envDir: workspaceRoot,
  },
});
