/**
 * CombatSystem
 * Handles: shooting (player + allies), enemy AI attacks, shield queries.
 * Returns new projectiles to add and mutated copies of shooter entities.
 */
import { v4 as uuidv4 } from 'uuid';
import type {
  Player, Ally, Enemy, Projectile, ShieldZone, Position, Size,
} from '../types';
import { AllyType, EnemyType } from '../types';
import {
  normalizeVector, getCenter, distanceBetweenGameObjects,
  distanceBetweenPoints, checkCollision,
} from '../utils/geometry';
import {
  UI_STROKE_PRIMARY, UI_ACCENT_CRITICAL,
} from '../constants/ui';
import {
  PROJECTILE_SIZE, RPG_PROJECTILE_SIZE, FLAMER_PROJECTILE_SIZE,
  PLAYER_ALLY_PROJECTILE_SPEED, ENEMY_PROJECTILE_SPEED,
  FLAMER_PROJECTILE_SPEED, FLAMER_PROJECTILE_MAX_TRAVEL_DISTANCE,
  GUN_GUY_SHOT_INTERVAL, GUN_GUY_CLIP_SIZE, GUN_GUY_RELOAD_TIME,
  PLAYER_INITIAL_SHOOT_COOLDOWN,
} from '../constants/player';
import {
  MUZZLE_FLASH_DURATION_TICKS, MUZZLE_FLASH_SIZE, MUZZLE_FLASH_COLOR,
} from '../constants/effects';
import {
  ALLY_SHOTGUN_PROJECTILE_COUNT, ALLY_SHOTGUN_SPREAD_ANGLE,
  ALLY_FLAMER_PROJECTILE_COUNT, ALLY_FLAMER_SPREAD_ANGLE,
} from '../constants/ally';
import {
  RPG_AOE_RADIUS,
  ENEMY_RANGED_SHOOTER_MIN_DISTANCE,
  ENEMY_ROCKET_TANK_PROJECTILE_SPEED, ENEMY_ROCKET_TANK_AOE_RADIUS,
  ENEMY_SNIPER_MIN_DISTANCE_FACTOR, ENEMY_SNIPER_MAX_DISTANCE_FACTOR,
} from '../constants/enemy';
import { PLAYER_HIT_FLASH_DURATION_TICKS } from '../constants/player';
import type { MuzzleFlash } from '../types';

export interface CombatInput {
  shootingDirection: Position | undefined;
  isInteractive: boolean;
}

// ─── Check if a target is inside any active shield zone ─────────────────────
export function isInsideShieldZone(
  target: { x: number; y: number; width: number; height: number },
  shieldZones: ShieldZone[],
): boolean {
  const center = getCenter(target as any);
  return shieldZones.some(sz => distanceBetweenPoints(center, getCenter(sz)) <= sz.radius);
}

// ─── Find closest visible enemy to a shooter ─────────────────────────────────
export function findClosestEnemy(
  shooter: Player | Ally,
  enemies: Enemy[],
  range: number,
  camera: Position,
  viewport: Size,
  requireOnScreen = false,
): Enemy | null {
  let closest: Enemy | null = null;
  let minDist = Infinity;
  for (const e of enemies) {
    if (requireOnScreen) {
      const onScreen =
        e.x < camera.x + viewport.width &&
        e.x + e.width > camera.x &&
        e.y < camera.y + viewport.height &&
        e.y + e.height > camera.y;
      if (!onScreen) continue;
    }
    const d = distanceBetweenGameObjects(shooter, e);
    if (d < minDist) { minDist = d; closest = e; }
  }
  return closest && minDist <= range ? closest : null;
}

