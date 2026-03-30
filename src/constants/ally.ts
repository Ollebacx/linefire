import type { Size } from '../types';
import {
  PLAYER_ALLY_PROJECTILE_SPEED,
  PLAYER_INITIAL_DAMAGE,
  PLAYER_INITIAL_RANGE,
  GUN_GUY_CLIP_SIZE,
  GUN_GUY_SHOT_INTERVAL,
  GUN_GUY_RELOAD_TIME,
} from './player';

// ── Shared ally base ──────────────────────────────────────────────────────────
export const ALLY_SIZE: Size              = { width: 24, height: 24 };
export const ALLY_SPEED                   = PLAYER_ALLY_PROJECTILE_SPEED * 0.9; // Inherits from player projectile speed constant
export const ALLY_LERP_FACTOR             = 0.15;
export const ALLY_INITIAL_HEALTH          = 1;  // one-hit-kill
export const ALLY_TRAIL_FOLLOW_DISTANCE   = 35;
export const ALLY_PICKUP_HEALTH_RESTORE   = 5;
export const ALLY_SPAWN_INTERVAL          = 30; // seconds between collectibles

export const COLLECTIBLE_ALLY_SIZE: Size  = { width: 24, height: 24 };

// ── Per-type stats ────────────────────────────────────────────────────────────
export const ALLY_GUN_GUY_DAMAGE    = PLAYER_INITIAL_DAMAGE;
export const ALLY_GUN_GUY_RANGE     = PLAYER_INITIAL_RANGE;
export const ALLY_GUN_GUY_COOLDOWN  = GUN_GUY_SHOT_INTERVAL;

export const ALLY_SHOTGUN_DAMAGE          = 7;
export const ALLY_SHOTGUN_COOLDOWN        = 30;
export const ALLY_SHOTGUN_RANGE           = 420;
export const ALLY_SHOTGUN_PROJECTILE_COUNT = 3;
export const ALLY_SHOTGUN_SPREAD_ANGLE    = 35;

export const ALLY_SNIPER_DAMAGE                   = 35;
export const ALLY_SNIPER_COOLDOWN                 = 70;
export const ALLY_SNIPER_RANGE                    = 1200;
export const ALLY_SNIPER_PROJECTILE_SPEED_MULTIPLIER = 2.0;

export const ALLY_MINIGUNNER_DAMAGE   = 6;
export const ALLY_MINIGUNNER_COOLDOWN = 8;
export const ALLY_MINIGUNNER_RANGE    = 480;

export const ALLY_RPG_SOLDIER_DAMAGE                   = 40;
export const ALLY_RPG_SOLDIER_COOLDOWN                 = 160;
export const ALLY_RPG_SOLDIER_RANGE                    = 500;
export const ALLY_RPG_SOLDIER_PROJECTILE_SPEED_MULTIPLIER = 1.8;

export const ALLY_FLAMER_DAMAGE          = 4;
export const ALLY_FLAMER_COOLDOWN        = 30;
export const ALLY_FLAMER_RANGE           = ALLY_MINIGUNNER_RANGE;
export const ALLY_FLAMER_PROJECTILE_COUNT = 4;
export const ALLY_FLAMER_SPREAD_ANGLE    = 0;

export const ALLY_RIFLEMAN_DAMAGE                    = 9;
export const ALLY_RIFLEMAN_COOLDOWN                  = 20;
export const ALLY_RIFLEMAN_RANGE                     = 520;
export const ALLY_RIFLEMAN_PROJECTILE_SPEED_MULTIPLIER = 1.3;
