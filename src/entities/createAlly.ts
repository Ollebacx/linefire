/**
 * createAlly — entity factory
 *
 * Pure function that mutates the player's `allies` array in-place,
 * matching the original `addAllyToPlayer` logic from useGameLogic.ts.
 */
import { v4 as uuidv4 } from 'uuid';
import type { Player, Ally } from '../types';
import { AllyType } from '../types';
import { getCenter } from '../utils/geometry';
import { PLAYER_WORLD_EDGE_MARGIN } from '../constants/world';
import { WORLD_AREA } from '../constants/world';
import { UI_STROKE_PRIMARY } from '../constants/ui';
import {
  ALLY_SIZE, ALLY_SPEED, ALLY_INITIAL_HEALTH, ALLY_PICKUP_HEALTH_RESTORE,
  ALLY_GUN_GUY_DAMAGE, ALLY_GUN_GUY_RANGE, ALLY_GUN_GUY_COOLDOWN,
  ALLY_SHOTGUN_DAMAGE, ALLY_SHOTGUN_RANGE, ALLY_SHOTGUN_COOLDOWN,
  ALLY_SHOTGUN_PROJECTILE_COUNT, ALLY_SHOTGUN_SPREAD_ANGLE,
  ALLY_SNIPER_DAMAGE, ALLY_SNIPER_RANGE, ALLY_SNIPER_COOLDOWN, ALLY_SNIPER_PROJECTILE_SPEED_MULTIPLIER,
  ALLY_MINIGUNNER_DAMAGE, ALLY_MINIGUNNER_RANGE, ALLY_MINIGUNNER_COOLDOWN,
  ALLY_RPG_SOLDIER_DAMAGE, ALLY_RPG_SOLDIER_RANGE, ALLY_RPG_SOLDIER_COOLDOWN, ALLY_RPG_SOLDIER_PROJECTILE_SPEED_MULTIPLIER,
  ALLY_FLAMER_DAMAGE, ALLY_FLAMER_RANGE, ALLY_FLAMER_COOLDOWN, ALLY_FLAMER_PROJECTILE_COUNT, ALLY_FLAMER_SPREAD_ANGLE,
  ALLY_RIFLEMAN_DAMAGE, ALLY_RIFLEMAN_RANGE, ALLY_RIFLEMAN_COOLDOWN, ALLY_RIFLEMAN_PROJECTILE_SPEED_MULTIPLIER,
} from '../constants/ally';
import { GUN_GUY_CLIP_SIZE, GUN_GUY_RELOAD_TIME, PLAYER_ALLY_PROJECTILE_SPEED } from '../constants/player';

/**
 * Mutates `playerState.allies` in-place (matches original game logic).
 * Also heals the player by ALLY_PICKUP_HEALTH_RESTORE.
 */
