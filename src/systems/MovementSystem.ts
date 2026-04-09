/**
 * MovementSystem
 * Pure function — takes game state slice + inputs, returns updated positions.
 * No React, no side effects.
 */
import { v4 as uuidv4 } from 'uuid';
import type { Player, Ally, Position, Size } from '../types';
import { normalizeVector, getCenter, distanceBetweenPoints, prependCapped } from '../utils/geometry';
import {
  PLAYER_WORLD_EDGE_MARGIN,
  CAMERA_LERP_FACTOR,
  WORLD_AREA,
  PATH_HISTORY_LENGTH,
  ALLY_LERP_FACTOR,
  ALLY_TRAIL_FOLLOW_DISTANCE,
} from '../constants';

// ─── Input snapshot ───────────────────────────────────────────────────────────
export interface InputSnapshot {
  keysPressed: Record<string, boolean>;
  mousePosition: Position | null;
  joystickDirection: Position;
  isTouchDevice: boolean;
  controlScheme: 'keyboard' | 'mouse' | 'wasd_mouse';
}

// ─── Player movement ──────────────────────────────────────────────────────────
export function applyPlayerMovement(
  player: Player,
  input: InputSnapshot,
  gameArea: Size,
  camera: Position,
): Player {
  const p = { ...player, pathHistory: [...player.pathHistory] };

  let dx = 0;
  let dy = 0;

  if (input.isTouchDevice && (input.joystickDirection.x !== 0 || input.joystickDirection.y !== 0)) {
    dx = input.joystickDirection.x * p.speed;
    dy = input.joystickDirection.y * p.speed;
  } else if (input.controlScheme === 'mouse' && input.mousePosition) {
    // ── Mouse scheme: move toward cursor — UNLESS a WASD/arrow key is held ──
    const keys = input.keysPressed;
    const anyKeyHeld = keys['w'] || keys['W'] || keys['s'] || keys['S'] ||
                       keys['a'] || keys['A'] || keys['d'] || keys['D'] ||
                       keys['ArrowUp'] || keys['ArrowDown'] || keys['ArrowLeft'] || keys['ArrowRight'];
    if (!anyKeyHeld) {
      const playerCenter = getCenter(p);
      const worldX = input.mousePosition.x + camera.x;
      const worldY = input.mousePosition.y + camera.y;
      const vecX = worldX - playerCenter.x;
      const vecY = worldY - playerCenter.y;
      const dist = Math.sqrt(vecX ** 2 + vecY ** 2);
      if (dist > p.width * 0.5) {
        dx = (vecX / dist) * p.speed;
        dy = (vecY / dist) * p.speed;
      }
    }
  } else {
    // ── Keyboard mode, OR mouse mode with cursor off-canvas ──
    // Falling back to WASD/arrow keys prevents the player from freezing
    // when controlScheme='mouse' is restored from localStorage but the
    // cursor hasn't yet entered the canvas.
    const keys = input.keysPressed;
    let kx = 0, ky = 0;
    if (keys['w'] || keys['W'] || keys['ArrowUp'])    ky -= p.speed;
    if (keys['s'] || keys['S'] || keys['ArrowDown'])  ky += p.speed;
    if (keys['a'] || keys['A'] || keys['ArrowLeft'])  kx -= p.speed;
    if (keys['d'] || keys['D'] || keys['ArrowRight']) kx += p.speed;

    if (kx !== 0 || ky !== 0) {
      if (kx !== 0 && ky !== 0) {
        const len = Math.sqrt(kx ** 2 + ky ** 2);
        dx = (kx / len) * p.speed;
        dy = (ky / len) * p.speed;
      } else {
        dx = kx;
        dy = ky;
      }
    }
  }

  if (dx !== 0 || dy !== 0) {
    p.x = Math.max(
      PLAYER_WORLD_EDGE_MARGIN,
      Math.min(p.x + dx, WORLD_AREA.width - p.width - PLAYER_WORLD_EDGE_MARGIN),
    );
    p.y = Math.max(
      PLAYER_WORLD_EDGE_MARGIN,
      Math.min(p.y + dy, WORLD_AREA.height - p.height - PLAYER_WORLD_EDGE_MARGIN),
    );
  }

  p.velocity = { x: dx, y: dy };
  prependCapped(p.pathHistory, getCenter(p), PATH_HISTORY_LENGTH);
  return p;
}

