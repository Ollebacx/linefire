/**
 * SpawnSystem
 * Creates enemies and collectible allies.
 */
import { v4 as uuidv4 } from 'uuid';
import type { Enemy, CollectibleAlly, Player, Size } from '../types';
import { EnemyType, AllyType } from '../types';
import { UI_STROKE_PRIMARY } from '../constants/ui';
import {
  ENEMY_DEFAULT_SIZE, ENEMY_ROCKET_TANK_SIZE, ENEMY_AGILE_STALKER_SIZE,
  ENEMY_ELECTRIC_DRONE_SIZE, ENEMY_SNIPER_SIZE, TUTORIAL_DUMMY_SIZE,
  ENEMY_MELEE_GRUNT_HEALTH, ENEMY_MELEE_GRUNT_DAMAGE, ENEMY_MELEE_GRUNT_SPEED, ENEMY_MELEE_GRUNT_POINTS,
  ENEMY_RANGED_SHOOTER_HEALTH, ENEMY_RANGED_SHOOTER_DAMAGE, ENEMY_RANGED_SHOOTER_RANGE,
  ENEMY_RANGED_SHOOTER_SPEED, ENEMY_RANGED_SHOOTER_COOLDOWN, ENEMY_RANGED_SHOOTER_POINTS,
  ENEMY_ROCKET_TANK_HEALTH, ENEMY_ROCKET_TANK_DAMAGE, ENEMY_ROCKET_TANK_RANGE,
  ENEMY_ROCKET_TANK_SPEED, ENEMY_ROCKET_TANK_COOLDOWN, ENEMY_ROCKET_TANK_POINTS,
  ENEMY_AGILE_STALKER_HEALTH, ENEMY_AGILE_STALKER_DAMAGE, ENEMY_AGILE_STALKER_SPEED,
  ENEMY_AGILE_STALKER_ATTACK_RANGE, ENEMY_AGILE_STALKER_ATTACK_COOLDOWN, ENEMY_AGILE_STALKER_POINTS,
  ENEMY_ELECTRIC_DRONE_HEALTH, ENEMY_ELECTRIC_DRONE_SPEED, ENEMY_ELECTRIC_DRONE_AOE_DAMAGE,
  ENEMY_ELECTRIC_DRONE_AOE_RADIUS, ENEMY_ELECTRIC_DRONE_AOE_COOLDOWN, ENEMY_ELECTRIC_DRONE_POINTS,
  ENEMY_SNIPER_HEALTH, ENEMY_SNIPER_DAMAGE, ENEMY_SNIPER_RANGE, ENEMY_SNIPER_SPEED,
  ENEMY_SNIPER_COOLDOWN, ENEMY_SNIPER_POINTS,
  ENEMY_SPAWN_PROBABILITIES, MAX_CONCURRENT_ENEMY_TYPE, SPECIAL_ENEMY_TYPES,
  MAX_CONCURRENT_SPECIAL_ENEMIES_ROUND_6_10, MAX_CONCURRENT_SPECIAL_ENEMIES_ROUND_11_PLUS,
} from '../constants/enemy';
import { COLLECTIBLE_ALLY_SIZE, ALLY_SIZE } from '../constants/ally';
import { PLAYER_WORLD_EDGE_MARGIN } from '../constants/world';
import { getCenter, distanceBetweenPoints } from '../utils/geometry';
import type { SpecialEnemySpawnState } from '../types';

// ─── Determine enemy type for next spawn ──────────────────────────────────────
export function determineNextEnemyType(
  round: number,
  currentEnemies: Enemy[],
  _specialState: SpecialEnemySpawnState,
): EnemyType | null {
  const bracket =
    round <= 5  ? '1-5'   :
    round <= 10 ? '6-10'  :
    round <= 15 ? '11-15' :
    round <= 20 ? '16-20' : '21+';

  const probs = ENEMY_SPAWN_PROBABILITIES[bracket];
  const order: EnemyType[] = [
    EnemyType.MELEE_GRUNT, EnemyType.RANGED_SHOOTER, EnemyType.ROCKET_TANK,
    EnemyType.AGILE_STALKER, EnemyType.ELECTRIC_DRONE, EnemyType.ENEMY_SNIPER,
  ];

  const roll = Math.random();
  let cumul = 0;
  for (let i = 0; i < order.length; i++) {
    cumul += probs[i];
    if (roll <= cumul) {
      const type = order[i];
      const maxFn = MAX_CONCURRENT_ENEMY_TYPE[type];
      if (maxFn && currentEnemies.filter(e => e.enemyType === type).length >= maxFn(round)) continue;
      if (round >= 6 && round <= 10 && SPECIAL_ENEMY_TYPES.includes(type)) {
        if (currentEnemies.filter(e => SPECIAL_ENEMY_TYPES.includes(e.enemyType)).length >= MAX_CONCURRENT_SPECIAL_ENEMIES_ROUND_6_10) continue;
      }
      if (round >= 11 && SPECIAL_ENEMY_TYPES.includes(type)) {
        if (currentEnemies.filter(e => SPECIAL_ENEMY_TYPES.includes(e.enemyType)).length >= MAX_CONCURRENT_SPECIAL_ENEMIES_ROUND_11_PLUS) continue;
      }
      return type;
    }
  }

  // Fallback to grunt if quota allows
  const gruntMax = MAX_CONCURRENT_ENEMY_TYPE[EnemyType.MELEE_GRUNT]?.(round) ?? Infinity;
  return currentEnemies.filter(e => e.enemyType === EnemyType.MELEE_GRUNT).length < gruntMax
    ? EnemyType.MELEE_GRUNT : null;
}

