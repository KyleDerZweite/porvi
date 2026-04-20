import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { authProviderConfigSchema, type AuthProviderConfig } from '@porvi/platform-contracts';
import { PlatformRepository } from '@porvi/platform-core';

export class ProviderStore {
  constructor(
    private readonly repo: PlatformRepository,
    private readonly configDir?: string
  ) {}

  async seedFromFilesystem() {
    if (!this.configDir) {
      return;
    }

    const entries = await readdir(this.configDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) {
        continue;
      }

      const raw = await readFile(path.join(this.configDir, entry.name), 'utf8');
      const parsed = authProviderConfigSchema.parse(JSON.parse(raw));
      await this.repo.upsertProviderConfig(parsed);
    }
  }

  async listEnabled(): Promise<AuthProviderConfig[]> {
    return this.repo.listEnabledProviderConfigs();
  }

  async getRequired(providerKey: string): Promise<AuthProviderConfig> {
    const row = await this.repo.getProviderConfigByKey(providerKey);
    if (!row) {
      throw new Error(`Unknown auth provider: ${providerKey}`);
    }

    return authProviderConfigSchema.parse(JSON.parse(row.configJson));
  }
}
