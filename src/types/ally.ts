import type { Position, GameObject } from './geometry';
import type { Character } from './player';

export enum AllyType {
  GUN_GUY    = 'GUN_GUY',
  SHOTGUN    = 'SHOTGUN',
  SNIPER     = 'SNIPER',
  RPG_SOLDIER = 'RPG_SOLDIER',
  FLAMER     = 'FLAMER',
  MINIGUNNER = 'MINIGUNNER',
  RIFLEMAN   = 'RIFLEMAN',
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
  leaderId: string | null;
  pathHistory: Position[];
  lastShootingDirection?: Position;
  /** True when the chain was broken by a death — acts as a stationary turret until the player re-recruits it. */
  isStranded?: boolean;
  ammoLeftInClip?: number;
  clipSize?: number;
  reloadDuration?: number;
  currentReloadTimer?: number;
}

export interface CollectibleAlly extends GameObject {
  allyType: AllyType;
  color: string;
}
