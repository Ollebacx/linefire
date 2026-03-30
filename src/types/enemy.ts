import type { Character } from './player';

export enum EnemyType {
  MELEE_GRUNT     = 'MELEE_GRUNT',
  RANGED_SHOOTER  = 'RANGED_SHOOTER',
  ROCKET_TANK     = 'ROCKET_TANK',
  AGILE_STALKER   = 'AGILE_STALKER',
  ELECTRIC_DRONE  = 'ELECTRIC_DRONE',
  ENEMY_SNIPER    = 'ENEMY_SNIPER',
  TUTORIAL_DUMMY  = 'TUTORIAL_DUMMY',
}

export interface Enemy extends Character {
  enemyType: EnemyType;
  attackDamage: number;
  attackRange: number;
  attackCooldown: number;
  attackTimer: number;
  points: number;
  targetId?: string | null;
  // Electric Drone specific
  aoeDamage?: number;
  aoeRadius?: number;
  aoeCooldown?: number;
  aoeTimer?: number;
}
