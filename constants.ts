
import { Size, Player, Upgrade, UpgradeType, AllyType, ChampionChoice, EnemyType, LogDefinition, LogId, TutorialEntities, TutorialHighlightTarget } from './types';
import {
    HeartIcon, BoltIcon, ArrowsPointingInIcon, UserPlusIcon, FunnelIcon, UserGroupIcon,
    CheckIcon, ShieldCheckIcon, BanknotesIcon, UsersIcon, LockClosedIcon, AcademicCapIcon, StarIcon // Icons for Logs
} from '@heroicons/react/24/solid'; // Using solid for consistency with other icons, outline was in types.ts thought process

// UI Colors
export const UI_BACKGROUND_NEUTRAL = '#F3F4F6'; // Light Gray
export const UI_STROKE_PRIMARY = '#111827';     // Near Black
export const UI_STROKE_SECONDARY = '#4B5563';  // Darker Gray for accents
export const UI_ACCENT_SUBTLE = '#D1D5DB';     // Subtle Gray for inactive/borders
export const UI_ACCENT_CRITICAL = '#EF4444';   // A single critical accent for things like low health or errors (use sparingly)
export const UI_ACCENT_HEALTH = '#22C55E';     // Green for health bar
export const UI_ACCENT_WARNING = '#F97316';    // Orange for warnings or special abilities like airstrike

export const WORLD_WIDTH = 2000;
export const WORLD_HEIGHT = 1500;
export const WORLD_AREA: Size = { width: WORLD_WIDTH, height: WORLD_HEIGHT };

export const CAMERA_LERP_FACTOR = 0.08;

export const PLAYER_INITIAL_HEALTH = 30;
export const PLAYER_SPEED = 3;
export const PLAYER_SIZE: Size = { width: 28, height: 28 }; // Adjusted for new GFX
export const PLAYER_INITIAL_COINS = 0;
export const PLAYER_INITIAL_SHOOT_COOLDOWN = 160; // Default for non-GunGuy champions
export const PLAYER_INITIAL_DAMAGE = 10;
export const PLAYER_INITIAL_RANGE = 480;
export const PLAYER_INITIAL_COIN_MAGNET_RANGE = 40;
export const PLAYER_INITIAL_SQUAD_SPACING_MULTIPLIER = 1.0;
export const PATH_HISTORY_LENGTH = 30;
export const PLAYER_HIT_FLASH_DURATION_TICKS = 10;


// Gun Guy Burst Fire Constants
export const GUN_GUY_CLIP_SIZE = 6;
export const GUN_GUY_SHOT_INTERVAL = 15; // Time between shots in a burst (ticks)
export const GUN_GUY_RELOAD_TIME = 150; // Time to reload after a burst (ticks)


export const ALLY_SIZE: Size = { width: 24, height: 24 }; // Slightly smaller than player
export const ALLY_SPEED = PLAYER_SPEED * 0.9;
export const ALLY_LERP_FACTOR = 0.15; // Increased from 0.12
export const ALLY_INITIAL_HEALTH = 75;
export const ALLY_TRAIL_FOLLOW_DISTANCE = 35;
export const ALLY_PICKUP_HEALTH_RESTORE = 5;

// Base stats, specific GFX handled in GameObjectView
export const ALLY_GUN_GUY_DAMAGE = PLAYER_INITIAL_DAMAGE; // Damage remains the same
export const ALLY_GUN_GUY_RANGE = PLAYER_INITIAL_RANGE;   // Range remains the same
export const ALLY_GUN_GUY_COOLDOWN = GUN_GUY_SHOT_INTERVAL; // Cooldown is now the burst interval

export const ALLY_SHOTGUN_DAMAGE = 7;
export const ALLY_SHOTGUN_COOLDOWN = 45;
export const ALLY_SHOTGUN_RANGE = 420;
export const ALLY_SHOTGUN_PROJECTILE_COUNT = 3;
export const ALLY_SHOTGUN_SPREAD_ANGLE = 35;

