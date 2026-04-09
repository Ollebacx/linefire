-- Linefire — Supabase schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

CREATE TABLE IF NOT EXISTS runs (
  id          TEXT PRIMARY KEY,
  player_name TEXT NOT NULL DEFAULT 'Anonymous',
  round       INTEGER NOT NULL,
  kills       INTEGER NOT NULL,
  gold        INTEGER NOT NULL,
  combo       INTEGER NOT NULL,
  created_at  BIGINT NOT NULL DEFAULT extract(epoch from now())::BIGINT
);

CREATE TABLE IF NOT EXISTS leaderboard (
  id          TEXT PRIMARY KEY,
  player_id   TEXT UNIQUE,
  player_name TEXT NOT NULL,
  score       INTEGER NOT NULL,
  round       INTEGER NOT NULL,
  kills       INTEGER NOT NULL,
  created_at  BIGINT NOT NULL DEFAULT extract(epoch from now())::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_lb_score ON leaderboard (score DESC);

-- Disable Row Level Security (API uses service role key, RLS not needed)
ALTER TABLE runs        DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard DISABLE ROW LEVEL SECURITY;
