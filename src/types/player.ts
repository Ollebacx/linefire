import type { Position, GameObject } from './geometry';
import type { AllyType } from './ally';

export interface Character extends GameObject {
  health: number;
  maxHealth: number;
  speed: number;
  color: string;
  velocity?: Position;
}

export interface Player extends Character {
  gold: number;
  shootCooldown: number;
  shootTimer: number;
  damage: number;
  range: number;
  allies: import('./ally').Ally[];
  kills: number;
  coinMagnetRange: number;
  squadSpacingMultiplier: number;
  championType?: AllyType;
  pathHistory: Position[];
  lastShootingDirection?: Position;
  comboCount: number;

  // Gun Guy burst fire
  ammoLeftInClip?: number;
  clipSize?: number;
  reloadDuration?: number;
  currentReloadTimer?: number;

  initialAllyBonus?: number;

  // Run stats
  currentRunKills: number;
  currentRunTanksDestroyed: number;
  currentRunGoldEarned: number;
  highestComboCount: number;
  maxSquadSizeAchieved: number;
  playerHitTimer: number;
  highestRoundAchievedThisRun: number;

  // Airstrike (tutorial)
  airstrikeAvailable?: boolean;
  airstrikeActive?: boolean;
  airstrikesPending?: number;
  airstrikeSpawnTimer?: number;

  // Global modifiers
  globalDamageModifier: number;
  globalFireRateModifier: number;

  // Airstrike upgrades
  airstrikeMissileCountBonus: number;
  airstrikeDamageModifier: number;
  airstrikeAoeModifier: number;

  // Weapon upgrades
  projectileSpeedModifier: number;
  piercingRoundsLevel: number;

  // Shield
  shieldAbilityUnlocked: boolean;
  shieldAbilityCooldown: number;
  shieldAbilityTimer: number;
  shieldZoneBaseDuration: number;
  shieldZoneBaseRadius: number;

  // Chain lightning
  chainLightningChance: number;
  maxChainTargets: number;
  chainRange: number;
  chainDamageMultiplier: number;
  currentChainLevel: number;
}