// ─── Create a single enemy ────────────────────────────────────────────────────
export function createEnemy(round: number, worldArea: Size, type: EnemyType): Enemy {
  type EnemyBase = Omit<Enemy, 'id' | 'x' | 'y' | 'targetId' | 'color' | 'velocity'>;

  let base: EnemyBase;
  switch (type) {
    case EnemyType.MELEE_GRUNT:
      base = {
        enemyType: type, width: ENEMY_DEFAULT_SIZE.width, height: ENEMY_DEFAULT_SIZE.height,
        health: ENEMY_MELEE_GRUNT_HEALTH + round * 2, maxHealth: ENEMY_MELEE_GRUNT_HEALTH + round * 2,
        speed: ENEMY_MELEE_GRUNT_SPEED + round * 0.1, attackDamage: ENEMY_MELEE_GRUNT_DAMAGE + round,
        attackRange: ENEMY_DEFAULT_SIZE.width * 0.7, attackCooldown: 30, attackTimer: 0, points: ENEMY_MELEE_GRUNT_POINTS,
      }; break;
    case EnemyType.RANGED_SHOOTER:
      base = {
        enemyType: type, width: ENEMY_DEFAULT_SIZE.width, height: ENEMY_DEFAULT_SIZE.height,
        health: ENEMY_RANGED_SHOOTER_HEALTH + round * 1.5, maxHealth: ENEMY_RANGED_SHOOTER_HEALTH + round * 1.5,
        speed: ENEMY_RANGED_SHOOTER_SPEED + round * 0.05, attackDamage: ENEMY_RANGED_SHOOTER_DAMAGE + round * 0.5,
        attackRange: ENEMY_RANGED_SHOOTER_RANGE, attackCooldown: Math.max(30, ENEMY_RANGED_SHOOTER_COOLDOWN - round * 2),
        attackTimer: 0, points: ENEMY_RANGED_SHOOTER_POINTS,
      }; break;
    case EnemyType.ROCKET_TANK:
      base = {
        enemyType: type, width: ENEMY_ROCKET_TANK_SIZE.width, height: ENEMY_ROCKET_TANK_SIZE.height,
        health: ENEMY_ROCKET_TANK_HEALTH + round * 15, maxHealth: ENEMY_ROCKET_TANK_HEALTH + round * 15,
        speed: ENEMY_ROCKET_TANK_SPEED + round * 0.03, attackDamage: ENEMY_ROCKET_TANK_DAMAGE + round * 2,
        attackRange: ENEMY_ROCKET_TANK_RANGE, attackCooldown: ENEMY_ROCKET_TANK_COOLDOWN, attackTimer: 0, points: ENEMY_ROCKET_TANK_POINTS,
      }; break;
    case EnemyType.AGILE_STALKER:
      base = {
        enemyType: type, width: ENEMY_AGILE_STALKER_SIZE.width, height: ENEMY_AGILE_STALKER_SIZE.height,
        health: ENEMY_AGILE_STALKER_HEALTH + round * 1.5, maxHealth: ENEMY_AGILE_STALKER_HEALTH + round * 1.5,
        speed: ENEMY_AGILE_STALKER_SPEED + round * 0.2, attackDamage: ENEMY_AGILE_STALKER_DAMAGE + round,
        attackRange: ENEMY_AGILE_STALKER_ATTACK_RANGE, attackCooldown: ENEMY_AGILE_STALKER_ATTACK_COOLDOWN, attackTimer: 0, points: ENEMY_AGILE_STALKER_POINTS,
      }; break;
    case EnemyType.ELECTRIC_DRONE:
      base = {
        enemyType: type, width: ENEMY_ELECTRIC_DRONE_SIZE.width, height: ENEMY_ELECTRIC_DRONE_SIZE.height,
        health: ENEMY_ELECTRIC_DRONE_HEALTH + round * 1.2, maxHealth: ENEMY_ELECTRIC_DRONE_HEALTH + round * 1.2,
        speed: ENEMY_ELECTRIC_DRONE_SPEED, attackDamage: 0, attackRange: 0, attackCooldown: 0, attackTimer: 0,
        aoeDamage: ENEMY_ELECTRIC_DRONE_AOE_DAMAGE, aoeRadius: ENEMY_ELECTRIC_DRONE_AOE_RADIUS,
        aoeCooldown: ENEMY_ELECTRIC_DRONE_AOE_COOLDOWN, aoeTimer: 0, points: ENEMY_ELECTRIC_DRONE_POINTS,
      }; break;
    case EnemyType.ENEMY_SNIPER:
      base = {
        enemyType: type, width: ENEMY_SNIPER_SIZE.width, height: ENEMY_SNIPER_SIZE.height,
        health: ENEMY_SNIPER_HEALTH + round * 1.5, maxHealth: ENEMY_SNIPER_HEALTH + round * 1.5,
        speed: ENEMY_SNIPER_SPEED + round * 0.02, attackDamage: ENEMY_SNIPER_DAMAGE + round * 1.5,
        attackRange: ENEMY_SNIPER_RANGE, attackCooldown: Math.max(60, ENEMY_SNIPER_COOLDOWN - round * 3),
        attackTimer: 0, points: ENEMY_SNIPER_POINTS,
      }; break;
    case EnemyType.TUTORIAL_DUMMY:
      base = {
        enemyType: type, width: TUTORIAL_DUMMY_SIZE.width, height: TUTORIAL_DUMMY_SIZE.height,
        health: 20, maxHealth: 20, speed: 0, attackDamage: 0, attackRange: 0, attackCooldown: 9999, attackTimer: 0, points: 1,
      }; break;
    default:
      base = {
        enemyType: EnemyType.MELEE_GRUNT, width: ENEMY_DEFAULT_SIZE.width, height: ENEMY_DEFAULT_SIZE.height,
        health: ENEMY_MELEE_GRUNT_HEALTH + round * 2, maxHealth: ENEMY_MELEE_GRUNT_HEALTH + round * 2,
        speed: ENEMY_MELEE_GRUNT_SPEED + round * 0.1, attackDamage: ENEMY_MELEE_GRUNT_DAMAGE + round,
        attackRange: ENEMY_DEFAULT_SIZE.width * 0.7, attackCooldown: 30, attackTimer: 0, points: ENEMY_MELEE_GRUNT_POINTS,
      };
  }

  let x: number, y: number;
  if (type === EnemyType.TUTORIAL_DUMMY) {
    x = worldArea.width / 2 + 100 - base.width / 2;
    y = worldArea.height / 2 - base.height / 2;
  } else {
    const side = Math.floor(Math.random() * 4);
    const margin = 50;
    if (side === 0)      { x = Math.random() * worldArea.width; y = -base.height - margin; }
    else if (side === 1) { x = worldArea.width + margin; y = Math.random() * worldArea.height; }
    else if (side === 2) { x = Math.random() * worldArea.width; y = worldArea.height + margin; }
    else                 { x = -base.width - margin; y = Math.random() * worldArea.height; }
  }

  return { ...base, id: uuidv4(), x, y, targetId: null, color: UI_STROKE_PRIMARY } as Enemy;
}

