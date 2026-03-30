

import { Size, Player, Upgrade, UpgradeType, AllyType, ChampionChoice, EnemyType, LogDefinition, LogId, TutorialEntities, TutorialHighlightTarget, GameState } from './types';
import {
    HeartIcon, BoltIcon, ArrowsPointingInIcon, UserPlusIcon, FunnelIcon, UserGroupIcon,
    CheckIcon, ShieldCheckIcon, BanknotesIcon, UsersIcon, LockClosedIcon, AcademicCapIcon, StarIcon,
    FireIcon, ArrowsPointingOutIcon as AoeIcon, ChevronDoubleRightIcon, MinusIcon as PiercingIcon, Bars4Icon,
    ClockIcon, CogIcon, ShareIcon, CircleStackIcon // Removed Turret-specific icons
} from '@heroicons/react/24/solid';

// UI Colors
export const UI_BACKGROUND_NEUTRAL = '#F3F4F6'; // Light Gray
export const UI_STROKE_PRIMARY = '#111827';     // Near Black
export const UI_STROKE_SECONDARY = '#4B5563';  // Darker Gray for accents
export const UI_ACCENT_SUBTLE = '#D1D5DB';     // Subtle Gray for inactive/borders
export const UI_ACCENT_CRITICAL = '#EF4444';   // A single critical accent for things like low health or errors (use sparingly)
export const UI_ACCENT_HEALTH = '#22C55E';     // Green for health bar
export const UI_ACCENT_WARNING = '#F97316';    // Orange for warnings or special abilities like airstrike
export const UI_ACCENT_SHIELD = '#3B82F6';   // Blue for shield effects
export const UI_ACCENT_LIGHTNING = '#00AFFF'; // Vibrant Electric Blue for lightning effects


export const WORLD_WIDTH = 2000;
export const WORLD_HEIGHT = 1500;
export const WORLD_AREA: Size = { width: WORLD_WIDTH, height: WORLD_HEIGHT };

export const CAMERA_LERP_FACTOR = 0.08;

export const PLAYER_INITIAL_HEALTH = 30; // Base health, actual starting health can be modified by upgrades
export const PLAYER_SPEED = 3.8;
export const PLAYER_SIZE: Size = { width: 28, height: 28 };
export const PLAYER_INITIAL_GOLD = 0; // Renamed from PLAYER_INITIAL_COINS
export const PLAYER_INITIAL_SHOOT_COOLDOWN = 100; // This is generic, GunGuy uses GUN_GUY_SHOT_INTERVAL
export const PLAYER_INITIAL_DAMAGE = 10;
export const PLAYER_INITIAL_RANGE = 480;
export const PLAYER_INITIAL_GOLD_MAGNET_RANGE = 40; // Renamed from PLAYER_INITIAL_COIN_MAGNET_RANGE
export const PLAYER_INITIAL_SQUAD_SPACING_MULTIPLIER = 1.0;
export const PATH_HISTORY_LENGTH = 30;
export const PLAYER_HIT_FLASH_DURATION_TICKS = 10;

// Gun Guy Burst Fire Constants
export const GUN_GUY_CLIP_SIZE = 6;
export const GUN_GUY_SHOT_INTERVAL = 10; // Player's effective shootCooldown if GunGuy
export const GUN_GUY_RELOAD_TIME = 120;

export const ALLY_SIZE: Size = { width: 24, height: 24 };
export const ALLY_SPEED = PLAYER_SPEED * 0.9;
export const ALLY_LERP_FACTOR = 0.15;
export const ALLY_INITIAL_HEALTH = 1; // Allies die in one hit
export const ALLY_TRAIL_FOLLOW_DISTANCE = 35;
export const ALLY_PICKUP_HEALTH_RESTORE = 5;

export const ALLY_GUN_GUY_DAMAGE = PLAYER_INITIAL_DAMAGE;
export const ALLY_GUN_GUY_RANGE = PLAYER_INITIAL_RANGE;
export const ALLY_GUN_GUY_COOLDOWN = GUN_GUY_SHOT_INTERVAL;

export const ALLY_SHOTGUN_DAMAGE = 7;
export const ALLY_SHOTGUN_COOLDOWN = 30;
export const ALLY_SHOTGUN_RANGE = 420;
export const ALLY_SHOTGUN_PROJECTILE_COUNT = 3;
export const ALLY_SHOTGUN_SPREAD_ANGLE = 35;

export const ALLY_SNIPER_DAMAGE = 35;
export const ALLY_SNIPER_COOLDOWN = 70;
export const ALLY_SNIPER_RANGE = 1200;
export const ALLY_SNIPER_PROJECTILE_SPEED_MULTIPLIER = 2.0;

export const ALLY_MINIGUNNER_DAMAGE = 6;
export const ALLY_MINIGUNNER_COOLDOWN = 8;
export const ALLY_MINIGUNNER_RANGE = 480;