export const ALLY_SNIPER_DAMAGE = 35;
export const ALLY_SNIPER_COOLDOWN = 100;
export const ALLY_SNIPER_RANGE = 1200; // Increased from 700
export const ALLY_SNIPER_PROJECTILE_SPEED_MULTIPLIER = 2.0;

export const ALLY_MINIGUNNER_DAMAGE = 6;
export const ALLY_MINIGUNNER_COOLDOWN = 12;
export const ALLY_MINIGUNNER_RANGE = 480;

export const ALLY_RPG_SOLDIER_DAMAGE = 40;
export const ALLY_RPG_SOLDIER_COOLDOWN = 200;
export const ALLY_RPG_SOLDIER_RANGE = 500;
export const ALLY_RPG_SOLDIER_PROJECTILE_SPEED_MULTIPLIER = 1.8;
export const RPG_IMPACT_CAMERA_SHAKE_INTENSITY = 5;
export const RPG_IMPACT_CAMERA_SHAKE_DURATION = 15;
export const RPG_AOE_RADIUS = 60; // Area of Effect radius for player/ally RPGs

export const ALLY_FLAMER_DAMAGE = 4;
export const ALLY_FLAMER_COOLDOWN = 45;
export const ALLY_FLAMER_RANGE = ALLY_MINIGUNNER_RANGE;
export const ALLY_FLAMER_PROJECTILE_COUNT = 4; // Number of arc segments or particle groups
export const ALLY_FLAMER_SPREAD_ANGLE = 0; // Not spread, but area effect

export const ALLY_RIFLEMAN_DAMAGE = 9;
export const ALLY_RIFLEMAN_COOLDOWN = 28;
export const ALLY_RIFLEMAN_RANGE = 520;
export const ALLY_RIFLEMAN_PROJECTILE_SPEED_MULTIPLIER = 1.3;

export const PROJECTILE_SIZE: Size = { width: 6, height: 6 }; // Increased size
export const RPG_PROJECTILE_SIZE: Size = { width: 8, height: 14 }; // Increased size
export const FLAMER_PROJECTILE_SIZE: Size = { width: 16, height: 16 }; // Increased size
export const AIRSTRIKE_PROJECTILE_SIZE: Size = { width: 10, height: 22 };


export const PLAYER_ALLY_PROJECTILE_SPEED = 4; // Reduced from 5
export const ENEMY_PROJECTILE_SPEED = 2.8; // Reduced from 3.5
export const FLAMER_PROJECTILE_SPEED = PLAYER_ALLY_PROJECTILE_SPEED * 0.5; // Will now be 2.0
export const FLAMER_PROJECTILE_MAX_TRAVEL_DISTANCE = 120; // Shorter range for flamer particles
export const AIRSTRIKE_MISSILE_SPEED = 7;


export const COLLECTIBLE_ALLY_SIZE: Size = ALLY_SIZE;
export const ALLY_SPAWN_INTERVAL = 30; // Exported for HUD timer calculation

export const COIN_SIZE: Size = { width: 10, height: 10 };
export const COIN_VALUE = 10;

export const ENEMY_DEFAULT_SIZE: Size = { width: 28, height: 28 };
export const ENEMY_ROCKET_TANK_SIZE: Size = { width: 36, height: 36 };
export const ENEMY_AGILE_STALKER_SIZE: Size = { width: 26, height: 26 };
export const ENEMY_ELECTRIC_DRONE_SIZE: Size = { width: 30, height: 30 }; // Circle
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
export const ENEMY_ROCKET_TANK_PROJECTILE_SPEED = 2.2; // Reduced from 2.8
export const ENEMY_ROCKET_TANK_POINTS = 50;
export const ENEMY_ROCKET_TANK_AOE_RADIUS = 75; // Area of Effect radius for enemy tank rockets


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

