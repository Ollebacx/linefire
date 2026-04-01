/// <reference types="vite/client" />
/**
 * apiClient — typed HTTP client for the Linefire backend.
 *
 * Dev:  requests hit /api/* — Vite proxy forwards to localhost:4000
 * Prod: requests hit VITE_API_URL (e.g. https://api.linefire.io)
 */

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  id: string;
  player_name: string;
  score: number;
  round: number;
  kills: number;
  created_at: number;
}

export interface RunEntry {
  id: string;
  player_name: string;
  round: number;
  kills: number;
  gold: number;
  combo: number;
  created_at: number;
}

// ── Low-level helpers ──────────────────────────────────────────────────────────

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ── API calls ──────────────────────────────────────────────────────────────────

export function submitScore(payload: {
  playerName: string;
  score: number;
  round: number;
  kills: number;
  runId?: string;
}): Promise<{ id: string }> {
  return post('/leaderboard', payload);
}

export function recordRun(payload: {
  playerName: string;
  round: number;
  kills: number;
  gold: number;
  combo: number;
}): Promise<{ id: string }> {
  return post('/runs', payload);
}

export async function fetchLeaderboard(period: 'all' | 'weekly' = 'all'): Promise<LeaderboardEntry[]> {
  const qs = period === 'weekly' ? '?period=weekly' : '';
  const data = await get<{ entries: LeaderboardEntry[] }>(`/leaderboard${qs}`);
  return data.entries;
}
