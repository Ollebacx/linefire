import type { Position, GameObject } from './geometry';

export interface Projectile extends GameObject {
  velocity: Position;
  damage: number;
  ownerId: string;
  isPlayerProjectile: boolean;
  color: string;
  speed?: number;
  maxTravelDistance?: number;
  distanceTraveled?: number;
  causesShake?: boolean;
  aoeRadius?: number;
  isAirstrike?: boolean;
  targetY?: number;
  pierceCount?: number;
  alreadyChainedTo?: string[];
  chainsLeft?: number;
  playerChainLightningLevel?: number;
}
