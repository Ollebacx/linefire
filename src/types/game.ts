import type { Size, Position, GameObject } from './geometry';
import type { Player } from './player';
import type { Enemy, EnemyType } from './enemy';
import type { Projectile } from './projectile';
import type { Ally, AllyType, CollectibleAlly } from './ally';
import type { Upgrade } from './upgrades';
import type { SvgIconComponent } from './upgrades';
import type {
  DamageText,
  MuzzleFlash,
  EffectParticle,
  ShieldZone,
  ChainLightningEffect,
  CameraShakeState,
} from './effects';

export type GameStatus =
  | 'IDLE'
  | 'CHAMPION_SELECT'
  | 'PLAYING'
  | 'SHOP'
  | 'ROUND_COMPLETE'
  | 'GAME_OVER_PENDING'
  | 'GAME_OVER'
  | 'INIT_NEW_RUN'
  | 'PAUSED'
  | 'TUTORIAL_ACTIVE';

export type SpecialEnemySpawnState = {
  lastSpecialTypeSpawnedThisWave: EnemyType | null;
  specialSpawnCooldown: number;
};

export type TutorialHighlightTarget =
  | 'health'
  | 'wave'
  | 'gold'
  | 'allyTimer'
  | 'shieldAbility'
  | 'airstrike'
  | null;

export interface GoldPile extends GameObject {
  value: number;
  color: string;
}

export interface SceneryObject extends GameObject {
  visualKey: string;
  rotation?: number;
}

export interface TutorialEntities {
  enemies: Enemy[];
  goldPiles: GoldPile[];
  collectibleAllies: CollectibleAlly[];
  step2AllySpawnIndex?: number;
  step3SpawnTimer?: number;
  step5SpawnTimer?: number;
  tutorialHighlightTarget?: TutorialHighlightTarget;
  muzzleFlashes?: MuzzleFlash[];
  effectParticles?: EffectParticle[];
}

export enum LogId {
  FIRST_BLOOD               = 'FIRST_BLOOD',
  NATURAL_BORN_KILLER       = 'NATURAL_BORN_KILLER',
  BLOOD_THIRSTY             = 'BLOOD_THIRSTY',
  RAMPAGE                   = 'RAMPAGE',
  MASS_MURDERER             = 'MASS_MURDERER',
  TANK_DESTROYER            = 'TANK_DESTROYER',
  MANIAC                    = 'MANIAC',
  COMMANDO                  = 'COMMANDO',
  GET_SOME_GOLD             = 'GET_SOME_GOLD',
  GOLD_HOARDER              = 'GOLD_HOARDER',
  GOLD_BARON                = 'GOLD_BARON',
  CAPTAIN_SQUAD             = 'CAPTAIN_SQUAD',
  LIEUTENANT_COLONEL_SQUAD  = 'LIEUTENANT_COLONEL_SQUAD',
  COLONEL_SQUAD             = 'COLONEL_SQUAD',
  SURVIVED_WAVE_1           = 'SURVIVED_WAVE_1',
  SURVIVED_WAVE_10          = 'SURVIVED_WAVE_10',
  SURVIVED_WAVE_20          = 'SURVIVED_WAVE_20',
}

export interface LogDefinition {
  id: LogId;
  name: string;
  description: string;
  icon: SvgIconComponent;
  condition: (player: Player, enemies?: Enemy[]) => boolean;
}

export interface LogEntry extends Omit<LogDefinition, 'condition'> {
  isUnlocked: boolean;
}

export interface ChampionChoice {
  id: AllyType | 'GUN_GUY';
  name: string;
  description: string;
  colorClass: string;
  statsPreview?: string;
}

export interface GameState {
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  goldPiles: GoldPile[];
  collectibleAllies: CollectibleAlly[];
  scenery: SceneryObject[];
  damageTexts: DamageText[];
  muzzleFlashes: MuzzleFlash[];
  effectParticles: EffectParticle[];
  shieldZones: ShieldZone[];
  chainLightningEffects: ChainLightningEffect[];
  round: number;
  gameStatus: GameStatus;
  currentWaveEnemies: number;
  totalEnemiesThisRound: number;
  gameArea: Size;
  worldArea: Size;
  camera: Position;
  availableUpgrades: Upgrade[];
  keysPressed: Record<string, boolean>;
  mousePosition: Position | null;
  nextRoundTimer?: number;
  nextAllySpawnTimer: number;
  nextAllyType?: AllyType | null;
  unlockedAllyTypes: AllyType[];
  cameraShake: CameraShakeState | null;
  isTouchDevice?: boolean;
  controlScheme: 'keyboard' | 'mouse';
  specialEnemyState: SpecialEnemySpawnState;
  comboTimer: number;
  airstrikeAvailable: boolean;
  airstrikeActive: boolean;
  airstrikesPending: number;
  airstrikeSpawnTimer: number;
  pendingInitialSpawns: number;
  initialSpawnTickCounter: number;
  logs: LogEntry[];
  gameOverPendingTimer?: number;
  waveTitleText: string;
  waveTitleTimer: number;
  tutorialStep: number;
  tutorialMessages: string[];
  tutorialEntities: TutorialEntities;
}
