import type { Size } from '../types';
import { WeaponType, AllyType } from '../types';

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
  allyType: AllyType | undefined; // undefined = GUN_GUY path
  shootCooldown: number;          // seconds (ticks / 60)
  damage: number;
  clipSize: number;
  reloadDuration: number;         // seconds
  color: string;
  rendererColor: number;
}

export const WEAPON_CONFIGS: Record<WeaponType, WeaponConfig> = {
  [WeaponType.PISTOL]:   { label: 'PISTOL',   allyType: undefined,            shootCooldown: 10 / 60,  damage: 10,  clipSize: 6,  reloadDuration: 2.0, color: '#00FFCC', rendererColor: 0x00FFCC },
  [WeaponType.SHOTGUN]:  { label: 'SHOTGUN',  allyType: AllyType.SHOTGUN,     shootCooldown: 30 / 60,  damage: 7,   clipSize: 8,  reloadDuration: 2.0, color: '#FF2055', rendererColor: 0xFF2055 },
  [WeaponType.RIFLEMAN]: { label: 'RIFLEMAN', allyType: AllyType.RIFLEMAN,    shootCooldown: 20 / 60,  damage: 9,   clipSize: 24, reloadDuration: 1.8, color: '#00E5FF', rendererColor: 0x00E5FF },
  [WeaponType.SNIPER]:   { label: 'SNIPER',   allyType: AllyType.SNIPER,      shootCooldown: 70 / 60,  damage: 35,  clipSize: 5,  reloadDuration: 2.5, color: '#CC44FF', rendererColor: 0xCC44FF },
  [WeaponType.RPG]:      { label: 'RPG',      allyType: AllyType.RPG_SOLDIER, shootCooldown: 160 / 60, damage: 40,  clipSize: 3,  reloadDuration: 3.0, color: '#FF9500', rendererColor: 0xFF9500 },
  [WeaponType.FLAMER]:   { label: 'FLAMER',   allyType: AllyType.FLAMER,      shootCooldown: 30 / 60,  damage: 4,   clipSize: 50, reloadDuration: 1.5, color: '#FF6600', rendererColor: 0xFF6600 },
};

// Weapon → AllyType for combat / visual behavior
export const WEAPON_TO_ALLY: Record<WeaponType, AllyType | undefined> = Object.fromEntries(
  Object.entries(WEAPON_CONFIGS).map(([k, v]) => [k, v.allyType])
) as Record<WeaponType, AllyType | undefined>;

export const WEAPON_DROP_SIZE: Size      = { width: 26, height: 26 };
export const WEAPON_DROP_TTL             = 20;   // seconds on ground
export const WEAPON_HELD_TTL             = 45;   // seconds held after pickup
export const WEAPON_DROP_SPAWN_TIMER     = 45;   // seconds between timed drops
export const WEAPON_DROP_KILL_CHANCE     = 0.03; // 3% per kill
// Droppable pool is determined at runtime from store.unlockedAllyTypes