// ─── Camera lerp ─────────────────────────────────────────────────────────────
export function updateCamera(
  camera: Position,
  player: Player,
  gameArea: Size,
): Position {
  const idealX = player.x + player.width / 2 - gameArea.width / 2;
  const idealY = player.y + player.height / 2 - gameArea.height / 2;
  const newX = camera.x + (idealX - camera.x) * CAMERA_LERP_FACTOR;
  const newY = camera.y + (idealY - camera.y) * CAMERA_LERP_FACTOR;
  return {
    x: Math.max(0, Math.min(newX, WORLD_AREA.width - gameArea.width)),
    y: Math.max(0, Math.min(newY, WORLD_AREA.height - gameArea.height)),
  };
}

// ─── Ally trail following ─────────────────────────────────────────────────────
export function updateAllyMovement(
  ally: Ally,
  leaderEntities: Array<Player | Ally>,
  squadSpacingMultiplier: number,
): Ally {
  const a = { ...ally, pathHistory: [...(ally.pathHistory ?? [])] };
  const leader = leaderEntities.find(l => l.id === a.leaderId);
  if (!leader) return a;

  const leaderPath = leader.pathHistory;
  const followDist = ALLY_TRAIL_FOLLOW_DISTANCE * squadSpacingMultiplier;
  let targetCenter = getCenter(leader);

  if (leaderPath && leaderPath.length > 1) {
    let accumulated = 0;
    let found = false;
    for (let i = 0; i < leaderPath.length - 1; i++) {
      const segDist = distanceBetweenPoints(leaderPath[i], leaderPath[i + 1]);
      if (segDist === 0) continue;
      if (accumulated + segDist >= followDist) {
        const ratio = (followDist - accumulated) / segDist;
        targetCenter = {
          x: leaderPath[i].x + (leaderPath[i + 1].x - leaderPath[i].x) * ratio,
          y: leaderPath[i].y + (leaderPath[i + 1].y - leaderPath[i].y) * ratio,
        };
        found = true;
        break;
      }
      accumulated += segDist;
    }
    if (!found && leaderPath.length > 0) targetCenter = leaderPath[leaderPath.length - 1];
  }

  const dist = distanceBetweenPoints(getCenter(a), targetCenter);
  if (dist > 0.5) {
    const dX = (targetCenter.x - a.width / 2 - a.x) * ALLY_LERP_FACTOR;
    const dY = (targetCenter.y - a.height / 2 - a.y) * ALLY_LERP_FACTOR;
    a.x += dX;
    a.y += dY;
  }

  // Prevent overlap with leader
  const leaderCenter = getCenter(leader);
  const allyCenter   = getCenter(a);
  const sep = distanceBetweenPoints(allyCenter, leaderCenter);
  const minSep = (leader.width / 2) + (a.width / 2) + 5;
  if (sep < minSep && sep > 0.01) {
    const vx = (allyCenter.x - leaderCenter.x) / sep * minSep;
    const vy = (allyCenter.y - leaderCenter.y) / sep * minSep;
    a.x = leaderCenter.x + vx - a.width / 2;
    a.y = leaderCenter.y + vy - a.height / 2;
  }

  a.x = Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(a.x, WORLD_AREA.width - a.width - PLAYER_WORLD_EDGE_MARGIN));
  a.y = Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(a.y, WORLD_AREA.height - a.height - PLAYER_WORLD_EDGE_MARGIN));
  prependCapped(a.pathHistory, getCenter(a), PATH_HISTORY_LENGTH);
  return a;
}

// ─── Chain leader IDs in squad ────────────────────────────────────────────────
export function chainAllyLeaders(allies: Ally[], playerId: string): Ally[] {
  if (allies.length === 0) return allies;
  const out = allies.map(a => ({ ...a }));
  out[0].leaderId = playerId;
  for (let i = 1; i < out.length; i++) out[i].leaderId = out[i - 1].id;
  return out;
}