export const ALLY_RPG_SOLDIER_DAMAGE = 40;
export const ALLY_RPG_SOLDIER_COOLDOWN = 160;
export const ALLY_RPG_SOLDIER_RANGE = 500;
export const ALLY_RPG_SOLDIER_PROJECTILE_SPEED_MULTIPLIER = 1.8;
export const RPG_IMPACT_CAMERA_SHAKE_INTENSITY = 5;
export const RPG_IMPACT_CAMERA_SHAKE_DURATION = 15;
export const RPG_AOE_RADIUS = 60;

export const ALLY_FLAMER_DAMAGE = 4;
export const ALLY_FLAMER_COOLDOWN = 30;
export const ALLY_FLAMER_RANGE = ALLY_MINIGUNNER_RANGE;
export const ALLY_FLAMER_PROJECTILE_COUNT = 4;
export const ALLY_FLAMER_SPREAD_ANGLE = 0;

export const ALLY_RIFLEMAN_DAMAGE = 9;
export const ALLY_RIFLEMAN_COOLDOWN = 20;
export const ALLY_RIFLEMAN_RANGE = 520;
export const ALLY_RIFLEMAN_PROJECTILE_SPEED_MULTIPLIER = 1.3;

export const PROJECTILE_SIZE: Size = { width: 6, height: 6 };
export const RPG_PROJECTILE_SIZE: Size = { width: 12, height: 3 }; // Changed width from 16 to 12
export const FLAMER_PROJECTILE_SIZE: Size = { width: 16, height: 16 };
export const AIRSTRIKE_PROJECTILE_SIZE: Size = { width: 10, height: 22 };

export const PLAYER_ALLY_PROJECTILE_SPEED = 4; // Base speed, player can upgrade this for their own projectiles
export const ENEMY_PROJECTILE_SPEED = 2.8;
export const FLAMER_PROJECTILE_SPEED = PLAYER_ALLY_PROJECTILE_SPEED * 0.5;
export const FLAMER_PROJECTILE_MAX_TRAVEL_DISTANCE = 120;
export const AIRSTRIKE_MISSILE_SPEED = 7;

export const COLLECTIBLE_ALLY_SIZE: Size = ALLY_SIZE;
export const ALLY_SPAWN_INTERVAL = 30;

export const GOLD_PILE_SIZE: Size = { width: 12, height: 12 }; // Renamed from COIN_SIZE, slightly larger
export const GOLD_VALUE = 10; // Renamed from COIN_VALUE

export const ENEMY_DEFAULT_SIZE: Size = { width: 28, height: 28 };
export const ENEMY_ROCKET_TANK_SIZE: Size = { width: 36, height: 36 };
export const ENEMY_AGILE_STALKER_SIZE: Size = { width: 26, height: 26 };
export const ENEMY_ELECTRIC_DRONE_SIZE: Size = { width: 30, height: 30 };
export const ENEMY_SNIPER_SIZE: Size = { width: 28, height: 28 };
export const TUTORIAL_DUMMY_SIZE: Size = { width: 28, height: 28 };

export const ENEMY_MELEE_GRUNT_HEALTH = 30;
export const ENEMY_MELEE_GRUNT_DAMAGE = 10;
export const ENEMY_MELEE_GRUNT_SPEED = 1.5;
export const ENEMY_MELEE_GRUNT_POINTS = 10;

export const ENEMY_RANGED_SHOOTER_HEALTH = 20;
export const ENEMY_RANGED_SHOOTER_DAMAGE = 5;
export const ENEMY_RANGED_SHOOTER_RANGE = 480;
export const ENEMY_RANGED_SHOOTER_SPEED = 1.2;
export const ENEMY_RANGED_SHOOTER_COOLDOWN = 90;
export const ENEMY_RANGED_SHOOTER_POINTS = 15;
export const ENEMY_RANGED_SHOOTER_MIN_DISTANCE = 300;

export const ENEMY_ROCKET_TANK_HEALTH = 500;
export const ENEMY_ROCKET_TANK_DAMAGE = 50;
export const ENEMY_ROCKET_TANK_RANGE = 600;
export const ENEMY_ROCKET_TANK_SPEED = 0.7;
export const ENEMY_ROCKET_TANK_COOLDOWN = 180;
export const ENEMY_ROCKET_TANK_PROJECTILE_SPEED = 2.2;
export const ENEMY_ROCKET_TANK_POINTS = 50;
export const ENEMY_ROCKET_TANK_AOE_RADIUS = 75;

export const ENEMY_AGILE_STALKER_HEALTH = 25;
export const ENEMY_AGILE_STALKER_DAMAGE = 8;
export const ENEMY_AGILE_STALKER_SPEED = 3.8;
export const ENEMY_AGILE_STALKER_POINTS = 20;
export const ENEMY_AGILE_STALKER_ATTACK_RANGE = ENEMY_AGILE_STALKER_SIZE.width * 0.7;
export const ENEMY_AGILE_STALKER_ATTACK_COOLDOWN = 45;

