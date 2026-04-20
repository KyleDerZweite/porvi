import { afterEach, describe, expect, it } from 'vitest';

import { readApiEnv } from './env.js';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('readApiEnv', () => {
  it('uses a localhost-safe session cookie name for insecure local development', () => {
    delete process.env.PLATFORM_SESSION_COOKIE_NAME;
    process.env.PLATFORM_PUBLIC_API_URL = 'http://localhost:3000';

    expect(readApiEnv().sessionCookieName).toBe('porvi_session');
  });

  it('uses a __Host- cookie name by default for https deployments', () => {
    delete process.env.PLATFORM_SESSION_COOKIE_NAME;
    process.env.PLATFORM_PUBLIC_API_URL = 'https://api.example.com';

    expect(readApiEnv().sessionCookieName).toBe('__Host-porvi_session');
  });

  it('resolves relative runtime paths against the repo root', () => {
    process.env.PLATFORM_PROVIDER_CONFIG_DIR = './configs/providers';
    process.env.PLATFORM_SQLITE_PATH = '.porvi/platform.sqlite';

    const env = readApiEnv();
    expect(env.providerConfigDir).toMatch(/porvi\/configs\/providers$/);
    expect(env.sqlitePath).toMatch(/porvi\/\.porvi\/platform\.sqlite$/);
  });
});
