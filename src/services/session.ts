/**
 * session — anonymous player identity persisted in localStorage.
 *
 * No login required. Each browser gets a stable UUID that is sent
 * along with score submissions for identity tracking.
 */
import { v4 as uuidv4 } from 'uuid';

const PLAYER_ID_KEY   = 'linefire_player_id';
const PLAYER_NAME_KEY = 'linefire_player_name';

/** Returns the stored player UUID, creating one on first call. */
export function getOrCreatePlayerId(): string {
  const stored = localStorage.getItem(PLAYER_ID_KEY);
  if (stored) return stored;
  const id = uuidv4();
  localStorage.setItem(PLAYER_ID_KEY, id);
  return id;
}

/** Returns the player's display name (defaults to 'Anonymous'). */
export function getPlayerName(): string {
  return localStorage.getItem(PLAYER_NAME_KEY) ?? 'Anonymous';
}

/** Persists a display name (max 32 chars). */
export function setPlayerName(name: string): void {
  const trimmed = name.trim().slice(0, 32) || 'Anonymous';
  localStorage.setItem(PLAYER_NAME_KEY, trimmed);
}
