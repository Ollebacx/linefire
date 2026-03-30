// Geometry primitives
export type { Position, Size, GameObject } from './geometry';

// Character types
export type { Character, Player } from './player';

// Enemy types
export type { Enemy } from './enemy';
export { EnemyType } from './enemy';

// Ally types
export type { Ally, CollectibleAlly } from './ally';
export { AllyType } from './ally';

// Projectile
export type { Projectile } from './projectile';

// Effects
export type {
  DamageText,
  MuzzleFlash,
  EffectParticle,
  ShieldZone,
  ChainLightningEffect,
  CameraShakeState,
} from './effects';

// Upgrades
export type { Upgrade, SvgIconComponent } from './upgrades';
export { UpgradeType } from './upgrades';

// Game state
export type {
  GameStatus,
  GameState,
  GoldPile,
  SceneryObject,
  TutorialEntities,
  TutorialHighlightTarget,
  SpecialEnemySpawnState,
  LogDefinition,
  LogEntry,
  ChampionChoice,
} from './game';
export { LogId } from './game';