// ─── Player shoots ────────────────────────────────────────────────────────────
export function playerShoot(
  player: Player,
  direction: Position,
  globalFireRateMod: number,
): { player: Player; projectiles: Projectile[]; muzzleFlash: MuzzleFlash | null } {
  const p = { ...player };
  const projectiles: Projectile[] = [];
  let muzzleFlash: MuzzleFlash | null = null;

  const effectiveCooldown = (p.shootCooldown || GUN_GUY_SHOT_INTERVAL) * globalFireRateMod;
  p.shootTimer = Math.max(0, p.shootTimer - 1);

  if (p.shootTimer !== 0) return { player: p, projectiles, muzzleFlash };

  const isGunGuy = p.championType === undefined;
  const playerCenter = getCenter(p);
  const damage = p.damage * (1 + p.globalDamageModifier);
  const projSpeed = PLAYER_ALLY_PROJECTILE_SPEED * (1 + p.projectileSpeedModifier);

  if (isGunGuy) {
    // Reload logic
    if (p.currentReloadTimer && p.currentReloadTimer > 0) return { player: p, projectiles, muzzleFlash };
    if (!p.ammoLeftInClip || p.ammoLeftInClip <= 0) return { player: p, projectiles, muzzleFlash };

    projectiles.push({
      id: uuidv4(),
      x: playerCenter.x - PROJECTILE_SIZE.width / 2,
      y: playerCenter.y - PROJECTILE_SIZE.height / 2,
      ...PROJECTILE_SIZE,
      velocity: { x: direction.x * projSpeed, y: direction.y * projSpeed },
      damage, ownerId: p.id, isPlayerProjectile: true, color: UI_STROKE_PRIMARY,
      causesShake: false, pierceCount: p.piercingRoundsLevel,
      alreadyChainedTo: [], chainsLeft: p.maxChainTargets,
      playerChainLightningLevel: p.currentChainLevel,
    });

    p.ammoLeftInClip!--;
    p.shootTimer = effectiveCooldown;
    p.lastShootingDirection = { ...direction };

    if (p.ammoLeftInClip === 0 && p.reloadDuration) {
      p.currentReloadTimer = p.reloadDuration * globalFireRateMod;
    }
  } else {
    const ct = p.championType!;
    let count = 1;
    let spread = 0;
    let pw = PROJECTILE_SIZE.width, ph = PROJECTILE_SIZE.height;
    let maxTravel: number | undefined;
    let shake = false;
    let aoeR: number | undefined;
    let spd = projSpeed;

    if (ct === AllyType.SHOTGUN) { count = ALLY_SHOTGUN_PROJECTILE_COUNT; spread = ALLY_SHOTGUN_SPREAD_ANGLE; }
    else if (ct === AllyType.RPG_SOLDIER) { pw = RPG_PROJECTILE_SIZE.width; ph = RPG_PROJECTILE_SIZE.height; shake = true; aoeR = RPG_AOE_RADIUS; }
    else if (ct === AllyType.FLAMER) { count = ALLY_FLAMER_PROJECTILE_COUNT; spread = ALLY_FLAMER_SPREAD_ANGLE; pw = FLAMER_PROJECTILE_SIZE.width; ph = FLAMER_PROJECTILE_SIZE.height; spd = FLAMER_PROJECTILE_SPEED * (1 + p.projectileSpeedModifier); maxTravel = FLAMER_PROJECTILE_MAX_TRAVEL_DISTANCE; }

    const step = count > 1 ? spread / (count - 1) : 0;
    for (let i = 0; i < count; i++) {
      const angleOffset = (i - (count - 1) / 2) * step;
      const rad = angleOffset * (Math.PI / 180);
      const dx = direction.x * Math.cos(rad) - direction.y * Math.sin(rad);
      const dy = direction.x * Math.sin(rad) + direction.y * Math.cos(rad);
      projectiles.push({
        id: uuidv4(), x: playerCenter.x - pw / 2, y: playerCenter.y - ph / 2, width: pw, height: ph,
        velocity: { x: dx * spd, y: dy * spd }, damage, ownerId: p.id, isPlayerProjectile: true,
        color: UI_STROKE_PRIMARY, maxTravelDistance: maxTravel, distanceTraveled: maxTravel ? 0 : undefined,
        causesShake: shake, aoeRadius: aoeR, pierceCount: p.piercingRoundsLevel,
        alreadyChainedTo: [], chainsLeft: p.maxChainTargets,
        playerChainLightningLevel: p.currentChainLevel,
      });
    }
    p.shootTimer = effectiveCooldown;
    p.lastShootingDirection = { ...direction };
  }

  // Muzzle flash
  const angle = Math.atan2(direction.y, direction.x) * (180 / Math.PI);
  muzzleFlash = {
    id: uuidv4(),
    x: playerCenter.x + Math.cos(angle * Math.PI / 180) * (p.width / 2 + MUZZLE_FLASH_SIZE / 4),
    y: playerCenter.y + Math.sin(angle * Math.PI / 180) * (p.height / 2 + MUZZLE_FLASH_SIZE / 4),
    angle, size: MUZZLE_FLASH_SIZE, timer: MUZZLE_FLASH_DURATION_TICKS, color: MUZZLE_FLASH_COLOR,
  };

  return { player: p, projectiles, muzzleFlash };
}