// Combo and Airstrike Constants
export const COMBO_WINDOW_DURATION_TICKS = 180; // 3 seconds at 60 FPS
export const AIRSTRIKE_COMBO_THRESHOLD = 10;
export const AIRSTRIKE_MISSILE_COUNT = 10;
export const AIRSTRIKE_MISSILE_INTERVAL_TICKS = 8; // Spawn a missile every ~0.13 seconds
export const AIRSTRIKE_MISSILE_DAMAGE = 50;
export const AIRSTRIKE_MISSILE_AOE_RADIUS = 80;
export const AIRSTRIKE_IMPACT_SHAKE_INTENSITY = 3;
export const AIRSTRIKE_IMPACT_SHAKE_DURATION = 10;

// Wave Title Constants
export const WAVE_TITLE_STAY_DURATION_TICKS = 90; // 1.5 seconds at 60 FPS
export const WAVE_TITLE_FADE_OUT_DURATION_TICKS = 30; // 0.5 seconds at 60 FPS

// Tutorial Constants
export const TUTORIAL_MESSAGES: string[] = [
    "Welcome! Move with <kbd class=\"kbd-minimal\">W</kbd><kbd class=\"kbd-minimal\">A</kbd><kbd class=\"kbd-minimal\">S</kbd><kbd class=\"kbd-minimal\">D</kbd>, Arrow Keys (<kbd class=\"kbd-minimal\">←</kbd> <kbd class=\"kbd-minimal\">↑</kbd> <kbd class=\"kbd-minimal\">↓</kbd> <kbd class=\"kbd-minimal\">→</kbd>), or Mouse. On touch devices, use the joystick. Try moving around.", // Step 0
    "Your vector auto-targets and shoots the closest hostile. Observe how it prioritizes targets.", // Step 1
    "Collect units like this to add them to your squad. They'll fight with you!", // Step 2
    "Destroyed hostiles drop Data (coins). Pick them up to spend on augments later. Engage these targets!", // Step 3
    "This is your Integrity (health). If it reaches zero, the run ends. Keep an eye on it!", // Step 4 - HUD Health
    "This shows the current Wave. Hostiles become more challenging over time.", // Step 5 - HUD Wave
    "This is your collected Data. Spend this on augments between deployments.", // Step 6 - HUD Coins
    "This timer shows when the next support unit can be collected.", // Step 7 - HUD Ally Timer
    "Defeat enemies quickly to build a combo. High combos earn powerful Airstrikes! Press <kbd class=\"kbd-minimal\">Q</kbd> or click anywhere on screen. Try it now!", // Step 8 - Airstrike
    "Tutorial complete! You're ready to survive." // Step 9 - End
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
    coins: [],
    collectibleAllies: [],
    step2AllySpawnIndex: 0,
    step3SpawnTimer: 0,
    step5SpawnTimer: 0, // This will be used for step 8 (airstrike demo)
    tutorialHighlightTarget: null,
};

export const TUTORIAL_STEP_3_ENEMY_SPAWN_INTERVAL = 120; // Approx 2 seconds at 60 FPS
export const TUTORIAL_STEP_3_MAX_CONCURRENT_ENEMIES = 2;
export const TUTORIAL_STEP_5_ENEMY_SPAWN_INTERVAL = 60; // Approx 1 second at 60 FPS - For Airstrike step (now step 8)
export const TUTORIAL_STEP_5_MAX_CONCURRENT_ENEMIES = 5; // For Airstrike step (now step 8)


