/**
 * SQLite database using @libsql/client (pure-JS, no native compilation).
 *
 * Tables:
 *   runs         — each completed run
 *   leaderboard  — top scores
 */
import { createClient, type Client } from '@libsql/client';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = path.resolve(__dirname, '../../../data');
const DB_URL    = `file:${DATA_DIR}/linefire.db`;

let _db: Client | null = null;

export function getDb(): Client {
  if (!_db) throw new Error('DB not initialized. Call initDb() first.');
  return _db;
}

export async function initDb(): Promise<void> {
  mkdirSync(DATA_DIR, { recursive: true });

  _db = createClient({ url: DB_URL });

  await _db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS runs (
      id          TEXT PRIMARY KEY,
      player_name TEXT NOT NULL DEFAULT 'Anonymous',
      round       INTEGER NOT NULL,
      kills       INTEGER NOT NULL,
      gold        INTEGER NOT NULL,
      combo       INTEGER NOT NULL,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS leaderboard (
      id          TEXT PRIMARY KEY,
      player_id   TEXT,
      player_name TEXT NOT NULL,
      score       INTEGER NOT NULL,
      round       INTEGER NOT NULL,
      kills       INTEGER NOT NULL,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_lb_score ON leaderboard (score DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_lb_player_id ON leaderboard (player_id) WHERE player_id IS NOT NULL;
  `);

  // Migration: add player_id column to existing DBs that predate this change
  try {
    await _db.execute('ALTER TABLE leaderboard ADD COLUMN player_id TEXT');
    await _db.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_lb_player_id ON leaderboard (player_id) WHERE player_id IS NOT NULL');
  } catch { /* column already exists — ok */ }

  console.log('Database initialized at', DB_URL);
}
