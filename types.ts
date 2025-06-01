export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface GameObject extends Position, Size {
  id: string;
}

export interface Character extends GameObject {
  health: number;
  maxHealth: number;
  speed: number;
  color: string;
  velocity?: Position; // Added for GFX rotation and directional information
}

export interface Player extends Character {
  coins: number;
  shootCooldown: number;
  shootTimer: number;
  damage: number;
  range: number;
  allies: Ally[];
  kills: number; // Total kills in the session for game over screen, distinct from currentRunKills for logs
  coinMagnetRange: number;
  squadSpacingMultiplier: number;
  championType?: AllyType; // To identify if player is a specific ally type
  pathHistory: Position[]; // Added for trail following
  lastShootingDirection?: Position; // Direction of the last shot for orientation
  comboCount: number; // For combo system

  // For Gun Guy burst fire mechanic
  ammoLeftInClip?: number;
  clipSize?: number;
  reloadDuration?: number;
  currentReloadTimer?: number;

  // For Tactical Reinforcement upgrade
  initialAllyBonus?: number;

  // Stats for Logs (per run)
  currentRunKills: number;
  currentRunTanksDestroyed: number;
  currentRunCoinsEarned: number;
  highestComboCount: number; // For Game Over screen
  maxSquadSizeAchieved: number; // For Game Over screen
  playerHitTimer: number; // For damage flash effect
  highestRoundAchievedThisRun: number; // For survival logs

  // Player-specific airstrike fields for tutorial
  airstrikeAvailable?: boolean;
  airstrikeActive?: boolean;
  airstrikesPending?: number;
  airstrikeSpawnTimer?: number;
}

export enum EnemyType {
  MELEE_GRUNT = 'MELEE_GRUNT',
  RANGED_SHOOTER = 'RANGED_SHOOTER',
  ROCKET_TANK = 'ROCKET_TANK',
  AGILE_STALKER = 'AGILE_STALKER',
  ELECTRIC_DRONE = 'ELECTRIC_DRONE',
  ENEMY_SNIPER = 'ENEMY_SNIPER',
  TUTORIAL_DUMMY = 'TUTORIAL_DUMMY', // For tutorial target
}

export interface Enemy extends Character {
  enemyType: EnemyType;
  attackDamage: number;
  attackRange: number;
  attackCooldown: number;
  attackTimer: number;
  points: number;
  targetId?: string | null;
  // Specific for Electric Drone
  aoeDamage?: number;
  aoeRadius?: number;
  aoeCooldown?: number; // Cooldown for AoE damage tick
  aoeTimer?: number;   // Timer for AoE damage tick
}

export interface Projectile extends GameObject {
  velocity: Position;
  damage: number;
  ownerId: string;
  isPlayerProjectile: boolean;
  color: string;
  speed?: number;
  maxTravelDistance?: number; // For projectiles with limited lifespan, like flamer's or airstrikes
  distanceTraveled?: number;  // Tracks distance for lifespan
  causesShake?: boolean; // For projectiles like RPGs or Tank shells
  aoeRadius?: number; // For area of effect damage
  isAirstrike?: boolean; // Flag for airstrike projectiles
  targetY?: number; // For airstrike projectiles to know when to explode on "ground"
}

export interface Coin extends GameObject {
  value: number;
  color: string;
}

export enum AllyType {
  GUN_GUY = 'GUN_GUY', // For Gun Guy as an ally
  SHOTGUN = 'SHOTGUN',
  SNIPER = 'SNIPER',
  RPG_SOLDIER = 'RPG_SOLDIER',
  FLAMER = 'FLAMER',
  MINIGUNNER = 'MINIGUNNER',
  RIFLEMAN = 'RIFLEMAN',
}

export interface Ally extends Character {
  allyType: AllyType;
  targetId: string | null;
  shootCooldown: number;
  shootTimer: number;
  damage: number;
  range: number;
  projectileSpeed?: number;
  projectileCount?: number;
  projectileSpreadAngle?: number;
  leaderId: string;
  pathHistory: Position[]; // Added for trail following
  lastShootingDirection?: Position; // Direction of the last shot for orientation

  // For Gun Guy burst fire mechanic
  ammoLeftInClip?: number;
  clipSize?: number;
  reloadDuration?: number;
  currentReloadTimer?: number;
}

export interface CollectibleAlly extends GameObject {
  allyType: AllyType;
  color: string; // This color is used by the indicator
}

export enum UpgradeType {
  PLAYER_MAX_HEALTH = 'PLAYER_MAX_HEALTH',
  PLAYER_SPEED = 'PLAYER_SPEED',
  COIN_MAGNET = 'COIN_MAGNET',
  SQUAD_SPACING = 'SQUAD_SPACING',
  INITIAL_ALLY_BOOST = 'INITIAL_ALLY_BOOST', // New

  UNLOCK_SNIPER_ALLY = 'UNLOCK_SNIPER_ALLY',
  UNLOCK_RPG_ALLY = 'UNLOCK_RPG_ALLY',
  UNLOCK_FLAMER_ALLY = 'UNLOCK_FLAMER_ALLY',
  UNLOCK_MINIGUNNER_ALLY = 'UNLOCK_MINIGUNNER_ALLY',
}

