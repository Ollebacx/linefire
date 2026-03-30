import type { Size } from '../types';
import { EnemyType } from '../types';

// ── Base sizes ────────────────────────────────────────────────────────────────
export const ENEMY_DEFAULT_SIZE: Size         = { width: 28, height: 28 };
export const ENEMY_ROCKET_TANK_SIZE: Size     = { width: 36, height: 36 };
export const ENEMY_AGILE_STALKER_SIZE: Size   = { width: 26, height: 26 };
export const ENEMY_ELECTRIC_DRONE_SIZE: Size  = { width: 30, height: 30 };
export const ENEMY_SNIPER_SIZE: Size          = { width: 28, height: 28 };
export const TUTORIAL_DUMMY_SIZE: Size        = { width: 28, height: 28 };

// ── Melee Grunt ───────────────────────────────────────────────────────────────
export const ENEMY_MELEE_GRUNT_HEALTH   = 30;
export const ENEMY_MELEE_GRUNT_DAMAGE   = 10;
export const ENEMY_MELEE_GRUNT_SPEED    = 1.5;
export const ENEMY_MELEE_GRUNT_POINTS   = 10;

// ── Ranged Shooter ────────────────────────────────────────────────────────────
export const ENEMY_RANGED_SHOOTER_HEALTH        = 20;
export const ENEMY_RANGED_SHOOTER_DAMAGE        = 5;
export const ENEMY_RANGED_SHOOTER_RANGE         = 480;
export const ENEMY_RANGED_SHOOTER_SPEED         = 1.2;
export const ENEMY_RANGED_SHOOTER_COOLDOWN      = 90;
export const ENEMY_RANGED_SHOOTER_POINTS        = 15;
export const ENEMY_RANGED_SHOOTER_MIN_DISTANCE  = 300;

// ── Rocket Tank ───────────────────────────────────────────────────────────────
export const ENEMY_ROCKET_TANK_HEALTH           = 500;
export const ENEMY_ROCKET_TANK_DAMAGE           = 50;
export const ENEMY_ROCKET_TANK_RANGE            = 600;
export const ENEMY_ROCKET_TANK_SPEED            = 0.7;
export const ENEMY_ROCKET_TANK_COOLDOWN         = 180;
export const ENEMY_ROCKET_TANK_PROJECTILE_SPEED = 2.2;
export const ENEMY_ROCKET_TANK_POINTS           = 50;
export const ENEMY_ROCKET_TANK_AOE_RADIUS       = 75;
export const RPG_IMPACT_CAMERA_SHAKE_INTENSITY  = 5;
export const RPG_IMPACT_CAMERA_SHAKE_DURATION   = 15;
export const RPG_AOE_RADIUS                     = 60;

// ── Agile Stalker ─────────────────────────────────────────────────────────────
export const ENEMY_AGILE_STALKER_HEALTH         = 25;
export const ENEMY_AGILE_STALKER_DAMAGE         = 8;
export const ENEMY_AGILE_STALKER_SPEED          = 3.8;
export const ENEMY_AGILE_STALKER_POINTS         = 20;
export const ENEMY_AGILE_STALKER_ATTACK_RANGE   = ENEMY_AGILE_STALKER_SIZE.width * 0.7;
export const ENEMY_AGILE_STALKER_ATTACK_COOLDOWN = 45;

// ── Electric Drone ────────────────────────────────────────────────────────────
export const ENEMY_ELECTRIC_DRONE_HEALTH      = 15;
export const ENEMY_ELECTRIC_DRONE_SPEED       = 2.5;
export const ENEMY_ELECTRIC_DRONE_AOE_DAMAGE  = 10;
export const ENEMY_ELECTRIC_DRONE_AOE_RADIUS  = 100;
export const ENEMY_ELECTRIC_DRONE_AOE_COOLDOWN = 60;
export const ENEMY_ELECTRIC_DRONE_POINTS      = 25;

// ── Enemy Sniper ──────────────────────────────────────────────────────────────
export const ENEMY_SNIPER_HEALTH              = 30;
export const ENEMY_SNIPER_DAMAGE              = 40;
export const ENEMY_SNIPER_RANGE               = 750;
export const ENEMY_SNIPER_SPEED               = 1.0;
export const ENEMY_SNIPER_COOLDOWN            = 200;
export const ENEMY_SNIPER_POINTS              = 35;
export const ENEMY_SNIPER_MIN_DISTANCE_FACTOR = 0.9;
export const ENEMY_SNIPER_MAX_DISTANCE_FACTOR = 1.0;

// ── Wave / spawn ──────────────────────────────────────────────────────────────
export const ROUND_BASE_ENEMY_COUNT  = 10;
export const ROUND_ENEMY_INCREMENT   = 3;
export const WAVE_TITLE_STAY_DURATION_TICKS     = 90;
export const WAVE_TITLE_FADE_OUT_DURATION_TICKS = 30;

export const INITIAL_SPECIAL_ENEMY_SPAWN_STATE = {
  lastSpecialTypeSpawnedThisWave: null as EnemyType | null,
  specialSpawnCooldown: 0,
};

export const ENEMY_SPAWN_PROBABILITIES: Record<string, number[]> = {
  '1-5':   [0.7,  0.3,  0.0,   0.0,   0.0,   0.0  ],
  '6-10':  [0.40, 0.40, 0.05,  0.05,  0.05,  0.05 ],
  '11-15': [0.25, 0.35, 0.15,  0.083, 0.083, 0.084],
  '16-20': [0.15, 0.30, 0.20,  0.116, 0.116, 0.118],
  '21+':   [0.10, 0.25, 0.25,  0.133, 0.133, 0.134],
};

export const MAX_CONCURRENT_ENEMY_TYPE: Partial<Record<EnemyType, (round: number) => number>> = {
  [EnemyType.ROCKET_TANK]:    (r) => (r <= 10 ? 1 : 2),
  [EnemyType.AGILE_STALKER]:  (r) => (r <= 10 ? 1 : r <= 15 ? 2 : 3),
  [EnemyType.ELECTRIC_DRONE]: (r) => (r <= 10 ? 1 : r <= 15 ? 2 : 3),
  [EnemyType.ENEMY_SNIPER]:   (r) => (r <= 10 ? 1 : r <= 15 ? 2 : 3),
};

export const SPECIAL_ENEMY_TYPES = [
  EnemyType.AGILE_STALKER,
  EnemyType.ELECTRIC_DRONE,
  EnemyType.ENEMY_SNIPER,
];

export const MAX_CONCURRENT_SPECIAL_ENEMIES_ROUND_6_10    = 1;
export const MAX_CONCURRENT_SPECIAL_ENEMIES_ROUND_11_PLUS = 3;
