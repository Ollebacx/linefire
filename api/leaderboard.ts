import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const getDb = () =>
  createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const SubmitSchema = z.object({
  playerName: z.string().min(1).max(32).default('Anonymous'),
  score:      z.number().int().min(0),
  round:      z.number().int().min(1),
  kills:      z.number().int().min(0),
  playerId:   z.string().uuid().optional(),
  runId:      z.string().uuid().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const db = getDb();

  // ── GET /api/leaderboard ──────────────────────────────────────────────────
  if (req.method === 'GET') {
    const period = req.query.period as string | undefined;

    let query = db
      .from('leaderboard')
      .select('id, player_name, score, round, kills, created_at')
      .order('score', { ascending: false })
      .limit(20);

    if (period === 'weekly') {
      const weekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 3600;
      query = query.gte('created_at', weekAgo);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ entries: data ?? [] });
  }

  // ── POST /api/leaderboard ─────────────────────────────────────────────────
  if (req.method === 'POST') {
    const parsed = SubmitSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { playerName, score, round, kills, playerId } = parsed.data;
    const now = Math.floor(Date.now() / 1000);

    if (playerId) {
      const { data: existing } = await db
        .from('leaderboard')
        .select('id, score')
        .eq('player_id', playerId)
        .maybeSingle();

      if (existing) {
        if (score > (existing.score as number)) {
          await db.from('leaderboard').update({
            player_name: playerName, score, round, kills, created_at: now,
          }).eq('player_id', playerId);
        }
        return res.status(201).json({ id: existing.id });
      }

      const id = uuidv4();
      await db.from('leaderboard').insert({
        id, player_id: playerId, player_name: playerName, score, round, kills, created_at: now,
      });
      return res.status(201).json({ id });
    }

    // Anonymous submission
    const id = uuidv4();
    await db.from('leaderboard').insert({
      id, player_name: playerName, score, round, kills, created_at: now,
    });
    return res.status(201).json({ id });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