export const ENEMY_ELECTRIC_DRONE_HEALTH = 15;
export const ENEMY_ELECTRIC_DRONE_SPEED = 2.5;
export const ENEMY_ELECTRIC_DRONE_AOE_DAMAGE = 10;
export const ENEMY_ELECTRIC_DRONE_AOE_RADIUS = 100;
export const ENEMY_ELECTRIC_DRONE_AOE_COOLDOWN = 60;
export const ENEMY_ELECTRIC_DRONE_POINTS = 25;

export const ENEMY_SNIPER_HEALTH = 30;
export const ENEMY_SNIPER_DAMAGE = 40;
export const ENEMY_SNIPER_RANGE = 750;
export const ENEMY_SNIPER_SPEED = 1.0;
export const ENEMY_SNIPER_COOLDOWN = 200;
export const ENEMY_SNIPER_POINTS = 35;
export const ENEMY_SNIPER_MIN_DISTANCE_FACTOR = 0.9;
export const ENEMY_SNIPER_MAX_DISTANCE_FACTOR = 1.0;

export const COMBO_WINDOW_DURATION_TICKS = 180;
export const AIRSTRIKE_COMBO_THRESHOLD = 10;
export const AIRSTRIKE_MISSILE_COUNT = 10; // Base count
export const AIRSTRIKE_MISSILE_INTERVAL_TICKS = 8;
export const AIRSTRIKE_MISSILE_DAMAGE = 50; // Base damage
export const AIRSTRIKE_MISSILE_AOE_RADIUS = 80; // Base AoE radius
export const AIRSTRIKE_IMPACT_SHAKE_INTENSITY = 3;
export const AIRSTRIKE_IMPACT_SHAKE_DURATION = 10;

export const WAVE_TITLE_STAY_DURATION_TICKS = 90;
export const WAVE_TITLE_FADE_OUT_DURATION_TICKS = 30;

export const TUTORIAL_MESSAGES: string[] = [
    "Welcome! Move with Arrow Keys (<kbd class=\"kbd-minimal\">←</kbd> <kbd class=\"kbd-minimal\">↑</kbd> <kbd class=\"kbd-minimal\">↓</kbd> <kbd class=\"kbd-minimal\">→</kbd>), or Mouse. On touch devices, use the joystick. Try moving around.", // Step 0
    "Your vector auto-targets and shoots the closest hostile. Observe how it prioritizes targets.", // Step 1
    "Collect units like this to add them to your squad. They'll fight with you!", // Step 2
    "Destroyed hostiles drop Gold. Pick them up to spend on augments later. Engage these targets!", // Step 3
    "This is your Integrity (health). If it reaches zero, the run ends. Keep an eye on it!", // Step 4 - HUD Health
    "This shows the current Wave. Hostiles become more challenging over time.", // Step 5 - HUD Wave
    "This is your collected Gold. Spend this on augments between deployments.", // Step 6 - HUD Gold
    "This timer shows when the next support unit can be collected.", // Step 7 - HUD Ally Timer
    "Defeat enemies quickly to build a combo. High combos earn powerful Airstrikes! Press <kbd class=\"kbd-minimal\">Q</kbd> or click anywhere on screen. Try it now!", // Step 8 - Airstrike
    "Press <kbd class=\"kbd-minimal\">E</kbd> to deploy a temporary Shield Zone. This is its cooldown timer.", // Step 9 - Shield
    "Tutorial complete! You're ready to survive." // Step 10 - End
];

export const TUTORIAL_ALLY_SPAWN_ORDER: AllyType[] = [
    AllyType.RIFLEMAN,
    AllyType.SHOTGUN,
    AllyType.SNIPER,
    AllyType.MINIGUNNER,
    AllyType.RPG_SOLDIER,
    AllyType.FLAMER,
];

export const INITIAL_TUTORIAL_ENTITIES: TutorialEntities = {
    enemies: [],
    goldPiles: [], // Renamed from coins
    collectibleAllies: [],
    muzzleFlashes: [],
    effectParticles: [],
    step2AllySpawnIndex: 0,
    step3SpawnTimer: 0,
    step5SpawnTimer: 0,
    tutorialHighlightTarget: null,
};

export const TUTORIAL_STEP_3_ENEMY_SPAWN_INTERVAL = 120;
export const TUTORIAL_STEP_3_MAX_CONCURRENT_ENEMIES = 2;
export const TUTORIAL_STEP_5_ENEMY_SPAWN_INTERVAL = 60; // For Airstrike step
export const TUTORIAL_STEP_5_MAX_CONCURRENT_ENEMIES = 5; // For Airstrike step

export const DAMAGE_TEXT_DURATION_TICKS = 60;
export const DAMAGE_TEXT_FLOAT_SPEED = -0.8;
export const DAMAGE_TEXT_ENEMY_HIT_COLOR = '#FFFFFF';
export const DAMAGE_TEXT_ENEMY_KILL_COLOR = '#FFD700';
export const DAMAGE_TEXT_FONT_SIZE_HIT = 12;
export const DAMAGE_TEXT_FONT_SIZE_KILL = 14;
export const DAMAGE_TEXT_FONT_WEIGHT_HIT = '500';
export const DAMAGE_TEXT_FONT_WEIGHT_KILL = '700';