export interface Upgrade {
  id: UpgradeType;
  name: string;
  description: string;
  cost: number;
  currentLevel: number;
  maxLevel: number;
  baseCost: number;
  costScalingFactor: number;
  apply: (player: Player, currentCost: number) => Player;
  icon?: React.ForwardRefExoticComponent<Omit<React.SVGProps<SVGSVGElement>, "ref"> & { title?: string | undefined; titleId?: string | undefined; } & React.RefAttributes<SVGSVGElement>>;
}

export interface SceneryObject extends GameObject {
  visualKey: string; // e.g., 'rock_1', 'bush_small', 'barricade_wood', 'tire_stack'
  rotation?: number; // Optional rotation for variety
}

export interface CameraShakeState {
  intensity: number;
  duration: number; // in ticks
  timer: number;    // current ticks remaining
}

export type SpecialEnemySpawnState = {
  lastSpecialTypeSpawnedThisWave: EnemyType | null;
  specialSpawnCooldown: number; // Ticks until another special can be considered
};

export enum LogId {
  FIRST_BLOOD = 'FIRST_BLOOD',
  NATURAL_BORN_KILLER = 'NATURAL_BORN_KILLER',
  BLOOD_THIRSTY = 'BLOOD_THIRSTY',
  RAMPAGE = 'RAMPAGE',
  MASS_MURDERER = 'MASS_MURDERER',
  TANK_DESTROYER = 'TANK_DESTROYER',
  MANIAC = 'MANIAC',
  COMMANDO = 'COMMANDO',
  GET_SOME_MONEY = 'GET_SOME_MONEY',
  GREEDY = 'GREEDY',
  COIN_LORD = 'COIN_LORD',
  CAPTAIN_SQUAD = 'CAPTAIN_SQUAD',
  LIEUTENANT_COLONEL_SQUAD = 'LIEUTENANT_COLONEL_SQUAD',
  COLONEL_SQUAD = 'COLONEL_SQUAD',
  SURVIVED_WAVE_1 = 'SURVIVED_WAVE_1',
  SURVIVED_WAVE_10 = 'SURVIVED_WAVE_10',
  SURVIVED_WAVE_20 = 'SURVIVED_WAVE_20',
}

export interface LogDefinition {
  id: LogId;
  name: string;
  description: string;
  icon: React.ForwardRefExoticComponent<Omit<React.SVGProps<SVGSVGElement>, "ref"> & { title?: string | undefined; titleId?: string | undefined; } & React.RefAttributes<SVGSVGElement>>;
  condition: (player: Player, enemies?: Enemy[]) => boolean; // enemies might be useful for some conditions
}

export interface LogEntry extends Omit<LogDefinition, 'condition'>{
  isUnlocked: boolean;
}

export type TutorialHighlightTarget = 'health' | 'wave' | 'coins' | 'allyTimer' | null;

export interface TutorialEntities {
  enemies: Enemy[];
  coins: Coin[];
  collectibleAllies: CollectibleAlly[];
  step2AllySpawnIndex?: number; // Index for cycling through ally types in step 2
  step3SpawnTimer?: number; // Timer for spawning enemies in tutorial step 3
  step5SpawnTimer?: number; // Timer for spawning enemies in tutorial step 5 (now step 8)
  tutorialHighlightTarget?: TutorialHighlightTarget;
}

export interface GameState {
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  coins: Coin[];
  collectibleAllies: CollectibleAlly[];
  scenery: SceneryObject[];
  round: number;
  gameStatus: 'IDLE' | 'CHAMPION_SELECT' | 'PLAYING' | 'SHOP' | 'GAME_OVER_PENDING' | 'GAME_OVER' | 'INIT_NEW_RUN' | 'PAUSED' | 'TUTORIAL_ACTIVE';
  currentWaveEnemies: number; // Tracks enemies defeated in the current wave/round
  totalEnemiesThisRound: number; // Total enemies to defeat for the current wave/round
  gameArea: Size;
  worldArea: Size;
  camera: Position;
  availableUpgrades: Upgrade[];
  keysPressed: { [key: string]: boolean };
  mousePosition: Position | null;
  nextRoundTimer?: number;
  nextAllySpawnTimer: number;
  unlockedAllyTypes: AllyType[];
  cameraShake: CameraShakeState | null;
  isTouchDevice?: boolean;
  specialEnemyState: SpecialEnemySpawnState; // For managing special enemy spawn logic
  comboTimer: number; // Timer for combo window
  airstrikeAvailable: boolean;
  airstrikeActive: boolean;
  airstrikesPending: number; // How many missiles left to spawn in current airstrike
  airstrikeSpawnTimer: number; // Timer between individual missile spawns
  pendingInitialSpawns: number; // Number of enemies from the initial batch still to be spawned.
  initialSpawnTickCounter: number; // Ticks until next initial enemy spawns.
  logs: LogEntry[]; // Added for achievement system
  gameOverPendingTimer?: number; // Timer for the delay before showing game over screen
  waveTitleText: string; // Text for the wave start title (e.g., "Wave 1")
  waveTitleTimer: number; // Timer for wave start title visibility and fade

  // Tutorial State
  tutorialStep: number;
  tutorialMessages: string[];
  tutorialEntities: TutorialEntities;
}

// For Champion Select Screen
export interface ChampionChoice {
  id: AllyType | 'GUN_GUY'; // 'GUN_GUY' string literal for the base player choice
  name: string;
  description: string;
  colorClass: string; // For styling the card
  statsPreview?: string; // Short stats line
}
