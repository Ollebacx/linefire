import type { Size } from '../types';

// ── Player base stats ─────────────────────────────────────────────────────────
export const PLAYER_INITIAL_HEALTH              = 30;
export const PLAYER_SPEED                       = 3.8;
export const PLAYER_SIZE: Size                  = { width: 28, height: 28 };
export const PLAYER_INITIAL_GOLD                = 0;
export const PLAYER_INITIAL_DAMAGE              = 10;
export const PLAYER_INITIAL_RANGE               = 480;
export const PLAYER_INITIAL_GOLD_MAGNET_RANGE   = 40;
export const PLAYER_INITIAL_SQUAD_SPACING_MULTIPLIER = 1.0;
export const PLAYER_INITIAL_SHOOT_COOLDOWN      = 100;
export const PATH_HISTORY_LENGTH                = 30;
export const PLAYER_HIT_FLASH_DURATION_TICKS    = 10;

// ── Gun Guy burst-fire ────────────────────────────────────────────────────────
export const GUN_GUY_CLIP_SIZE   = 6;
export const GUN_GUY_SHOT_INTERVAL = 10;
export const GUN_GUY_RELOAD_TIME = 120;

// ── Projectile base ───────────────────────────────────────────────────────────
export const PROJECTILE_SIZE: Size       = { width: 6,  height: 6  };
export const RPG_PROJECTILE_SIZE: Size   = { width: 12, height: 3  };
export const FLAMER_PROJECTILE_SIZE: Size = { width: 16, height: 16 };
export const AIRSTRIKE_PROJECTILE_SIZE: Size = { width: 10, height: 22 };

export const PLAYER_ALLY_PROJECTILE_SPEED   = 4;
export const ENEMY_PROJECTILE_SPEED         = 2.8;
export const FLAMER_PROJECTILE_SPEED        = PLAYER_ALLY_PROJECTILE_SPEED * 0.5;
export const FLAMER_PROJECTILE_MAX_TRAVEL_DISTANCE = 120;
export const AIRSTRIKE_MISSILE_SPEED        = 7;

// ── Gold / collectibles ───────────────────────────────────────────────────────
export const GOLD_PILE_SIZE: Size        = { width: 12, height: 12 };
export const GOLD_VALUE                  = 10;
export const GOLD_MAGNET_PULL_SPEED      = 5;   // px/tick toward player when within magnet range

// ── Shield zone ───────────────────────────────────────────────────────────────
export const SHIELD_ZONE_DEFAULT_DURATION     = 180;  // ticks
export const SHIELD_ZONE_DEFAULT_RADIUS       = 80;   // px
export const SHIELD_ZONE_ABILITY_BASE_COOLDOWN = 600; // ticks (~10s)
export const SHIELD_ZONE_OPACITY_PULSE_MIN    = 0.15;
export const SHIELD_ZONE_OPACITY_PULSE_MAX    = 0.40;
export const SHIELD_ZONE_OPACITY_PULSE_SPEED  = 0.005;

// ── Chain lightning ───────────────────────────────────────────────────────────
export const CHAIN_LIGHTNING_BASE_CHANCE            = 0;
export const CHAIN_LIGHTNING_BASE_TARGETS           = 1;
export const CHAIN_LIGHTNING_BASE_RANGE             = 150;
export const CHAIN_LIGHTNING_BASE_DAMAGE_MULTIPLIER = 0.5;
export const CHAIN_LIGHTNING_VISUAL_DURATION        = 8;

// ── Airstrike ─────────────────────────────────────────────────────────────────
export const COMBO_WINDOW_DURATION_TICKS    = 180;
export const AIRSTRIKE_COMBO_THRESHOLD      = 10;
export const AIRSTRIKE_MISSILE_COUNT        = 10;
export const AIRSTRIKE_MISSILE_INTERVAL_TICKS = 8;
export const AIRSTRIKE_MISSILE_DAMAGE       = 50;
export const AIRSTRIKE_MISSILE_AOE_RADIUS   = 80;
export const AIRSTRIKE_IMPACT_SHAKE_INTENSITY = 3;
export const AIRSTRIKE_IMPACT_SHAKE_DURATION  = 10;