export const MUZZLE_FLASH_DURATION_TICKS = 4;
export const MUZZLE_FLASH_SIZE = 20;
export const MUZZLE_FLASH_COLOR = '#FFD700';

export const EFFECT_PARTICLE_DURATION_TICKS = 20;
export const EFFECT_PARTICLE_BASE_SIZE = 3;
export const EFFECT_PARTICLE_SPEED_MIN = 0.5;
export const EFFECT_PARTICLE_SPEED_MAX = 2.0;
export const EFFECT_PARTICLE_COUNT_IMPACT = 4;
export const EFFECT_PARTICLE_COUNT_DEATH = 8;
export const EFFECT_PARTICLE_COLOR_IMPACT = '#FFFFFF';
export const EFFECT_PARTICLE_COLOR_DEATH_PRIMARY = '#AAAAAA';
export const EFFECT_PARTICLE_COLOR_DEATH_SECONDARY = '#666666';
export const SHIELD_PULSE_PARTICLE_COUNT = 10;


// Shield Zone Constants
export const SHIELD_ZONE_DEFAULT_DURATION = 300; // 5 seconds at 60 TPS
export const SHIELD_ZONE_DEFAULT_RADIUS = 100;
export const SHIELD_ZONE_ABILITY_BASE_COOLDOWN = 1200; // 20 seconds
export const SHIELD_ZONE_OPACITY_PULSE_MIN = 0.1;
export const SHIELD_ZONE_OPACITY_PULSE_MAX = 0.4;
export const SHIELD_ZONE_OPACITY_PULSE_SPEED = 0.01;


// Chain Lightning Constants
export const CHAIN_LIGHTNING_BASE_CHANCE = 0.0; // Starts at 0, upgraded to activate
export const CHAIN_LIGHTNING_BASE_TARGETS = 1;
export const CHAIN_LIGHTNING_BASE_RANGE = 150;
export const CHAIN_LIGHTNING_BASE_DAMAGE_MULTIPLIER = 0.6;
export const CHAIN_LIGHTNING_VISUAL_DURATION = 10; // Ticks

