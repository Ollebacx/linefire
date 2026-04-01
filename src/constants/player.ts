import type { Size } from '../types';
import { WeaponType } from '../types';

// ── Player base stats ─────────────────────────────────────────────────────────
export const PLAYER_INITIAL_HEALTH              = 30;
export const PLAYER_SPEED                       = 4.2;
export const PLAYER_SIZE: Size                  = { width: 28, height: 28 };
export const PLAYER_INITIAL_GOLD                = 0;
export const PLAYER_INITIAL_DAMAGE              = 10;
export const PLAYER_INITIAL_RANGE               = 480;
export const PLAYER_INITIAL_GOLD_MAGNET_RANGE   = 40;
export const PLAYER_INITIAL_SQUAD_SPACING_MULTIPLIER = 1.0;
export const PLAYER_INITIAL_SHOOT_COOLDOWN      = 100;
export const PATH_HISTORY_LENGTH                = 18;
export const PLAYER_HIT_FLASH_DURATION_TICKS    = 10;

// ── Gun Guy burst-fire ────────────────────────────────────────────────────────
export const GUN_GUY_CLIP_SIZE   = 6;
export const GUN_GUY_SHOT_INTERVAL = 10;
export const GUN_GUY_RELOAD_TIME = 120;

// ── Projectile base ───────────────────────────────────────────────────────────
export const PROJECTILE_SIZE: Size       = { width: 10, height: 10 };
export const RPG_PROJECTILE_SIZE: Size   = { width: 14, height: 4  };
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

// ── Weapon drop system ────────────────────────────────────────────────────────
export interface WeaponConfig {
  label: string;
  shootCooldown: number;
  damage: number;
  clipSize: number;
  reloadDuration: number;
  projectileCount?: number;
  projectileSpreadAngle?: number;
  piercingBonus?: number;
  projectileSpeedBonus?: number;
  color: string;
  rendererColor: number;
}

export const WEAPON_CONFIGS: Record<WeaponType, WeaponConfig> = {
  [WeaponType.PISTOL]:        { label: 'PISTOL',  shootCooldown: 0.45, damage: 18,  clipSize: 12, reloadDuration: 1.2, color: '#00FFCC', rendererColor: 0x00FFCC },
  [WeaponType.SMG]:           { label: 'SMG',     shootCooldown: 0.09, damage: 9,   clipSize: 32, reloadDuration: 1.5, color: '#FF9500', rendererColor: 0xFF9500 },
  [WeaponType.ASSAULT_RIFLE]: { label: 'AR-15',   shootCooldown: 0.20, damage: 25,  clipSize: 22, reloadDuration: 1.8, piercingBonus: 1, color: '#00E5FF', rendererColor: 0x00E5FF },
  [WeaponType.SHOTGUN]:       { label: 'SHOTGUN', shootCooldown: 0.65, damage: 18,  clipSize: 6,  reloadDuration: 2.0, projectileCount: 5, projectileSpreadAngle: 40, color: '#FF2055', rendererColor: 0xFF2055 },
  [WeaponType.LMG]:           { label: 'LMG',     shootCooldown: 0.07, damage: 8,   clipSize: 60, reloadDuration: 3.0, color: '#80FF44', rendererColor: 0x80FF44 },
  [WeaponType.SNIPER]:        { label: 'SNIPER',  shootCooldown: 1.10, damage: 130, clipSize: 4,  reloadDuration: 2.5, piercingBonus: 3, projectileSpeedBonus: 0.8, color: '#CC44FF', rendererColor: 0xCC44FF },
};

export const WEAPON_DROP_SIZE: Size      = { width: 26, height: 26 };
export const WEAPON_DROP_TTL             = 15;
export const WEAPON_HELD_TTL             = 45;
export const WEAPON_DROP_SPAWN_TIMER     = 25;
export const WEAPON_DROP_KILL_CHANCE     = 0.07;
export const WEAPON_DROPPABLE_TYPES: WeaponType[] = [
  WeaponType.SMG, WeaponType.ASSAULT_RIFLE, WeaponType.SHOTGUN,
  WeaponType.LMG, WeaponType.SNIPER,
];
