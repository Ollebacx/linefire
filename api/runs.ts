import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const getDb = () =>
  createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const RunSchema = z.object({
  playerName: z.string().min(1).max(32).default('Anonymous'),
  round:  z.number().int().min(1),
  kills:  z.number().int().min(0),
  gold:   z.number().int().min(0),
  combo:  z.number().int().min(0),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const db = getDb();

  // ── GET /api/runs ─────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await db
      .from('runs')
      .select('id, player_name, round, kills, gold, combo, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ runs: data ?? [] });
  }

  // ── POST /api/runs ────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const parsed = RunSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { playerName, round, kills, gold, combo } = parsed.data;
    const id = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    const { error } = await db.from('runs').insert({
      id, player_name: playerName, round, kills, gold, combo, created_at: now,
    });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ id });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
