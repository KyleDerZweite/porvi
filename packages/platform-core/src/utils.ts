import { createHash, randomUUID } from 'node:crypto';

export function nowIso() {
  return new Date().toISOString();
}

export function generateId(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, '')}`;
}

export function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function encodeJson(value: unknown) {
  return JSON.stringify(value);
}

export function decodeJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  return JSON.parse(value) as T;
}
