/**
 * GET  /leaderboard        → top 20 entries
 * POST /leaderboard        → submit a score
 *
 * Body for POST:
 *   { playerName: string; score: number; round: number; kills: number; runId: string }
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database.js';

export const leaderboardRoute = new Hono();

const SubmitSchema = z.object({
  playerName: z.string().min(1).max(32).default('Anonymous'),
  score:      z.number().int().min(0),
  round:      z.number().int().min(1),
  kills:      z.number().int().min(0),
  runId:      z.string().uuid().optional(),
});

// ── GET /leaderboard ──────────────────────────────────────────────────────────
leaderboardRoute.get('/', async c => {
  const period = c.req.query('period'); // 'weekly' | undefined
  const db = getDb();
  const weekWhere = period === 'weekly'
    ? 'WHERE created_at >= unixepoch() - 7 * 24 * 3600'
    : '';
  const result = await db.execute(`
    SELECT id, player_name, score, round, kills, created_at
    FROM leaderboard
    ${weekWhere}
    ORDER BY score DESC
    LIMIT 20
  `);
  return c.json({ entries: result.rows });
});

// ── POST /leaderboard ─────────────────────────────────────────────────────────
leaderboardRoute.post('/', async c => {
  const parsed = SubmitSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const { playerName, score, round, kills } = parsed.data;
  const id = uuidv4();
  const db = getDb();

  await db.execute({
    sql: 'INSERT INTO leaderboard (id, player_name, score, round, kills) VALUES (?, ?, ?, ?, ?)',
    args: [id, playerName, score, round, kills],
  });

  // Keep only the top 100 entries
  await db.execute(`
    DELETE FROM leaderboard WHERE id NOT IN (
      SELECT id FROM leaderboard ORDER BY score DESC LIMIT 100
    )
  `);

  return c.json({ id }, 201);
});
