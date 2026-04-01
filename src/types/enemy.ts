import type { Character } from './player';

export enum EnemyType {
  MELEE_GRUNT     = 'MELEE_GRUNT',
  RANGED_SHOOTER  = 'RANGED_SHOOTER',
  ROCKET_TANK     = 'ROCKET_TANK',
  AGILE_STALKER   = 'AGILE_STALKER',
  ELECTRIC_DRONE  = 'ELECTRIC_DRONE',
  ENEMY_SNIPER    = 'ENEMY_SNIPER',
  BOSS            = 'BOSS',
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
  hitTimer?: number;       // ticks of white flash when damaged
  // Electric Drone / Boss specific
  aoeDamage?: number;
  aoeRadius?: number;
  aoeCooldown?: number;
  aoeTimer?: number;
  bossPhase?: 1 | 2;  // 2 = enraged at ≤50% HP
}