export const INITIAL_UPGRADES: Upgrade[] = [
  {
    id: UpgradeType.PLAYER_MAX_HEALTH,
    name: 'Enhanced Integrity Field',
    description: 'Increases Maximum Integrity. Next Level: +20 Health.',
    baseCost: 300, cost: 300, currentLevel: 0, maxLevel: 5, costScalingFactor: 1.8, icon: HeartIcon,
    apply: (player: Player, currentCost: number) => ({ player: { ...player, maxHealth: player.maxHealth + 20, health: player.health + 20, gold: player.gold - currentCost } }),
  },
  {
    id: UpgradeType.PLAYER_SPEED,
    name: 'Advanced Propulsion',
    description: 'Improves Propulsion. Next Level: +0.3 Speed.',
    baseCost: 600, cost: 600, currentLevel: 0, maxLevel: 5, costScalingFactor: 1.9, icon: BoltIcon,
    apply: (player: Player, currentCost: number) => ({ player: { ...player, speed: player.speed + 0.3, gold: player.gold - currentCost } }),
  },
  {
    id: UpgradeType.GOLD_MAGNET,
    name: 'Gold Magnet',
    description: 'Expands Gold Collection Radius. Next Level: +15px Range.',
    baseCost: 250, cost: 250, currentLevel: 0, maxLevel: 5, costScalingFactor: 1.7, icon: FunnelIcon,
    apply: (player: Player, currentCost: number) => ({ player: { ...player, coinMagnetRange: player.coinMagnetRange + 15, gold: player.gold - currentCost } }),
  },
  {
    id: UpgradeType.SQUAD_SPACING,
    name: 'Tightened Formation',
    description: 'Reduces Unit Spacing. Next Level: -0.19 Multiplier.',
    baseCost: 400, cost: 400, currentLevel: 0, maxLevel: 5, costScalingFactor: 1.8, icon: ArrowsPointingInIcon,
    apply: (player: Player, currentCost: number) => ({ player: { ...player, squadSpacingMultiplier: Math.max(0.05, player.squadSpacingMultiplier - 0.19), gold: player.gold - currentCost } }),
  },
  {
    id: UpgradeType.INITIAL_ALLY_BOOST,
    name: 'Initial Deployment Support',
    description: 'Deploys with support. Next Level: +1 Rifleman.',
    baseCost: 1200, cost: 1200, currentLevel: 0, maxLevel: 3, costScalingFactor: 2.2,
    icon: UserGroupIcon,
    apply: (player: Player, currentCost: number) => ({ player: {
      ...player,
      initialAllyBonus: (player.initialAllyBonus || 0) + 1,
      gold: player.gold - currentCost
    }}),
  },
  // Global Upgrades
  {
    id: UpgradeType.GLOBAL_DAMAGE_BOOST,
    name: 'Universal Damage Matrix',
    description: 'Increases global damage. Next Level: +5% Damage.',
    baseCost: 1000, cost: 1000, currentLevel: 0, maxLevel: 5, costScalingFactor: 2.0, icon: StarIcon,
    apply: (player: Player, currentCost: number) => ({ player: { ...player, globalDamageModifier: player.globalDamageModifier + 0.05, gold: player.gold - currentCost } }),
  },
  {
    id: UpgradeType.GLOBAL_FIRE_RATE_BOOST,
    name: 'System-Wide Chrono-Sync',
    description: 'Increases global fire rate. Next Level: +5% Fire Rate.',
    baseCost: 1000, cost: 1000, currentLevel: 0, maxLevel: 5, costScalingFactor: 2.0, icon: BoltIcon,
    apply: (player: Player, currentCost: number) => ({ player: { ...player, globalFireRateModifier: player.globalFireRateModifier * 0.95, gold: player.gold - currentCost } }),
  },
  // Airstrike Upgrades
  {
    id: UpgradeType.AIRSTRIKE_MISSILE_COUNT,
    name: 'Augmented Barrage',
    description: 'More missiles per Barrage. Next Level: +1 Missile.',
    baseCost: 1500, cost: 1500, currentLevel: 0, maxLevel: 5, costScalingFactor: 2.1, icon: Bars4Icon,
    apply: (player: Player, currentCost: number) => ({ player: { ...player, airstrikeMissileCountBonus: player.airstrikeMissileCountBonus + 1, gold: player.gold - currentCost } }),
  },
  {
    id: UpgradeType.AIRSTRIKE_DAMAGE,
    name: 'Enhanced Explosive Payload',
    description: 'Increased missile damage. Next Level: +10% Missile Damage.',
    baseCost: 1800, cost: 1800, currentLevel: 0, maxLevel: 5, costScalingFactor: 1.9, icon: FireIcon,
    apply: (player: Player, currentCost: number) => ({ player: { ...player, airstrikeDamageModifier: player.airstrikeDamageModifier + 0.10, gold: player.gold - currentCost } }),
  },
  {
    id: UpgradeType.AIRSTRIKE_AOE,
    name: 'Fragmentation Radius Expansion',
    description: 'Expands missile AoE. Next Level: +8% AoE Radius.',
    baseCost: 1600, cost: 1600, currentLevel: 0, maxLevel: 5, costScalingFactor: 2.0, icon: AoeIcon,
    apply: (player: Player, currentCost: number) => ({ player: { ...player, airstrikeAoeModifier: player.airstrikeAoeModifier + 0.08, gold: player.gold - currentCost } }),
  },
  // Player Weapon Upgrades
  {
    id: UpgradeType.PLAYER_PROJECTILE_SPEED,
    name: 'High-Velocity Projectiles',
    description: 'Increases projectile speed. Next Level: +10% Speed.',
    baseCost: 700, cost: 700, currentLevel: 0, maxLevel: 5, costScalingFactor: 1.8, icon: ChevronDoubleRightIcon,
    apply: (player: Player, currentCost: number) => ({ player: { ...player, projectileSpeedModifier: player.projectileSpeedModifier + 0.10, gold: player.gold - currentCost } }),
  },
  {
    id: UpgradeType.PLAYER_PIERCING_ROUNDS,
    name: 'Armor-Piercing Rounds',
    description: 'Projectiles pierce enemies. Next Level: Pierces +1 enemy.',
    baseCost: 2500, cost: 2500, currentLevel: 0, maxLevel: 3, costScalingFactor: 2.5, icon: PiercingIcon,
    apply: (player: Player, currentCost: number) => ({ player: { ...player, piercingRoundsLevel: player.piercingRoundsLevel + 1, gold: player.gold - currentCost } }),
  },
  // Shield Zone Upgrades
  {
    id: UpgradeType.UNLOCK_SHIELD_ABILITY,
    name: 'Deployable Shield Emitter',
    description: 'Unlocks the ability to deploy a temporary protective shield zone.',
    baseCost: 2000, cost: 2000, currentLevel: 0, maxLevel: 1, costScalingFactor: 1, icon: ShieldCheckIcon,
    apply: (player: Player, currentCost: number) => ({ player: { ...player, shieldAbilityUnlocked: true, gold: player.gold - currentCost } }),
  },
  {
    id: UpgradeType.SHIELD_DURATION,
    name: 'Extended Shield Duration',
    description: 'Increases shield duration. Next Level: +0.5s Duration.',
    baseCost: 900, cost: 900, currentLevel: 0, maxLevel: 5, costScalingFactor: 1.7, icon: ClockIcon,
    apply: (player: Player, currentCost: number) => ({ player: { ...player, shieldZoneBaseDuration: player.shieldZoneBaseDuration + 30, gold: player.gold - currentCost }}),
  },
  {
    id: UpgradeType.SHIELD_RADIUS,
    name: 'Expanded Shield Radius',
    description: 'Increases shield radius. Next Level: +10% Radius.',
    baseCost: 1200, cost: 1200, currentLevel: 0, maxLevel: 5, costScalingFactor: 1.8, icon: CircleStackIcon,
    apply: (player: Player, currentCost: number) => ({ player: { ...player, shieldZoneBaseRadius: player.shieldZoneBaseRadius * 1.1, gold: player.gold - currentCost }}),
  },
  {
    id: UpgradeType.SHIELD_COOLDOWN_REDUCTION,
    name: 'Rapid Shield Recharge',
    description: 'Reduces shield cooldown. Next Level: -10% Cooldown.',
    baseCost: 1500, cost: 1500, currentLevel: 0, maxLevel: 5, costScalingFactor: 1.9, icon: CogIcon,
    apply: (player: Player, currentCost: number) => ({ player: { ...player, shieldAbilityCooldown: player.shieldAbilityCooldown * 0.9, gold: player.gold - currentCost }}),
  },
  // Chain Lightning Upgrade
  {
    id: UpgradeType.CHAIN_LIGHTNING_LEVEL,
    name: 'Electro-Chain Rounds',
    description: 'Projectiles may chain. Level: +Chance, +Bounces, +Damage.',
    baseCost: 2800, cost: 2800, currentLevel: 0, maxLevel: 5, costScalingFactor: 2.2, icon: ShareIcon,
    apply: (player: Player, currentCost: number) => {
        const newLevel = player.currentChainLevel + 1;
        return { player: {
            ...player,
            currentChainLevel: newLevel,
            chainLightningChance: 0.15 + (newLevel * 0.07), // Base 15%, +7% per level
            maxChainTargets: CHAIN_LIGHTNING_BASE_TARGETS + newLevel, // Base 1, +1 per level
            chainDamageMultiplier: CHAIN_LIGHTNING_BASE_DAMAGE_MULTIPLIER + (newLevel * 0.05), // Base 60%, +5% per level
            chainRange: CHAIN_LIGHTNING_BASE_RANGE + (newLevel * 10), // Base 150, +10px per level
            gold: player.gold - currentCost
        }};
    },
  },
  // Ally Unlocks (Adjusted Costs)
  {
    id: UpgradeType.UNLOCK_SNIPER_ALLY,
    name: 'Acquire Focus Lance Unit',
    description: 'Unlocks Sniper. Long-range, high-precision vector.',
    baseCost: 4500, cost: 4500, currentLevel: 0, maxLevel: 1, costScalingFactor: 1, icon: UserPlusIcon,
    apply: (player: Player, currentCost: number) => ({ player: { ...player, gold: player.gold - currentCost } }),
  },
  {
    id: UpgradeType.UNLOCK_RPG_ALLY,
    name: 'Acquire Impact Driver Unit',
    description: 'Unlocks RPG. High-mass kinetic impact vector.',
    baseCost: 6000, cost: 6000, currentLevel: 0, maxLevel: 1, costScalingFactor: 1, icon: UserPlusIcon,
    apply: (player: Player, currentCost: number) => ({ player: { ...player, gold: player.gold - currentCost } }),
  },
  {
    id: UpgradeType.UNLOCK_FLAMER_ALLY,
    name: 'Acquire Arc Field Unit',
    description: 'Unlocks Flamer. Short-range energy arc dispersal.',
    baseCost: 7000, cost: 7000, currentLevel: 0, maxLevel: 1, costScalingFactor: 1, icon: UserPlusIcon,
    apply: (player: Player, currentCost: number) => ({ player: { ...player, gold: player.gold - currentCost } }),
  },
  {
    id: UpgradeType.UNLOCK_MINIGUNNER_ALLY,
    name: 'Acquire Pulse Array Unit',
    description: 'Unlocks Minigunner. Rapid, sustained vector projection.',
    baseCost: 8500, cost: 8500, currentLevel: 0, maxLevel: 1, costScalingFactor: 1, icon: UserPlusIcon,
    apply: (player: Player, currentCost: number) => ({ player: { ...player, gold: player.gold - currentCost } }),
  },
];

