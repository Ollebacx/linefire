
import { CheckIcon, BoltIcon, ShieldCheckIcon, BanknotesIcon, UsersIcon, LockClosedIcon, FireIcon, ArrowsPointingOutIcon, ChevronDoubleRightIcon, MinusIcon, Bars4Icon, ClockIcon, CogIcon, CircleStackIcon, ShareIcon } from '@heroicons/react/24/outline';


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
  gold: number; // Changed from coins
  shootCooldown: number;
  shootTimer: number;
  damage: number;
  range: number;
  allies: Ally[];
  kills: number; // Total kills in the session for game over screen, distinct from currentRunKills for logs
  coinMagnetRange: number; // Renamed to goldMagnetRange in constants, but player field can stay for now or also change
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
  currentRunGoldEarned: number; // Changed from currentRunCoinsEarned
  highestComboCount: number; // For Game Over screen
  maxSquadSizeAchieved: number; // For Game Over screen
  playerHitTimer: number; // For damage flash effect
  highestRoundAchievedThisRun: number; // For survival logs

  // Player-specific airstrike fields for tutorial
  airstrikeAvailable?: boolean;
  airstrikeActive?: boolean;
  airstrikesPending?: number;
  airstrikeSpawnTimer?: number;

  // Global upgrade player stats
  globalDamageModifier: number; // e.g., 0.1 for +10% damage
  globalFireRateModifier: number; // e.g., 0.9 for -10% cooldown (10% faster fire rate)

  // Airstrike and Weapon Upgrades
  airstrikeMissileCountBonus: number; // Additive: e.g., +2 missiles
  airstrikeDamageModifier: number;    // Multiplicative: e.g., 0.1 for +10% damage
  airstrikeAoeModifier: number;       // Multiplicative: e.g., 0.1 for +10% AoE radius
  projectileSpeedModifier: number;    // Multiplicative: e.g., 0.1 for +10% speed
  piercingRoundsLevel: number;        // Integer: 0 = no pierce, 1 = pierces 1 enemy, etc.

  // Shield Zone Ability
  shieldAbilityUnlocked: boolean; // New: Tracks if shield is unlocked
  shieldAbilityCooldown: number; // Total cooldown for the shield ability
  shieldAbilityTimer: number;    // Current timer for the shield ability cooldown
  shieldZoneBaseDuration: number;
  shieldZoneBaseRadius: number;

  // Chain Lightning Stats
  chainLightningChance: number;
  maxChainTargets: number;
  chainRange: number;
  chainDamageMultiplier: number;
  currentChainLevel: number; // For upgrade tracking
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
  pierceCount?: number; // For player piercing rounds upgrade
  alreadyChainedTo?: string[]; // For chain lightning, IDs of enemies already hit by this chain
  chainsLeft?: number; // For chain lightning
  playerChainLightningLevel?: number; // Added to carry player's upgrade level for rendering
}

export interface GoldPile extends GameObject { // Renamed from Coin
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
  GOLD_MAGNET = 'GOLD_MAGNET', // Renamed from COIN_MAGNET
  SQUAD_SPACING = 'SQUAD_SPACING',
  INITIAL_ALLY_BOOST = 'INITIAL_ALLY_BOOST',

  UNLOCK_SNIPER_ALLY = 'UNLOCK_SNIPER_ALLY',
  UNLOCK_RPG_ALLY = 'UNLOCK_RPG_ALLY',
  UNLOCK_FLAMER_ALLY = 'UNLOCK_FLAMER_ALLY',
  UNLOCK_MINIGUNNER_ALLY = 'UNLOCK_MINIGUNNER_ALLY',

  // Global Upgrades
  GLOBAL_DAMAGE_BOOST = 'GLOBAL_DAMAGE_BOOST',
  GLOBAL_FIRE_RATE_BOOST = 'GLOBAL_FIRE_RATE_BOOST',