export const INITIAL_UPGRADES: Upgrade[] = [
  {
    id: UpgradeType.PLAYER_MAX_HEALTH,
    name: 'Integrity Field',
    description: 'Boost Max Integrity: +25. Fortifies core systems.',
    baseCost: 600, cost: 600, currentLevel: 0, maxLevel: 5, costScalingFactor: 1.6, icon: HeartIcon,
    apply: (player: Player, currentCost: number) => ({ ...player, maxHealth: player.maxHealth + 25, health: player.health + 25, coins: player.coins - currentCost }),
  },
  {
    id: UpgradeType.PLAYER_SPEED,
    name: 'Propulsion Boost',
    description: 'Upgrade Propulsion: +10% Velocity. Enhances evasive maneuvers.',
    baseCost: 1300, cost: 1300, currentLevel: 0, maxLevel: 3, costScalingFactor: 1.7, icon: BoltIcon,
    apply: (player: Player, currentCost: number) => ({ ...player, speed: player.speed * 1.10, coins: player.coins - currentCost }),
  },
  {
    id: UpgradeType.COIN_MAGNET,
    name: 'Data Attractor',
    description: 'Expand Collection Radius: +20px. Improves acquisition efficiency.',
    baseCost: 500, cost: 500, currentLevel: 0, maxLevel: 5, costScalingFactor: 1.5, icon: FunnelIcon,
    apply: (player: Player, currentCost: number) => ({ ...player, coinMagnetRange: player.coinMagnetRange + 20, coins: player.coins - currentCost }),
  },
  {
    id: UpgradeType.SQUAD_SPACING,
    name: 'Formation Cohesion',
    description: 'Unit Spacing: -10%. Tightens supportive element formation.',
    baseCost: 500, cost: 500, currentLevel: 0, maxLevel: 5, costScalingFactor: 1.8, icon: ArrowsPointingInIcon,
    apply: (player: Player, currentCost: number) => ({ ...player, squadSpacingMultiplier: Math.max(0.5, player.squadSpacingMultiplier * 0.90), coins: player.coins - currentCost }),
  },
  {
    id: UpgradeType.INITIAL_ALLY_BOOST,
    name: 'Tactical Reinforcement',
    description: 'Start deployments with +1 Rifleman unit. (Max 3)',
    baseCost: 900, cost: 900, currentLevel: 0, maxLevel: 3, costScalingFactor: 2.0,
    icon: UserGroupIcon,
    apply: (player: Player, currentCost: number) => ({
      ...player,
      initialAllyBonus: (player.initialAllyBonus || 0) + 1,
      coins: player.coins - currentCost
    }),
  },
  {
    id: UpgradeType.UNLOCK_SNIPER_ALLY,
    name: 'Acquire Focus Lance Unit',
    description: 'Unlocks Sniper. Long-range, high-precision vector.',
    baseCost: 3100, cost: 3100, currentLevel: 0, maxLevel: 1, costScalingFactor: 1, icon: UserPlusIcon,
    apply: (player: Player, currentCost: number) => ({ ...player, coins: player.coins - currentCost }),
  },
  {
    id: UpgradeType.UNLOCK_RPG_ALLY,
    name: 'Acquire Impact Driver Unit',
    description: 'Unlocks RPG. High-mass kinetic impact vector.',
    baseCost: 4500, cost: 4500, currentLevel: 0, maxLevel: 1, costScalingFactor: 1, icon: UserPlusIcon,
    apply: (player: Player, currentCost: number) => ({ ...player, coins: player.coins - currentCost }),
  },
  {
    id: UpgradeType.UNLOCK_FLAMER_ALLY,
    name: 'Acquire Arc Field Unit',
    description: 'Unlocks Flamer. Short-range energy arc dispersal.',
    baseCost: 5400, cost: 5400, currentLevel: 0, maxLevel: 1, costScalingFactor: 1, icon: UserPlusIcon,
    apply: (player: Player, currentCost: number) => ({ ...player, coins: player.coins - currentCost }),
  },
  {
    id: UpgradeType.UNLOCK_MINIGUNNER_ALLY,
    name: 'Acquire Pulse Array Unit',
    description: 'Unlocks Minigunner. Rapid, sustained vector projection.',
    baseCost: 6500, cost: 6500, currentLevel: 0, maxLevel: 1, costScalingFactor: 1, icon: UserPlusIcon,
    apply: (player: Player, currentCost: number) => ({ ...player, coins: player.coins - currentCost }),
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
  color: UI_STROKE_PRIMARY, // Player color is the main stroke color
  coins: PLAYER_INITIAL_COINS,
  shootCooldown: PLAYER_INITIAL_SHOOT_COOLDOWN,
  shootTimer: 0,
  damage: PLAYER_INITIAL_DAMAGE,
  range: PLAYER_INITIAL_RANGE,
  allies: [],
  kills: 0, // Total kills for game over screen
  coinMagnetRange: PLAYER_INITIAL_COIN_MAGNET_RANGE,
  squadSpacingMultiplier: PLAYER_INITIAL_SQUAD_SPACING_MULTIPLIER,
  championType: undefined,
  pathHistory: [],
  lastShootingDirection: { x: 1, y: 0 }, // Default facing right
  initialAllyBonus: 0, // Initialize here
  comboCount: 0, // Initialize combo count
  playerHitTimer: 0, // Initialize hit timer
  // ammo/reload fields are set based on championType
  currentRunKills: 0,
  currentRunTanksDestroyed: 0,
  currentRunCoinsEarned: 0,
  highestComboCount: 0,
  maxSquadSizeAchieved: 0,
  highestRoundAchievedThisRun: 0,
  // Player-specific airstrike fields for tutorial and potentially other modes
  airstrikeAvailable: false,
  airstrikeActive: false,
  airstrikesPending: 0,
  airstrikeSpawnTimer: 0,
};

export const ROUND_BASE_ENEMY_COUNT = 6; // Increased from 3
export const ROUND_ENEMY_INCREMENT = 2;
export const SHOP_INTERVAL_ROUNDS = 3;

export const SCENERY_OBJECT_COUNT = 0; // Set to 0 for minimalist design
export const SCENERY_VISUAL_KEYS: string[] = []; // Empty as count is 0

export const CHAMPION_CHOICES: ChampionChoice[] = [
  {
    id: 'GUN_GUY', name: 'Vector Prime', description: 'Standard issue. Balanced single-vector output.',
    colorClass: '', // Not used for GFX now
    statsPreview: '6-Shot Burst' // Updated
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
  { id: LogId.GET_SOME_MONEY, name: 'Data Acquisition', description: 'Accumulate 7,000 data units in a single deployment.', icon: BanknotesIcon, condition: (p) => p.currentRunCoinsEarned >= 7000 },
  { id: LogId.GREEDY, name: 'Data Hoarder', description: 'Accumulate 15,000 data units in a single deployment.', icon: BanknotesIcon, condition: (p) => p.currentRunCoinsEarned >= 15000 },
  { id: LogId.COIN_LORD, name: 'Data Baron', description: 'Accumulate 27,000 data units in a single deployment.', icon: BanknotesIcon, condition: (p) => p.currentRunCoinsEarned >= 27000 },
  { id: LogId.CAPTAIN_SQUAD, name: 'Squad Captain', description: 'Command a squad of 8 units (including self).', icon: UsersIcon, condition: (p) => p.allies.length >= 7 },
  { id: LogId.LIEUTENANT_COLONEL_SQUAD, name: 'Lt. Colonel', description: 'Command a squad of 11 units (including self).', icon: UsersIcon, condition: (p) => p.allies.length >= 10 },
  { id: LogId.COLONEL_SQUAD, name: 'Colonel', description: 'Command a squad of 15 units (including self).', icon: UsersIcon, condition: (p) => p.allies.length >= 14 },
  { id: LogId.SURVIVED_WAVE_1, name: 'Lucky', description: 'Successfully cleared wave 1.', icon: StarIcon, condition: (p) => p.highestRoundAchievedThisRun >= 1 },
  { id: LogId.SURVIVED_WAVE_10, name: 'Warrior', description: 'Successfully cleared wave 10.', icon: StarIcon, condition: (p) => p.highestRoundAchievedThisRun >= 10 },
  { id: LogId.SURVIVED_WAVE_20, name: 'Veteran', description: 'Successfully cleared wave 20.', icon: StarIcon, condition: (p) => p.highestRoundAchievedThisRun >= 20 },
];
