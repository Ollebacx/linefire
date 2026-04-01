/**
 * Linefire Backend — Hono server
 *
 * Routes:
 *   GET  /leaderboard        → top 20 scores
 *   POST /leaderboard        → submit score
 *   GET  /runs               → recent run history
 *   POST /runs               → record a run
 */
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { leaderboardRoute } from './routes/leaderboard.js';
import { runsRoute } from './routes/runs.js';
import { initDb } from './db/database.js';

// ── Bootstrap ────────────────────────────────────────────────────────────────
await initDb();

const app = new Hono();

app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

// ── Health check
app.get('/health', c => c.json({ status: 'ok', ts: Date.now() }));

// ── Feature routes
app.route('/leaderboard', leaderboardRoute);
app.route('/runs',        runsRoute);

// ── 404 fallback
app.notFound(c => c.json({ error: 'Not Found' }, 404));

// ── Server start
const PORT = parseInt(process.env.PORT ?? '4000', 10);
serve({ fetch: app.fetch, port: PORT }, info => {
  console.log(`Linefire backend running on http://localhost:${info.port}`);
});
