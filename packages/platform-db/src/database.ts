import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import Database from 'better-sqlite3';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePostgres } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { postgresBootstrapSql, sqliteBootstrapSql } from './bootstrap.js';
import { postgresSchema } from './schema/postgres.js';
import { sqliteSchema } from './schema/sqlite.js';

export type DatabaseDialect = 'sqlite' | 'postgres';

export interface DatabaseConfig {
  dialect: DatabaseDialect;
  sqlitePath: string;
  postgresUrl?: string;
}

export interface DatabaseContext {
  dialect: DatabaseDialect;
  db: any;
  schema: any;
  raw: Database.Database | Pool;
}

export async function createDatabaseContext(config: DatabaseConfig): Promise<DatabaseContext> {
  if (config.dialect === 'sqlite') {
    await mkdir(path.dirname(config.sqlitePath), { recursive: true });
    const raw = new Database(config.sqlitePath);
    raw.pragma('journal_mode = WAL');
    raw.pragma('synchronous = NORMAL');
    raw.pragma('busy_timeout = 5000');
    raw.exec(sqliteBootstrapSql);

    return {
      dialect: 'sqlite',
      db: drizzleSqlite(raw, { schema: sqliteSchema }),
      schema: sqliteSchema,
      raw,
    };
  }

  if (!config.postgresUrl) {
    throw new Error('Missing postgresUrl for postgres dialect.');
  }

  const raw = new Pool({ connectionString: config.postgresUrl });
  await raw.query(postgresBootstrapSql);

  return {
    dialect: 'postgres',
    db: drizzlePostgres(raw, { schema: postgresSchema }),
    schema: postgresSchema,
    raw,
  };
}

export async function closeDatabaseContext(context: DatabaseContext) {
  if (context.dialect === 'sqlite') {
    (context.raw as Database.Database).close();
    return;
  }

  await (context.raw as Pool).end();
}