export const INITIAL_PLAYER_STATE: Player = {
  id: 'player',
  x: WORLD_WIDTH / 2 - PLAYER_SIZE.width / 2,
  y: WORLD_HEIGHT / 2 - PLAYER_SIZE.height / 2,
  width: PLAYER_SIZE.width,
  height: PLAYER_SIZE.height,
  health: PLAYER_INITIAL_HEALTH,
  maxHealth: PLAYER_INITIAL_HEALTH,
  speed: PLAYER_SPEED,
  color: UI_STROKE_PRIMARY,
  gold: PLAYER_INITIAL_GOLD, // Renamed from coins
  shootCooldown: GUN_GUY_SHOT_INTERVAL,
  shootTimer: 0,
  damage: PLAYER_INITIAL_DAMAGE,
  range: PLAYER_INITIAL_RANGE,
  allies: [],
  kills: 0,
  coinMagnetRange: PLAYER_INITIAL_GOLD_MAGNET_RANGE, // Renamed from coinMagnetRange
  squadSpacingMultiplier: PLAYER_INITIAL_SQUAD_SPACING_MULTIPLIER,
  championType: undefined,
  pathHistory: [],
  lastShootingDirection: { x: 1, y: 0 },
  initialAllyBonus: 0,
  comboCount: 0,
  playerHitTimer: 0,
  currentRunKills: 0,
  currentRunTanksDestroyed: 0,
  currentRunGoldEarned: PLAYER_INITIAL_GOLD, // Renamed from currentRunCoinsEarned
  highestComboCount: 0,
  maxSquadSizeAchieved: 0,
  highestRoundAchievedThisRun: 0,
  airstrikeAvailable: false,
  airstrikeActive: false,
  airstrikesPending: 0,
  airstrikeSpawnTimer: 0,
  clipSize: GUN_GUY_CLIP_SIZE,
  ammoLeftInClip: GUN_GUY_CLIP_SIZE,
  reloadDuration: GUN_GUY_RELOAD_TIME,
  currentReloadTimer: 0,
  globalDamageModifier: 0,
  globalFireRateModifier: 1.0,
  airstrikeMissileCountBonus: 0,
  airstrikeDamageModifier: 0,
  airstrikeAoeModifier: 0,
  projectileSpeedModifier: 0,
  piercingRoundsLevel: 0,
  // Shield Zone Ability
  shieldAbilityUnlocked: false, // Player starts without shield
  shieldAbilityCooldown: SHIELD_ZONE_ABILITY_BASE_COOLDOWN,
  shieldAbilityTimer: 0,
  shieldZoneBaseDuration: SHIELD_ZONE_DEFAULT_DURATION,
  shieldZoneBaseRadius: SHIELD_ZONE_DEFAULT_RADIUS,
  // Chain Lightning Stats
  chainLightningChance: CHAIN_LIGHTNING_BASE_CHANCE,
  maxChainTargets: CHAIN_LIGHTNING_BASE_TARGETS,
  chainRange: CHAIN_LIGHTNING_BASE_RANGE,
  chainDamageMultiplier: CHAIN_LIGHTNING_BASE_DAMAGE_MULTIPLIER,
  currentChainLevel: 0,
};