  // Airstrike Upgrades
  AIRSTRIKE_MISSILE_COUNT = 'AIRSTRIKE_MISSILE_COUNT',
  AIRSTRIKE_DAMAGE = 'AIRSTRIKE_DAMAGE',
  AIRSTRIKE_AOE = 'AIRSTRIKE_AOE',

  // Player Weapon Upgrades
  PLAYER_PROJECTILE_SPEED = 'PLAYER_PROJECTILE_SPEED',
  PLAYER_PIERCING_ROUNDS = 'PLAYER_PIERCING_ROUNDS',

  // Shield Zone Upgrades
  UNLOCK_SHIELD_ABILITY = 'UNLOCK_SHIELD_ABILITY', // New upgrade type
  SHIELD_DURATION = 'SHIELD_DURATION',
  SHIELD_RADIUS = 'SHIELD_RADIUS',
  SHIELD_COOLDOWN_REDUCTION = 'SHIELD_COOLDOWN_REDUCTION',

  // Chain Lightning Upgrades
  CHAIN_LIGHTNING_CHANCE = 'CHAIN_LIGHTNING_CHANCE', // This might be a single unlock, then levels affect targets/damage
  CHAIN_LIGHTNING_LEVEL = 'CHAIN_LIGHTNING_LEVEL', // Multi-purpose: Increases targets, damage, maybe range slightly
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
  apply: (player: Player, currentCost: number, gameState?: GameState) => { player: Player, updatedGameState?: Partial<GameState> };
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
  GET_SOME_GOLD = 'GET_SOME_GOLD', // Renamed from GET_SOME_MONEY
  GOLD_HOARDER = 'GOLD_HOARDER', // Renamed from GREEDY
  GOLD_BARON = 'GOLD_BARON',     // Renamed from COIN_LORD
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

export type TutorialHighlightTarget = 'health' | 'wave' | 'gold' | 'allyTimer' | 'shieldAbility' | 'airstrike' | null; // Renamed 'coins' to 'gold'

export interface TutorialEntities {
  enemies: Enemy[];
  goldPiles: GoldPile[]; // Renamed from coins
  collectibleAllies: CollectibleAlly[];
  step2AllySpawnIndex?: number; // Index for cycling through ally types in step 2
  step3SpawnTimer?: number; // Timer for spawning enemies in tutorial step 3
  step5SpawnTimer?: number; // Timer for spawning enemies in tutorial step 5 (now step 8)
  tutorialHighlightTarget?: TutorialHighlightTarget;
  muzzleFlashes?: MuzzleFlash[]; // For tutorial
  effectParticles?: EffectParticle[]; // For tutorial
}

export interface DamageText {
  id: string;
  text: string;
  x: number; // World coordinate
  y: number; // World coordinate
  timer: number; // Ticks remaining
  color: string;
  velocityY: number;
  fontSize: number;
  fontWeight: string;
}

export interface MuzzleFlash {
  id: string;
  x: number; // World coordinate, tip of the barrel
  y: number; // World coordinate, tip of the barrel
  angle: number; // Angle in degrees for rotation
  size: number;
  timer: number; // Ticks remaining
  color: string;
}

export interface EffectParticle {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
  velocity: Position;
  timer: number; // Ticks remaining for lifespan
  initialTimer: number; // Store initial timer for opacity calculation
  type: 'impact' | 'death' | 'shield_pulse';
}

export interface ShieldZone extends GameObject {
  duration: number; // Total duration in ticks
  timer: number;    // Current ticks remaining
  radius: number;
  opacity: number;  // For fade in/out or pulse effects
}

export interface ChainLightningEffect {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  timer: number; // How long the visual effect lasts
  color: string;
}

export interface GameState {
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  goldPiles: GoldPile[]; // Renamed from coins
  collectibleAllies: CollectibleAlly[];
  scenery: SceneryObject[];
  damageTexts: DamageText[];
  muzzleFlashes: MuzzleFlash[];
  effectParticles: EffectParticle[];
  shieldZones: ShieldZone[];
  chainLightningEffects: ChainLightningEffect[];
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