export function addAllyToPlayer(
  playerState: Player,
  allyType: AllyType,
  _currentRound: number,
  _globalDamageMod = 0,
  _globalFireRateMod = 1.0,
): void {
  const baseMaxHealth = ALLY_INITIAL_HEALTH;
  type AllyBase = Omit<Ally, 'id' | 'x' | 'y' | 'targetId' | 'leaderId' | 'pathHistory' | 'color' | 'lastShootingDirection' | 'ammoLeftInClip' | 'clipSize' | 'reloadDuration' | 'currentReloadTimer'> & Partial<Pick<Ally, 'ammoLeftInClip' | 'clipSize' | 'reloadDuration' | 'currentReloadTimer'>>;

  let newAllyBase: AllyBase;

  switch (allyType) {
    case AllyType.GUN_GUY:
      newAllyBase = {
        allyType, width: ALLY_SIZE.width, height: ALLY_SIZE.height,
        health: baseMaxHealth, maxHealth: baseMaxHealth, speed: ALLY_SPEED,
        damage: ALLY_GUN_GUY_DAMAGE, range: ALLY_GUN_GUY_RANGE, shootCooldown: ALLY_GUN_GUY_COOLDOWN, shootTimer: 0,
        clipSize: GUN_GUY_CLIP_SIZE, ammoLeftInClip: GUN_GUY_CLIP_SIZE,
        reloadDuration: GUN_GUY_RELOAD_TIME, currentReloadTimer: 0,
      };
      break;

    case AllyType.SHOTGUN:
      newAllyBase = {
        allyType, width: ALLY_SIZE.width, height: ALLY_SIZE.height,
        health: baseMaxHealth, maxHealth: baseMaxHealth, speed: ALLY_SPEED,
        damage: ALLY_SHOTGUN_DAMAGE, range: ALLY_SHOTGUN_RANGE, shootCooldown: ALLY_SHOTGUN_COOLDOWN,
        projectileCount: ALLY_SHOTGUN_PROJECTILE_COUNT, projectileSpreadAngle: ALLY_SHOTGUN_SPREAD_ANGLE,
        shootTimer: 0,
      };
      break;

    case AllyType.SNIPER:
      newAllyBase = {
        allyType, width: ALLY_SIZE.width, height: ALLY_SIZE.height,
        health: baseMaxHealth, maxHealth: baseMaxHealth, speed: ALLY_SPEED,
        damage: ALLY_SNIPER_DAMAGE, range: ALLY_SNIPER_RANGE, shootCooldown: ALLY_SNIPER_COOLDOWN,
        projectileSpeed: PLAYER_ALLY_PROJECTILE_SPEED * ALLY_SNIPER_PROJECTILE_SPEED_MULTIPLIER,
        shootTimer: 0,
      };
      break;

    case AllyType.MINIGUNNER:
      newAllyBase = {
        allyType, width: ALLY_SIZE.width, height: ALLY_SIZE.height,
        health: baseMaxHealth, maxHealth: baseMaxHealth, speed: ALLY_SPEED,
        damage: ALLY_MINIGUNNER_DAMAGE, range: ALLY_MINIGUNNER_RANGE, shootCooldown: ALLY_MINIGUNNER_COOLDOWN,
        shootTimer: 0,
      };
      break;

    case AllyType.RPG_SOLDIER:
      newAllyBase = {
        allyType, width: ALLY_SIZE.width, height: ALLY_SIZE.height,
        health: baseMaxHealth, maxHealth: baseMaxHealth, speed: ALLY_SPEED,
        damage: ALLY_RPG_SOLDIER_DAMAGE, range: ALLY_RPG_SOLDIER_RANGE, shootCooldown: ALLY_RPG_SOLDIER_COOLDOWN,
        projectileSpeed: PLAYER_ALLY_PROJECTILE_SPEED * ALLY_RPG_SOLDIER_PROJECTILE_SPEED_MULTIPLIER,
        shootTimer: 0,
      };
      break;

    case AllyType.FLAMER:
      newAllyBase = {
        allyType, width: ALLY_SIZE.width, height: ALLY_SIZE.height,
        health: baseMaxHealth, maxHealth: baseMaxHealth, speed: ALLY_SPEED,
        damage: ALLY_FLAMER_DAMAGE, range: ALLY_FLAMER_RANGE, shootCooldown: ALLY_FLAMER_COOLDOWN,
        projectileCount: ALLY_FLAMER_PROJECTILE_COUNT, projectileSpreadAngle: ALLY_FLAMER_SPREAD_ANGLE,
        shootTimer: 0,
      };
      break;

    case AllyType.RIFLEMAN:
    default:
      newAllyBase = {
        allyType: AllyType.RIFLEMAN, width: ALLY_SIZE.width, height: ALLY_SIZE.height,
        health: baseMaxHealth, maxHealth: baseMaxHealth, speed: ALLY_SPEED,
        damage: ALLY_RIFLEMAN_DAMAGE, range: ALLY_RIFLEMAN_RANGE, shootCooldown: ALLY_RIFLEMAN_COOLDOWN,
        projectileSpeed: PLAYER_ALLY_PROJECTILE_SPEED * ALLY_RIFLEMAN_PROJECTILE_SPEED_MULTIPLIER,
        shootTimer: 0,
      };
      break;
  }

  // Attach to the tail of the ACTIVE chain (skip stranded turrets).
  const lastActiveAlly = [...playerState.allies].reverse().find(a => !a.isStranded);
  const leader = lastActiveAlly ?? playerState;
  const leaderCenter = getCenter(leader);

  let spawnX = leaderCenter.x - ALLY_SIZE.width / 2;
  let spawnY = leaderCenter.y - ALLY_SIZE.height / 2;
  spawnX = Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(spawnX, WORLD_AREA.width - ALLY_SIZE.width - PLAYER_WORLD_EDGE_MARGIN));
  spawnY = Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(spawnY, WORLD_AREA.height - ALLY_SIZE.height - PLAYER_WORLD_EDGE_MARGIN));

  const newAlly: Ally = {
    ...(newAllyBase as Ally),
    id: uuidv4(),
    x: spawnX, y: spawnY,
    targetId: null,
    leaderId: leader.id,
    pathHistory: [],
    color: UI_STROKE_PRIMARY,
    lastShootingDirection: { x: 1, y: 0 },
    ammoLeftInClip: newAllyBase.ammoLeftInClip ?? 999,
    clipSize:       newAllyBase.clipSize       ?? 999,
    reloadDuration: newAllyBase.reloadDuration ?? 0,
    currentReloadTimer: 0,
  };

  playerState.allies.push(newAlly);
  playerState.health = Math.min(playerState.maxHealth, playerState.health + ALLY_PICKUP_HEALTH_RESTORE);
}
