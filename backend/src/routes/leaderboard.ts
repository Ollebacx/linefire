/**
 * GET  /leaderboard        → top 20 entries (one per player)
 * POST /leaderboard        → upsert a score (only kept if it beats the player's personal best)
 *
 * Body for POST:
 *   { playerName: string; score: number; round: number; kills: number; playerId: string }
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
  playerId:   z.string().uuid().optional(),
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

  const { playerName, score, round, kills, playerId } = parsed.data;
  const db = getDb();

  if (playerId) {
    // Upsert: insert new row or update only if new score beats existing personal best
    const newId = uuidv4();
    await db.execute({
      sql: `
        INSERT INTO leaderboard (id, player_id, player_name, score, round, kills)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(player_id) DO UPDATE SET
          player_name = excluded.player_name,
          score       = excluded.score,
          round       = excluded.round,
          kills       = excluded.kills,
          created_at  = unixepoch()
        WHERE excluded.score > leaderboard.score
      `,
      args: [newId, playerId, playerName, score, round, kills],
    });
    // Return the current row id for this player (may be old or new)
    const row = await db.execute({
      sql: 'SELECT id FROM leaderboard WHERE player_id = ?',
      args: [playerId],
    });
    const id = (row.rows[0]?.id as string) ?? newId;
    return c.json({ id }, 201);
  }

  // Fallback for anonymous submissions (no playerId)
  const id = uuidv4();
  await db.execute({
    sql: 'INSERT INTO leaderboard (id, player_name, score, round, kills) VALUES (?, ?, ?, ?, ?)',
    args: [id, playerName, score, round, kills],
  });

  // Keep only the top 100 entries (anonymous ones)
  await db.execute(`
    DELETE FROM leaderboard
    WHERE player_id IS NULL
    AND id NOT IN (
      SELECT id FROM leaderboard WHERE player_id IS NULL ORDER BY score DESC LIMIT 100
    )
  `);

  return c.json({ id }, 201);
});