export const ROUND_BASE_ENEMY_COUNT = 10;
export const ROUND_ENEMY_INCREMENT = 3;
export const SHOP_INTERVAL_ROUNDS = 3;

export const SCENERY_OBJECT_COUNT = 0;
export const SCENERY_VISUAL_KEYS: string[] = [];

export const CHAMPION_CHOICES: ChampionChoice[] = [
  {
    id: 'GUN_GUY', name: 'Vector Prime', description: 'Standard issue. Balanced single-vector output.',
    colorClass: '',
    statsPreview: '6-Shot Burst'
  },
  {
    id: AllyType.SHOTGUN, name: 'Scatter Node', description: 'Emits a fan of three short-range vectors.',
    colorClass: '', statsPreview: 'Proximal Spread'
  },
  {
    id: AllyType.SNIPER, name: 'Focus Lance', description: 'Projects a single, high-energy long-distance vector.',
    colorClass: '', statsPreview: 'Extended Precision'
  },
  {
    id: AllyType.MINIGUNNER, name: 'Pulse Array', description: 'Rapidly projects a stream of kinetic vectors.',
    colorClass: '', statsPreview: 'Sustained Stream'
  },
  {
    id: AllyType.RIFLEMAN, name: 'Line Projector', description: 'Consistent and accurate medium-range vector projection.',
    colorClass: '', statsPreview: 'Sustained Vector'
  },
  {
    id: AllyType.RPG_SOLDIER, name: 'Impact Driver', description: 'Launches a high-mass vector causing area disruption.',
    colorClass: '', statsPreview: 'High-Mass Impact (AoE)'
  },
  {
    id: AllyType.FLAMER, name: 'Arc Emitter', description: 'Generates a close-range energy arc field for area denial.',
    colorClass: '', statsPreview: 'Area Denial Field'
  },
];

export const INITIAL_SPECIAL_ENEMY_SPAWN_STATE = {
  lastSpecialTypeSpawnedThisWave: null,
  specialSpawnCooldown: 0,
};

export const ENEMY_SPAWN_PROBABILITIES: { [roundBracket: string]: number[] } = {
  '1-5':   [0.7, 0.3, 0.0, 0.0, 0.0, 0.0],
  '6-10':  [0.40, 0.40, 0.05, 0.05, 0.05, 0.05],
  '11-15': [0.25, 0.35, 0.15, 0.083, 0.083, 0.084],
  '16-20': [0.15, 0.30, 0.20, 0.116, 0.116, 0.118],
  '21+':   [0.10, 0.25, 0.25, 0.133, 0.133, 0.134],
};