// ─── Ally shoots ──────────────────────────────────────────────────────────────
export function allyShoot(
  ally: Ally,
  direction: Position,
  globalFireRateMod: number,
  globalDamageMod: number,
): { ally: Ally; projectiles: Projectile[]; muzzleFlash: MuzzleFlash | null } {
  const a = { ...ally };
  const projectiles: Projectile[] = [];
  let muzzleFlash: MuzzleFlash | null = null;

  const effectiveCooldown = (a.shootCooldown || GUN_GUY_SHOT_INTERVAL) * globalFireRateMod;
  a.shootTimer = Math.max(0, a.shootTimer - 1);
  if (a.shootTimer !== 0) return { ally: a, projectiles, muzzleFlash };

  const allyCenter = getCenter(a);
  const damage = a.damage * (1 + globalDamageMod);
  const isGunGuy = a.allyType === AllyType.GUN_GUY;

  if (isGunGuy) {
    if (a.currentReloadTimer && a.currentReloadTimer > 0) return { ally: a, projectiles, muzzleFlash };
    if (!a.ammoLeftInClip || a.ammoLeftInClip <= 0) return { ally: a, projectiles, muzzleFlash };
    projectiles.push({
      id: uuidv4(), x: allyCenter.x - PROJECTILE_SIZE.width / 2, y: allyCenter.y - PROJECTILE_SIZE.height / 2,
      ...PROJECTILE_SIZE, velocity: { x: direction.x * PLAYER_ALLY_PROJECTILE_SPEED, y: direction.y * PLAYER_ALLY_PROJECTILE_SPEED },
      damage, ownerId: a.id, isPlayerProjectile: true, color: UI_STROKE_PRIMARY, causesShake: false,
    });
    a.ammoLeftInClip!--;
    a.shootTimer = effectiveCooldown;
    a.lastShootingDirection = { ...direction };
    if (a.ammoLeftInClip === 0 && a.reloadDuration) a.currentReloadTimer = a.reloadDuration * globalFireRateMod;
  } else {
    const type = a.allyType;
    let pw = PROJECTILE_SIZE.width, ph = PROJECTILE_SIZE.height;
    let spd = a.projectileSpeed || PLAYER_ALLY_PROJECTILE_SPEED;
    let count = 1, spread = 0;
    let maxTravel: number | undefined;
    let shake = false, aoeR: number | undefined;

    if (type === AllyType.RPG_SOLDIER) { pw = RPG_PROJECTILE_SIZE.width; ph = RPG_PROJECTILE_SIZE.height; shake = true; aoeR = RPG_AOE_RADIUS; }
    else if (type === AllyType.FLAMER) { pw = FLAMER_PROJECTILE_SIZE.width; ph = FLAMER_PROJECTILE_SIZE.height; spd = FLAMER_PROJECTILE_SPEED; maxTravel = FLAMER_PROJECTILE_MAX_TRAVEL_DISTANCE; }
    if (type === AllyType.SHOTGUN || type === AllyType.FLAMER) { count = a.projectileCount || 1; spread = a.projectileSpreadAngle || 0; }

    const step = count > 1 ? spread / (count - 1) : 0;
    for (let i = 0; i < count; i++) {
      const rad = (i - (count - 1) / 2) * step * (Math.PI / 180);
      const dx = direction.x * Math.cos(rad) - direction.y * Math.sin(rad);
      const dy = direction.x * Math.sin(rad) + direction.y * Math.cos(rad);
      projectiles.push({
        id: uuidv4(), x: allyCenter.x - pw / 2, y: allyCenter.y - ph / 2, width: pw, height: ph,
        velocity: { x: dx * spd, y: dy * spd }, damage, ownerId: a.id, isPlayerProjectile: true,
        color: UI_STROKE_PRIMARY, maxTravelDistance: maxTravel, distanceTraveled: maxTravel ? 0 : undefined,
        causesShake: shake, aoeRadius: aoeR,
      });
    }
    a.shootTimer = effectiveCooldown;
    a.lastShootingDirection = { ...direction };
  }

  const angle = Math.atan2(direction.y, direction.x) * (180 / Math.PI);
  muzzleFlash = {
    id: uuidv4(),
    x: allyCenter.x + Math.cos(angle * Math.PI / 180) * (a.width / 2 + MUZZLE_FLASH_SIZE / 4),
    y: allyCenter.y + Math.sin(angle * Math.PI / 180) * (a.height / 2 + MUZZLE_FLASH_SIZE / 4),
    angle, size: MUZZLE_FLASH_SIZE * 0.8, timer: MUZZLE_FLASH_DURATION_TICKS, color: MUZZLE_FLASH_COLOR,
  };

  return { ally: a, projectiles, muzzleFlash };
}

// ─── Reload tick for GunGuy variants ─────────────────────────────────────────
export function tickReload<T extends { currentReloadTimer?: number; clipSize?: number; ammoLeftInClip?: number; allyType?: AllyType; championType?: AllyType }>(
  unit: T,
  globalFireRateMod: number,
): T {
  const u = { ...unit };
  if (u.currentReloadTimer && u.currentReloadTimer > 0) {
    u.currentReloadTimer = Math.max(0, u.currentReloadTimer - 1);
    if (u.currentReloadTimer === 0 && u.clipSize) u.ammoLeftInClip = u.clipSize;
  }
  return u;
}

// ─── Enemy melee attack ───────────────────────────────────────────────────────
export function enemyMeleeAttack(
  enemy: Enemy,
  target: Player | Ally,
  isTargetPlayer: boolean,
  shieldZones: ShieldZone[],
): { enemy: Enemy; target: Player | Ally } {
  const e = { ...enemy };
  let t = { ...target };

  if (e.attackTimer > 0 || distanceBetweenGameObjects(e, t) > e.attackRange) return { enemy: e, target: t };
  if (isInsideShieldZone(t, shieldZones)) { e.attackTimer = e.attackCooldown; return { enemy: e, target: t }; }

  (t as any).health -= e.attackDamage;
  if (isTargetPlayer && (t as Player).health > 0) {
    (t as Player).playerHitTimer = PLAYER_HIT_FLASH_DURATION_TICKS;
  }
  e.attackTimer = e.attackCooldown;
  return { enemy: e, target: t };
}