// ─── Create a collectible ally token ─────────────────────────────────────────
export function createCollectibleAlly(
  allyType: AllyType,
  player: Player,
  existing: CollectibleAlly[],
  worldArea: Size,
  isTutorial = false,
): CollectibleAlly | null {
  const size = COLLECTIBLE_ALLY_SIZE;
  let x: number, y: number;

  if (isTutorial) {
    x = player.x + player.width / 2 + (Math.random() * 120 + 80) * (Math.random() < 0.5 ? 1 : -1) - size.width / 2;
    y = player.y + player.height / 2 + (Math.random() * 120 + 80) * (Math.random() < 0.5 ? 1 : -1) - size.height / 2;
    x = Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(x, worldArea.width - size.width - PLAYER_WORLD_EDGE_MARGIN));
    y = Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(y, worldArea.height - size.height - PLAYER_WORLD_EDGE_MARGIN));
  } else {
    let attempts = 0;
    do {
      x = Math.random() * (worldArea.width - size.width - 2 * PLAYER_WORLD_EDGE_MARGIN) + PLAYER_WORLD_EDGE_MARGIN;
      y = Math.random() * (worldArea.height - size.height - 2 * PLAYER_WORLD_EDGE_MARGIN) + PLAYER_WORLD_EDGE_MARGIN;
      if (++attempts > 50) return null;
    } while (
      distanceBetweenPoints(getCenter(player), { x: x + size.width / 2, y: y + size.height / 2 }) < 150 ||
      existing.some(ca => distanceBetweenPoints(getCenter(ca), { x: x + size.width / 2, y: y + size.height / 2 }) < 100)
    );
  }

  return { id: uuidv4(), allyType, x, y, width: size.width, height: size.height, color: UI_STROKE_PRIMARY };
}