export const MAX_CONCURRENT_ENEMY_TYPE: { [key in EnemyType]?: (round: number) => number } = {
  [EnemyType.ROCKET_TANK]: (round: number) => (round <= 10 ? 1 : 2),
  [EnemyType.AGILE_STALKER]: (round: number) => (round <= 10 ? 1 : (round <= 15 ? 2 : 3)),
  [EnemyType.ELECTRIC_DRONE]: (round: number) => (round <= 10 ? 1 : (round <= 15 ? 2 : 3)),
  [EnemyType.ENEMY_SNIPER]: (round: number) => (round <= 10 ? 1 : (round <= 15 ? 2 : 3)),
};

export const SPECIAL_ENEMY_TYPES = [
    EnemyType.AGILE_STALKER,
    EnemyType.ELECTRIC_DRONE,
    EnemyType.ENEMY_SNIPER,
];
export const MAX_CONCURRENT_SPECIAL_ENEMIES_ROUND_6_10 = 1;
export const MAX_CONCURRENT_SPECIAL_ENEMIES_ROUND_11_PLUS = 3;

export const INITIAL_LOG_DEFINITIONS: LogDefinition[] = [
  { id: LogId.FIRST_BLOOD, name: 'First Blood', description: 'Neutralize your first hostile vector.', icon: CheckIcon, condition: (p) => p.currentRunKills >= 1 },
  { id: LogId.NATURAL_BORN_KILLER, name: 'Natural Born Killer', description: 'Neutralize 50 vectors in a single deployment.', icon: BoltIcon, condition: (p) => p.currentRunKills >= 50 },
  { id: LogId.BLOOD_THIRSTY, name: 'Blood Thirsty', description: 'Neutralize 150 vectors in a single deployment.', icon: BoltIcon, condition: (p) => p.currentRunKills >= 150 },
  { id: LogId.RAMPAGE, name: 'Rampage', description: 'Neutralize 300 vectors in a single deployment.', icon: BoltIcon, condition: (p) => p.currentRunKills >= 300 },
  { id: LogId.MASS_MURDERER, name: 'Mass Murderer', description: 'Neutralize 450 vectors in a single deployment.', icon: BoltIcon, condition: (p) => p.currentRunKills >= 450 },
  { id: LogId.TANK_DESTROYER, name: 'Tank Destroyer', description: 'Decommission 5 ROCKET_TANK units in a single deployment.', icon: ShieldCheckIcon, condition: (p) => p.currentRunTanksDestroyed >= 5 },
  { id: LogId.MANIAC, name: 'Maniac', description: 'Decommission 10 ROCKET_TANK units in a single deployment.', icon: ShieldCheckIcon, condition: (p) => p.currentRunTanksDestroyed >= 10 },
  { id: LogId.COMMANDO, name: 'Commando', description: 'Decommission 30 ROCKET_TANK units in a single deployment.', icon: ShieldCheckIcon, condition: (p) => p.currentRunTanksDestroyed >= 30 },
  { id: LogId.GET_SOME_GOLD, name: 'Gold Acquisition', description: 'Accumulate 7,000 gold units in a single deployment.', icon: BanknotesIcon, condition: (p) => p.currentRunGoldEarned >= 7000 },
  { id: LogId.GOLD_HOARDER, name: 'Gold Hoarder', description: 'Accumulate 15,000 gold units in a single deployment.', icon: BanknotesIcon, condition: (p) => p.currentRunGoldEarned >= 15000 },
  { id: LogId.GOLD_BARON, name: 'Gold Baron', description: 'Accumulate 27,000 gold units in a single deployment.', icon: BanknotesIcon, condition: (p) => p.currentRunGoldEarned >= 27000 },
  { id: LogId.CAPTAIN_SQUAD, name: 'Squad Captain', description: 'Command a squad of 8 units (including self).', icon: UsersIcon, condition: (p) => p.allies.length >= 7 },
  { id: LogId.LIEUTENANT_COLONEL_SQUAD, name: 'Lt. Colonel', description: 'Command a squad of 11 units (including self).', icon: UsersIcon, condition: (p) => p.allies.length >= 10 },
  { id: LogId.COLONEL_SQUAD, name: 'Colonel', description: 'Command a squad of 15 units (including self).', icon: UsersIcon, condition: (p) => p.allies.length >= 14 },
  { id: LogId.SURVIVED_WAVE_1, name: 'Lucky', description: 'Successfully cleared wave 1.', icon: StarIcon, condition: (p) => p.highestRoundAchievedThisRun >= 1 },
  { id: LogId.SURVIVED_WAVE_10, name: 'Warrior', description: 'Successfully cleared wave 10.', icon: StarIcon, condition: (p) => p.highestRoundAchievedThisRun >= 10 },
  { id: LogId.SURVIVED_WAVE_20, name: 'Veteran', description: 'Successfully cleared wave 20.', icon: StarIcon, condition: (p) => p.highestRoundAchievedThisRun >= 20 },
];