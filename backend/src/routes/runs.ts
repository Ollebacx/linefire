/**
 * GET  /runs              → last 50 runs
 * POST /runs              → record a completed run
 *
 * Body for POST:
 *   { playerName?: string; round: number; kills: number; gold: number; combo: number }
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database.js';

export const runsRoute = new Hono();

const RunSchema = z.object({
  playerName: z.string().min(1).max(32).default('Anonymous'),
  round:  z.number().int().min(1),
  kills:  z.number().int().min(0),
  gold:   z.number().int().min(0),
  combo:  z.number().int().min(0),
});

// ── GET /runs ─────────────────────────────────────────────────────────────────
runsRoute.get('/', async c => {
  const db = getDb();
  const result = await db.execute(`
    SELECT id, player_name, round, kills, gold, combo, created_at
    FROM runs
    ORDER BY created_at DESC
    LIMIT 50
  `);
  return c.json({ runs: result.rows });
});

// ── POST /runs ─────────────────────────────────────────────────────────────────
runsRoute.post('/', async c => {
  const parsed = RunSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const { playerName, round, kills, gold, combo } = parsed.data;
  const id = uuidv4();
  const db = getDb();

  await db.execute({
    sql: 'INSERT INTO runs (id, player_name, round, kills, gold, combo) VALUES (?, ?, ?, ?, ?, ?)',
    args: [id, playerName, round, kills, gold, combo],
  });

  return c.json({ id }, 201);
});
