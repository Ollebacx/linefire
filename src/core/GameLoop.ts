/**
 * GameLoop — requestAnimationFrame orchestrator
 *
 * Runs all pure systems each frame, then patches the Zustand store.
 * Completely decoupled from React's render cycle.
 *
 * Tick rate target: 60 fps (16.67 ms/frame).
 */
import { v4 as uuidv4 } from 'uuid';
import type { Player, Ally, Position, Size, GameStatus, Enemy, Projectile, WeaponDrop } from '../types';
import { EnemyType, AllyType, WeaponType } from '../types';
import type { InputSnapshot } from '../systems/MovementSystem';
import type { ComboState } from '../systems/ComboSystem';

import { applyPlayerMovement, updateCamera, updateAllyMovement, chainAllyLeaders } from '../systems/MovementSystem';
import { processProjectiles } from '../systems/ProjectileSystem';
import { playerShoot, allyShoot, tickReload, enemyMeleeAttack, findClosestEnemy, isInsideShieldZone } from '../systems/CombatSystem';
import { createEnemy, createCollectibleAlly, determineNextEnemyType, createWeaponDrop } from '../systems/SpawnSystem';
import { INITIAL_SPAWN_INTERVAL_TICKS } from '../systems/WaveSystem';
import { tickCombo, registerKill, completeAirstrike } from '../systems/ComboSystem';
import {
  tickDamageTexts, tickMuzzleFlashes, tickEffectParticles,
  tickShieldZones, tickChainLightning, tickCameraShake,
} from '../systems/EffectsSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { addAllyToPlayer } from '../entities/createAlly';
import type { SoundId } from '../systems/AudioSystem';

/** Maps an AllyType to its corresponding shoot SoundId. */
function allyShootSound(type: AllyType): SoundId {
  switch (type) {
    case AllyType.SHOTGUN:     return 'shoot_shotgun';
    case AllyType.SNIPER:      return 'shoot_sniper';
    case AllyType.RPG_SOLDIER: return 'shoot_rpg';
    case AllyType.FLAMER:      return 'shoot_flamer';
    case AllyType.MINIGUNNER:  return 'shoot_minigun';
    case AllyType.RIFLEMAN:    return 'shoot_rifle';
    default:                    return 'shoot_gun_guy';
  }
}

import { useGameStore } from '../stores/gameStore';
import { useUiStore } from '../stores/uiStore';

import { checkCollision, distanceBetweenPoints, distanceBetweenGameObjects, getCenter } from '../utils/geometry';
import {
  AIRSTRIKE_MISSILE_DAMAGE, AIRSTRIKE_MISSILE_AOE_RADIUS, AIRSTRIKE_MISSILE_SPEED,
  AIRSTRIKE_PROJECTILE_SIZE, AIRSTRIKE_MISSILE_INTERVAL_TICKS, AIRSTRIKE_COMBO_THRESHOLD,
  ENEMY_PROJECTILE_SPEED, RPG_PROJECTILE_SIZE, PROJECTILE_SIZE, PLAYER_HIT_FLASH_DURATION_TICKS,
  WEAPON_CONFIGS, WEAPON_TO_ALLY, WEAPON_DROP_KILL_CHANCE, WEAPON_HELD_TTL, WEAPON_DROP_SPAWN_TIMER,
  GUN_GUY_CLIP_SIZE, GUN_GUY_RELOAD_TIME,
} from '../constants/player';
import {
  ENEMY_ROCKET_TANK_PROJECTILE_SPEED, ENEMY_ROCKET_TANK_AOE_RADIUS,
  ENEMY_BOSS_PROJECTILE_SPEED, ENEMY_BOSS_WARN_TICKS,
} from '../constants/enemy';
import { ALLY_SPAWN_INTERVAL, ALLY_PICKUP_HEALTH_RESTORE } from '../constants/ally';
import { GOLD_MAGNET_PULL_SPEED, PATH_HISTORY_LENGTH } from '../constants/player';
import { UI_ACCENT_WARNING, UI_ACCENT_CRITICAL } from '../constants/ui';

// ─── Constants ────────────────────────────────────────────────────────────────
const TARGET_FPS      = 60;
const TARGET_FRAME_MS = 1000 / TARGET_FPS;
const DELTA_SECONDS   = 1 / TARGET_FPS;
const INTER_WAVE_DELAY_SECONDS = 5;

// ─── GameLoop class ───────────────────────────────────────────────────────────
export class GameLoop {
  private rafId: number | null = null;
  private lastTimestamp         = 0;
  private accumulator           = 0;
  /** True while the rAF loop is running — used by GameCanvas to skip duplicate renders. */
  isRunning                     = false;
  private renderCallback: (() => void) | null = null;
  private _fpsFrameCount        = 0;

  /** Register a render function driven by the rAF loop (once per frame, not once per tick). */
  setRenderCallback(cb: (() => void) | null): void {
    this.renderCallback = cb;
  }

  // ── Start ──────────────────────────────────────────────────────────────────
  start() {
    if (this.rafId !== null) return;
    this.isRunning = true;
    AudioSystem.resume();
    this.lastTimestamp = performance.now();
    this.rafId = requestAnimationFrame(this._loop);
  }

  // ── Stop ───────────────────────────────────────────────────────────────────
  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.isRunning = false;
    // One final render so pausing/shop transitions display the correct state.
    this.renderCallback?.();
  }

  // ── Inner rAF callback ─────────────────────────────────────────────────────
  private _loop = (timestamp: number) => {
    this.rafId = requestAnimationFrame(this._loop);

    const rawElapsed = timestamp - this.lastTimestamp;
    // Clamp to 50 ms: prevents burst accumulation after a tab-switch or GC pause.
    const elapsed = Math.min(rawElapsed, 50);
    this.lastTimestamp = timestamp;
    this.accumulator += elapsed;

    // Run at most 2 catch-up ticks per rAF frame.
    let ticks = 0;
    while (this.accumulator >= TARGET_FRAME_MS && ticks < 2) {
      this._tick();
      this.accumulator -= TARGET_FRAME_MS;
      ticks++;
    }
    // If still behind after 2 ticks, drain rather than oscillate.
    // This trades a momentary slow-down for a stable frame rate.
    if (this.accumulator > TARGET_FRAME_MS) this.accumulator = 0;

    // ── Render exactly once per rAF frame ─────────────────────────────────
    // The Zustand subscription in GameCanvas is bypassed during gameplay
    // (isRunning = true) so we never get 2+ Pixi render passes per rAF.
    if (ticks > 0) this.renderCallback?.();

    // FPS counter throttled to every 30 frames — setFps() triggers a React
    // re-render of the HUD component; calling it at 60 Hz is wasteful.
    if (++this._fpsFrameCount >= 30 && rawElapsed > 0) {
      this._fpsFrameCount = 0;
      useUiStore.getState().setFps(Math.min(Math.round(1000 / rawElapsed), 999));
    }
  };

  // ── Single simulation tick ─────────────────────────────────────────────────
  private _tick() {
    const store = useGameStore.getState();
    const { gameStatus } = store;

    if (gameStatus === 'PAUSED') return;

    if (gameStatus === 'PLAYING' || gameStatus === 'TUTORIAL_ACTIVE' || gameStatus === 'ROUND_COMPLETE') {
      this._tickGameplay(store);
    } else if (gameStatus === 'INIT_NEW_RUN') {
      useGameStore.getState().startNewRound(store.player, 1);
    } else if (gameStatus === 'GAME_OVER_PENDING') {
      this._tickGameOverPending(store);
    }
  }

  // ── Gameplay tick ──────────────────────────────────────────────────────────
  private _tickGameplay(store: ReturnType<typeof useGameStore.getState>) {
    const isTutorial = store.gameStatus === 'TUTORIAL_ACTIVE';

    // ── 1. Build input snapshot ────────────────────────────────────────────
    const input: InputSnapshot = {
      keysPressed:      store.keysPressed,
      mousePosition:    store.mousePosition ?? null,
      joystickDirection: store.joystickDirection,
      isTouchDevice:    store.isTouchDevice ?? false,
      controlScheme:    store.controlScheme ?? 'keyboard',
    };

    // ── 2. Player movement ─────────────────────────────────────────────────
    // OVERCLOCK: below 30% HP → speed +40%, danger mode
    const hpRatio = store.player.maxHealth > 0 ? store.player.health / store.player.maxHealth : 1;
    const isOverclock = hpRatio < 0.30 && store.player.health > 0;
    const baseSpeed = store.player.speed;
    const movementSource = isOverclock
      ? { ...store.player, speed: baseSpeed * 1.4 }
      : store.player;
    let newPlayer: Player = {
      ...applyPlayerMovement({ ...movementSource }, input, store.gameArea, store.camera),
      speed: baseSpeed, // always persist base speed — never save the OVERCLOCK multiplier
      allies: store.player.allies.map(a => ({ ...a })),
    };

    const newCamera: Position = updateCamera(
      { ...store.camera }, newPlayer, store.gameArea,
    );

    // ── 3. Ally movement ───────────────────────────────────────────────────
    // Active (non-stranded) allies form the chain from the player.
    // Stranded allies are turrets: they stay put but update pathHistory for aiming.
    let prevActive: Player | Ally = newPlayer;
    const movedAllies: typeof newPlayer.allies = [];
    for (const ally of newPlayer.allies) {
      if (ally.isStranded) {
        // Turret: freeze position, but keep pathHistory so shooting direction works
        const a = { ...ally };
        const center = getCenter(a);
        a.pathHistory = [center, ...(a.pathHistory ?? [])].slice(0, PATH_HISTORY_LENGTH);
        movedAllies.push(a);
      } else {
        // Active: follow the previous active entity in chain
        const a = { ...ally, leaderId: prevActive.id };
        const moved = updateAllyMovement(a, [prevActive], newPlayer.squadSpacingMultiplier);
        movedAllies.push(moved);
        prevActive = moved;
      }
    }
    newPlayer.allies = movedAllies;

    // ── 4. Reload / timer ticks ────────────────────────────────────────────
    newPlayer = tickReload(newPlayer, newPlayer.globalFireRateModifier) as Player;
    newPlayer.allies = newPlayer.allies.map(a =>
      tickReload(a, newPlayer.globalFireRateModifier) as Ally,
    );
    if (newPlayer.playerHitTimer  > 0) newPlayer.playerHitTimer--;
    if (newPlayer.shieldAbilityTimer > 0) newPlayer.shieldAbilityTimer--;

    // ── 5. Player & ally shoot ─────────────────────────────────────────────
    let newProjectiles    = [...store.projectiles];
    let newMuzzleFlashes  = [...store.muzzleFlashes];

    const viewport: Size = { width: store.gameArea.width, height: store.gameArea.height };

    const shootDir = this._computeShootDir(newPlayer, store, newCamera, viewport);
    if (shootDir) newPlayer = { ...newPlayer, lastShootingDirection: shootDir };
    if (shootDir) {
      // OVERCLOCK: +50% damage below 30% HP
      const shootSource = isOverclock ? { ...newPlayer, damage: newPlayer.damage * 1.5 } : newPlayer;
      const result = playerShoot(shootSource, shootDir, newPlayer.globalFireRateModifier);
      newPlayer = { ...newPlayer, shootTimer: result.player.shootTimer, ammoLeftInClip: result.player.ammoLeftInClip, currentReloadTimer: result.player.currentReloadTimer, lastShootingDirection: shootDir };
      newProjectiles.push(...result.projectiles);
      if (result.muzzleFlash) newMuzzleFlashes.push(result.muzzleFlash);
      if (result.projectiles.length > 0) {
        const ct = newPlayer.championType;
        if      (ct === AllyType.SHOTGUN)     AudioSystem.play('shoot_shotgun');
        else if (ct === AllyType.SNIPER)      AudioSystem.play('shoot_sniper');
        else if (ct === AllyType.RPG_SOLDIER) AudioSystem.play('shoot_rpg');
        else if (ct === AllyType.FLAMER)      AudioSystem.play('shoot_flamer');
        else if (ct === AllyType.MINIGUNNER)  AudioSystem.play('shoot_minigun');
        else if (ct === AllyType.RIFLEMAN)    AudioSystem.play('shoot_rifle');
        else                                   AudioSystem.play('shoot_gun_guy');
      }
    }

    // FORMATION BONUS: 4+ allies → fire rate +25%
    const formBonus = newPlayer.allies.length >= 4 ? 1.25 : 1.0;
    let allyShootSoundsThisFrame = 0;
    newPlayer.allies = newPlayer.allies.map(ally => {
      const dir = this._computeAllyShootDir(ally, store, newCamera, viewport);
      if (!dir) return ally;
      const res = allyShoot({ ...ally, lastShootingDirection: dir }, dir, newPlayer.globalFireRateModifier * formBonus, newPlayer.globalDamageModifier);
      newProjectiles.push(...res.projectiles);
      if (res.muzzleFlash) newMuzzleFlashes.push(res.muzzleFlash);
      if (res.projectiles.length > 0 && allyShootSoundsThisFrame < 2) {
        AudioSystem.play(allyShootSound(ally.allyType));
        allyShootSoundsThisFrame++;
      }
      return { ...res.ally, lastShootingDirection: dir };
    });

    // ── 5.5. Enemy movement ────────────────────────────────────────────────
    // Pre-compute target list once — avoids O(allies) array allocation per enemy
    const allTargets: Array<Player | Ally> = [newPlayer, ...newPlayer.allies];
    let newEnemies: Enemy[] = store.enemies.map(enemy => {
      let nearestTarget: Player | Ally = newPlayer;
      let nearestDist = Infinity;
      for (const t of allTargets) {
        const d = distanceBetweenPoints(getCenter(t), getCenter(enemy));
        if (d < nearestDist) { nearestDist = d; nearestTarget = t; }
      }
      const tc = getCenter(nearestTarget);
      const ec = getCenter(enemy);
      const edx = tc.x - ec.x, edy = tc.y - ec.y;
      const dist = Math.sqrt(edx * edx + edy * edy);
      const minDist =
        enemy.enemyType === EnemyType.RANGED_SHOOTER ? 300 :
        enemy.enemyType === EnemyType.ROCKET_TANK     ? 350 :
        enemy.enemyType === EnemyType.ENEMY_SNIPER    ? 450 : 0;
      let moveX = 0, moveY = 0;
      if (dist > 1) {
        const nx = edx / dist, ny = edy / dist;
        if (dist > minDist) { moveX = nx * enemy.speed; moveY = ny * enemy.speed; }
        else if (dist < minDist * 0.8 && minDist > 0) { moveX = -nx * enemy.speed; moveY = -ny * enemy.speed; }
        if (enemy.enemyType === EnemyType.ELECTRIC_DRONE && dist < 180) {
          moveX += -ny * enemy.speed * 0.5; moveY += nx * enemy.speed * 0.5;
        }
      }
      return {
        ...enemy,
        x: Math.max(0, Math.min(enemy.x + moveX, store.worldArea.width  - enemy.width)),
        y: Math.max(0, Math.min(enemy.y + moveY, store.worldArea.height - enemy.height)),
        velocity: { x: moveX, y: moveY },
        attackTimer: Math.max(0, enemy.attackTimer - 1),
        hitTimer:    enemy.hitTimer != null && enemy.hitTimer > 0 ? enemy.hitTimer - 1 : 0,
        aoeTimer:    enemy.aoeTimer    != null ? Math.max(0, enemy.aoeTimer    - 1) : undefined,
      };
    });

    // ── 5.6. Boss phase 2 (≤50% HP → enrage) ─────────────────────────────
    let newDamageTexts = [...store.damageTexts];
    let newCamShake = store.cameraShake;
    const playerHealthBeforeHit = newPlayer.health;
    let bossJustTransitioned = false;
    newEnemies = newEnemies.map(enemy => {
      if (enemy.enemyType !== EnemyType.BOSS || enemy.bossPhase === 2) return enemy;
      const hpRatio = enemy.maxHealth > 0 ? enemy.health / enemy.maxHealth : 1;
      if (hpRatio > 0.5) return enemy;
      bossJustTransitioned = true;
      AudioSystem.play('boss_spawn');
      newCamShake = { intensity: 12, duration: 35, timer: 35 };
      newDamageTexts.push({
        id: uuidv4(), text: '⚠ PHASE 2 ⚠',
        x: enemy.x + enemy.width / 2, y: enemy.y - 36,
        timer: 180, color: '#FF2055', velocityY: -0.5,
        fontSize: 22, fontWeight: 'bold',
      });
      return {
        ...enemy, bossPhase: 2,
        speed: enemy.speed * 1.8,
        attackCooldown: Math.max(20, Math.floor(enemy.attackCooldown * 0.5)),
        aoeCooldown: enemy.aoeCooldown != null ? Math.max(30, Math.floor(enemy.aoeCooldown * 0.6)) : enemy.aoeCooldown,
        aoeTimer: ENEMY_BOSS_WARN_TICKS,
      };
    });
    if (bossJustTransitioned) {
      for (let bi = 0; bi < 2; bi++) {
        newEnemies.push(createEnemy(store.round, store.worldArea, EnemyType.MELEE_GRUNT));
      }
    }

    // ── 6. Enemy melee + ranged attacks ────────────────────────────────────
    const RANGED_ENEMY_TYPES = new Set([
      EnemyType.RANGED_SHOOTER, EnemyType.ROCKET_TANK, EnemyType.ENEMY_SNIPER,
    ]);
    // Re-use allTargets (same composition as step 5.5 — allTargets was computed before any melee mutation)
    const rangedTargets = allTargets;

    newEnemies = newEnemies.map(enemy => {      // ── Boss: fires ranged projectiles (phase 1: single, phase 2: 3-way spread) ──
      if (enemy.enemyType === EnemyType.BOSS) {
        if (enemy.attackTimer === 0) {
          let nearestTarget: Player | Ally = newPlayer;
          let nearestDist = Infinity;
          for (const t of rangedTargets) {
            const d = distanceBetweenGameObjects(enemy, t);
            if (d < nearestDist) { nearestDist = d; nearestTarget = t; }
          }
          if (nearestDist <= enemy.attackRange) {
            const bec = getCenter(enemy);
            const btc = getCenter(nearestTarget);
            const ddx = btc.x - bec.x, ddy = btc.y - bec.y;
            const dlen = Math.sqrt(ddx * ddx + ddy * ddy);
            if (dlen > 0) {
              const nx = ddx / dlen, ny = ddy / dlen;
              const angleOffsets = enemy.bossPhase === 2
                ? [-28 * Math.PI / 180, 0, 28 * Math.PI / 180]
                : [0];
              for (const aOff of angleOffsets) {
                const bdx = nx * Math.cos(aOff) - ny * Math.sin(aOff);
                const bdy = nx * Math.sin(aOff) + ny * Math.cos(aOff);
                newProjectiles.push({
                  id: uuidv4(),
                  x: bec.x - RPG_PROJECTILE_SIZE.width / 2,
                  y: bec.y - RPG_PROJECTILE_SIZE.height / 2,
                  width: RPG_PROJECTILE_SIZE.width, height: RPG_PROJECTILE_SIZE.height,
                  velocity: { x: bdx * ENEMY_BOSS_PROJECTILE_SPEED, y: bdy * ENEMY_BOSS_PROJECTILE_SPEED },
                  damage: enemy.attackDamage,
                  ownerId: enemy.id, isPlayerProjectile: false,
                  color: UI_ACCENT_CRITICAL, causesShake: true,
                } as Projectile);
              }
              return { ...enemy, attackTimer: enemy.attackCooldown };
            }
          }
        }
        return enemy;
      }
      // ── Ranged enemies: fire a visible projectile ─────────────────────────
      if (RANGED_ENEMY_TYPES.has(enemy.enemyType)) {
        if (enemy.attackTimer === 0) {
          let nearestTarget: Player | Ally = newPlayer;
          let nearestDist = Infinity;
          for (const t of rangedTargets) {
            const d = distanceBetweenGameObjects(enemy, t);
            if (d < nearestDist) { nearestDist = d; nearestTarget = t; }
          }
          if (nearestDist <= enemy.attackRange) {
            const ec = getCenter(enemy);
            const tc = getCenter(nearestTarget);
            const dx = tc.x - ec.x, dy = tc.y - ec.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
              const nx = dx / dist, ny = dy / dist;
              const isRPG = enemy.enemyType === EnemyType.ROCKET_TANK;
              const pw  = isRPG ? RPG_PROJECTILE_SIZE.width  : PROJECTILE_SIZE.width;
              const ph  = isRPG ? RPG_PROJECTILE_SIZE.height : PROJECTILE_SIZE.height;
              const spd = isRPG ? ENEMY_ROCKET_TANK_PROJECTILE_SPEED : ENEMY_PROJECTILE_SPEED;
              newProjectiles.push({
                id: uuidv4(),
                x: ec.x - pw / 2, y: ec.y - ph / 2,
                width: pw, height: ph,
                velocity: { x: nx * spd, y: ny * spd },
                damage: enemy.attackDamage,
                ownerId: enemy.id,
                isPlayerProjectile: false,
                color: UI_ACCENT_CRITICAL,
                causesShake: isRPG,
                aoeRadius: isRPG ? ENEMY_ROCKET_TANK_AOE_RADIUS : undefined,
              } as Projectile);
              return { ...enemy, attackTimer: enemy.attackCooldown };
            }
          }
        }
        return enemy;
      }

      // ── Melee enemies: apply damage on direct contact ─────────────────────
      const prevPlayerHealth = newPlayer.health;
      const meleeP = enemyMeleeAttack(enemy, newPlayer, true, store.shieldZones);
      if (meleeP.target.health < prevPlayerHealth) {
        newPlayer = { ...meleeP.target as Player };
        const dmg = Math.round(prevPlayerHealth - meleeP.target.health);
        newDamageTexts.push({
          id: uuidv4(),
          text: `-${dmg}`,
          x: newPlayer.x + newPlayer.width  / 2 + (Math.random() * 20 - 10),
          y: newPlayer.y - 8,
          timer: 45,
          color: UI_ACCENT_CRITICAL,
          velocityY: -1.2,
          fontSize: 14,
          fontWeight: 'bold',
        });
        AudioSystem.play('player_hit');
      }
      // Allies
      newPlayer.allies = newPlayer.allies.map(ally => {
        const prevHealth = ally.health;
        const meleeA = enemyMeleeAttack(meleeP.enemy, ally, false, store.shieldZones);
        return meleeA.target.health < prevHealth ? { ...meleeA.target as Ally } : ally;
      });
      return meleeP.enemy;
    });

    // ── 6.5. Boss / Drone AoE pulse ───────────────────────────────────
    newEnemies = newEnemies.map(enemy => {
      if (enemy.aoeDamage == null || enemy.aoeTimer == null || enemy.aoeTimer > 0) return enemy;
      if (enemy.health <= 0) return enemy;
      const aoeEc = getCenter(enemy);
      const aoeR  = enemy.aoeRadius ?? 0;
      // Hit player
      if (distanceBetweenPoints(aoeEc, getCenter(newPlayer)) <= aoeR &&
          !isInsideShieldZone(newPlayer, store.shieldZones)) {
        newPlayer = { ...newPlayer, health: newPlayer.health - enemy.aoeDamage, playerHitTimer: PLAYER_HIT_FLASH_DURATION_TICKS };
        newDamageTexts.push({
          id: uuidv4(), text: `-${enemy.aoeDamage}`,
          x: newPlayer.x + newPlayer.width / 2 + (Math.random() * 20 - 10), y: newPlayer.y - 10,
          timer: 50, color: UI_ACCENT_CRITICAL, velocityY: -1.4, fontSize: 15, fontWeight: 'bold',
        });
        AudioSystem.play('player_hit');
      }
      // Hit allies
      newPlayer.allies = newPlayer.allies.map(ally =>
        distanceBetweenPoints(aoeEc, getCenter(ally)) <= aoeR
          ? { ...ally, health: ally.health - enemy.aoeDamage! }
          : ally,
      );
      // Camera shake for boss pulse
      if (enemy.enemyType === EnemyType.BOSS) {
        newCamShake = { intensity: 8, duration: 22, timer: 22 };
        AudioSystem.play('airstrike_impact');
      }
      return { ...enemy, aoeTimer: enemy.aoeCooldown! };
    });

    // ── 7. Projectile system ────────────────────────────────────
    // Hard cap: prevents O(P×E) collision cost from exploding at high wave counts
    // Drop the oldest (front of array) when over limit
    if (newProjectiles.length > 120) newProjectiles = newProjectiles.slice(newProjectiles.length - 120);
    const projResult = processProjectiles(
      newProjectiles, newEnemies, newPlayer, store.shieldZones,
      newCamera, viewport, !isTutorial || store.tutorialStep >= 1,
    );
    newProjectiles = projResult.remainingProjectiles;
    newEnemies     = projResult.enemies;
    newPlayer      = { ...newPlayer, ...projResult.player };
    let newParticles     = [...store.effectParticles, ...projResult.newEffectParticles];
    newDamageTexts = [...newDamageTexts, ...projResult.newDamageTexts];
    let newChainEffects  = [...store.chainLightningEffects, ...projResult.newChainLightningEffects];
    newCamShake = projResult.cameraShake ?? newCamShake;
    // Hard caps on VFX arrays to prevent render-loop overload
    if (newParticles.length   > 50)  newParticles   = newParticles.slice(newParticles.length - 50);
    if (newDamageTexts.length > 35)  newDamageTexts = newDamageTexts.slice(newDamageTexts.length - 35);
    // SFX: hits, chain lightning
    if (projResult.hitCount > 0)                         AudioSystem.play('enemy_hit');
    if (projResult.newChainLightningEffects.length > 0)  AudioSystem.play('chain_lightning');
    if (projResult.playerHitByProjectile)                AudioSystem.play('player_hit');
    // Low-health danger mode: music changes below 25 % HP
    const postHpRatio = newPlayer.maxHealth > 0 ? newPlayer.health / newPlayer.maxHealth : 1;
    AudioSystem.setDangerMode(newPlayer.health > 0 && postHpRatio < 0.25);

    // ── 8. Gold / coin magnet ──────────────────────────────────────────────
    let newGoldPiles = [...store.goldPiles, ...projResult.newGoldPiles];

    // Tick weapon drop TTLs (initialize here so kills in step 9 can push to it)
    let newWeaponDrops: WeaponDrop[] = (store.weaponDrops ?? [])
      .map(d => ({ ...d, timeToLive: d.timeToLive - DELTA_SECONDS }))
      .filter(d => d.timeToLive > 0);
    const newGoldPilesResult: typeof newGoldPiles = [];
    let goldCollectedThisFrame = false;
    for (const gp of newGoldPiles) {
      if (checkCollision(gp, newPlayer)) {
        // Physically touching — collect
        newPlayer = {
          ...newPlayer,
          gold: newPlayer.gold + gp.value,
          currentRunGoldEarned: newPlayer.currentRunGoldEarned + gp.value,
        };
        if (!goldCollectedThisFrame) {
          AudioSystem.play('gold_collect');
          goldCollectedThisFrame = true;
        }
      } else {
        const gpC  = getCenter(gp);
        const plC  = getCenter(newPlayer);
        const dist = distanceBetweenPoints(gpC, plC);
        if (dist < newPlayer.coinMagnetRange) {
          // Pull toward player — move each tick, collect next frame on collision
          const len   = dist || 1;
          const speed = Math.min(GOLD_MAGNET_PULL_SPEED, len);
          newGoldPilesResult.push({ ...gp, x: gp.x + (plC.x - gpC.x) / len * speed, y: gp.y + (plC.y - gpC.y) / len * speed });
        } else {
          newGoldPilesResult.push(gp);
        }
      }
    }
    newGoldPiles = newGoldPilesResult;

    // ── 9. Kill / combo accounting ─────────────────────────────────────────
    let { currentWaveEnemies, pendingInitialSpawns, initialSpawnTickCounter, specialEnemyState } = store;

    let comboState: ComboState = {
      comboCount:        newPlayer.comboCount,
      comboTimer:        store.comboTimer,
      airstrikeAvailable: store.airstrikeAvailable,
      airstrikeActive:   store.airstrikeActive,
    };

    // ── Combo break on player hit ──────────────────────────────────────────
    if (newPlayer.health < playerHealthBeforeHit && comboState.comboCount > 0) {
      comboState = { ...comboState, comboCount: 0, comboTimer: 0 };
      newPlayer  = { ...newPlayer, comboCount: 0 };
    }

    if (projResult.killCount > 0) {
      currentWaveEnemies += projResult.killCount;
      const prevCombo = comboState.comboCount;
      comboState = registerKill(comboState, projResult.killCount);
      newPlayer  = { ...newPlayer, comboCount: comboState.comboCount, currentRunKills: newPlayer.currentRunKills + projResult.killCount };
      AudioSystem.play('enemy_death');
      // Combo milestone sounds at 5, 10, 20
      const nc = comboState.comboCount;
      if ((nc >= 5 && prevCombo < 5) || (nc >= 10 && prevCombo < 10) || (nc >= 20 && prevCombo < 20)) {
        AudioSystem.play('combo_milestone');
      }
      // Boss kill
      if (projResult.bossKillCount > 0) AudioSystem.play('boss_death');
    }
    if (projResult.tankKillCount > 0) {
      newPlayer = { ...newPlayer, currentRunTanksDestroyed: (newPlayer.currentRunTanksDestroyed ?? 0) + projResult.tankKillCount };
    }

    // Weapon drop on kill (3% per kill, pool = unlocked ally types only)
    if (!isTutorial && projResult.killCount > 0 && projResult.newGoldPiles.length > 0) {
      if (Math.random() < WEAPON_DROP_KILL_CHANCE) {
        // Build droppable pool from currently unlocked ally types (skip GUN_GUY)
        const ALLY_TO_WEAPON: Partial<Record<AllyType, WeaponType>> = {
          [AllyType.SHOTGUN]:     WeaponType.SHOTGUN,
          [AllyType.RIFLEMAN]:    WeaponType.RIFLEMAN,
          [AllyType.SNIPER]:      WeaponType.SNIPER,
          [AllyType.RPG_SOLDIER]: WeaponType.RPG,
          [AllyType.FLAMER]:      WeaponType.FLAMER,
        };
        const pool = store.unlockedAllyTypes
          .map(t => ALLY_TO_WEAPON[t])
          .filter((w): w is WeaponType => w !== undefined);
        if (pool.length > 0) {
          const gp = projResult.newGoldPiles[Math.floor(Math.random() * projResult.newGoldPiles.length)];
          const wt = pool[Math.floor(Math.random() * pool.length)];
          newWeaponDrops.push(createWeaponDrop(wt, gp.x, gp.y, store.worldArea));
        }
      }
    }

    // ── 10. Airstrike tick ─────────────────────────────────────────────────
    let airstrikesPending   = store.airstrikesPending;
    let airstrikeSpawnTimer = store.airstrikeSpawnTimer;

    if (comboState.airstrikeActive && airstrikesPending > 0) {
      if (airstrikeSpawnTimer <= 0) {
        // Spawn missile from top of viewport
        const spawnX  = newCamera.x + Math.random() * viewport.width;
        const targetY = newCamera.y + viewport.height * (0.8 + Math.random() * 0.3);
        const spawnY  = newCamera.y - AIRSTRIKE_PROJECTILE_SIZE.height;
        const travelDist = Math.max(1, targetY - spawnY);
        const effectiveDmg = AIRSTRIKE_MISSILE_DAMAGE * (1 + newPlayer.airstrikeDamageModifier);
        const effectiveAoe = AIRSTRIKE_MISSILE_AOE_RADIUS * (1 + newPlayer.airstrikeAoeModifier);
        newProjectiles.push({
          id: uuidv4(),
          x: spawnX - AIRSTRIKE_PROJECTILE_SIZE.width / 2, y: spawnY,
          width: AIRSTRIKE_PROJECTILE_SIZE.width, height: AIRSTRIKE_PROJECTILE_SIZE.height,
          velocity: { x: 0, y: AIRSTRIKE_MISSILE_SPEED },
          damage: effectiveDmg, ownerId: newPlayer.id, isPlayerProjectile: true,
          color: UI_ACCENT_WARNING, causesShake: true, aoeRadius: effectiveAoe,
          isAirstrike: true, maxTravelDistance: travelDist, distanceTraveled: 0,
        } as any);
        airstrikesPending--;
        airstrikeSpawnTimer = AIRSTRIKE_MISSILE_INTERVAL_TICKS;
        if (airstrikesPending <= 0) {
          comboState = completeAirstrike(comboState);
          AudioSystem.play('airstrike_impact');
        }
      } else {
        airstrikeSpawnTimer--;
      }
    }
    newPlayer = { ...newPlayer, comboCount: comboState.comboCount, airstrikeAvailable: comboState.airstrikeAvailable, airstrikeActive: comboState.airstrikeActive, airstrikesPending, airstrikeSpawnTimer };

    // ── 11. Ally death + stranding ─────────────────────────────────────────
    const hadAlly = newPlayer.allies.length;
    // Track who was already stranded BEFORE this tick — only these can be recovered in step 12.
    const alreadyStrandedIds = new Set<string>(
      newPlayer.allies.filter(a => a.isStranded).map(a => a.id),
    );
    // Collect IDs of active allies that just died — they break the chain for those behind them.
    const dyingActiveIds = new Set<string>(
      newPlayer.allies.filter(a => a.health <= 0 && !a.isStranded).map(a => a.id),
    );
    // Propagate: if your leader is dying or being newly stranded, you get stranded too.
    const toStrand = new Set<string>(dyingActiveIds);
    let changed = true;
    while (changed) {
      changed = false;
      for (const a of newPlayer.allies) {
        if (!toStrand.has(a.id) && !a.isStranded && a.leaderId && toStrand.has(a.leaderId)) {
          toStrand.add(a.id);
          changed = true;
        }
      }
    }
    newPlayer.allies = newPlayer.allies
      .filter(a => a.health > 0)
      .map(a => {
        if (!a.isStranded && toStrand.has(a.id)) {
          return { ...a, isStranded: true, leaderId: null };
        }
        return a;
      });
    if (newPlayer.allies.length < hadAlly) AudioSystem.play('player_hit');

    // ── 12. Collectible ally pickup ────────────────────────────────────────
    let newCollectibles = [...store.collectibleAllies];
    newCollectibles = newCollectibles.filter(ca => {
      if (checkCollision(newPlayer, ca)) {
        addAllyToPlayer(newPlayer, ca.allyType, store.round, newPlayer.globalDamageModifier, newPlayer.globalFireRateModifier);
        AudioSystem.play('ally_collect');
        return false;
      }
      return true;
    });

    // Stranded ally recovery: only allies that were ALREADY stranded before this tick
    // can be recovered (prevents instant re-pickup the same tick a death occurs).
    newPlayer.allies = newPlayer.allies.map(a => {
      if (!a.isStranded) return a;
      if (!alreadyStrandedIds.has(a.id)) return a; // just stranded this tick — skip
      if (!checkCollision(newPlayer, a)) return a;
      // Attach to the tail of the active chain.
      const lastActive = [...newPlayer.allies].reverse().find(x => !x.isStranded);
      newPlayer.health = Math.min(newPlayer.maxHealth, newPlayer.health + ALLY_PICKUP_HEALTH_RESTORE);
      AudioSystem.play('ally_collect');
      return { ...a, isStranded: false, leaderId: lastActive ? lastActive.id : newPlayer.id };
    });

    // ── 12.5. Weapon drop pickup + held-weapon timer ───────────────────────
    const ALLY_TO_WEAPON_MAP: Partial<Record<AllyType, WeaponType>> = {
      [AllyType.SHOTGUN]:     WeaponType.SHOTGUN,
      [AllyType.RIFLEMAN]:    WeaponType.RIFLEMAN,
      [AllyType.SNIPER]:      WeaponType.SNIPER,
      [AllyType.RPG_SOLDIER]: WeaponType.RPG,
      [AllyType.FLAMER]:      WeaponType.FLAMER,
    };
    const WEAPON_TO_ALLY_MAP: Record<WeaponType, AllyType | undefined> = WEAPON_TO_ALLY;

    newWeaponDrops = newWeaponDrops.filter(drop => {
      if (!checkCollision(newPlayer, drop)) return true;
      const cfg = WEAPON_CONFIGS[drop.weaponType];
      // Snapshot current state only if not already holding a weapon
      const snapshot = newPlayer.weaponBaseSnapshot ?? {
        championType:           newPlayer.championType,
        damage:                 newPlayer.damage,
        shootCooldown:          newPlayer.shootCooldown,
        clipSize:               newPlayer.clipSize ?? GUN_GUY_CLIP_SIZE,
        reloadDuration:         newPlayer.reloadDuration ?? GUN_GUY_RELOAD_TIME,
        piercingRoundsLevel:    newPlayer.piercingRoundsLevel,
        projectileSpeedModifier: newPlayer.projectileSpeedModifier,
      };
      const weaponAllyType = WEAPON_TO_ALLY_MAP[drop.weaponType]; // e.g. AllyType.SHOTGUN
      newPlayer = {
        ...newPlayer,
        equippedWeapon:          drop.weaponType,
        weaponTimer:             WEAPON_HELD_TTL,
        weaponBaseSnapshot:      snapshot,
        // Set championType so player fires & looks exactly like the corresponding ally
        championType:            weaponAllyType,
        damage:                  cfg.damage,
        shootCooldown:           cfg.shootCooldown,
        clipSize:                cfg.clipSize,
        ammoLeftInClip:          cfg.clipSize,
        reloadDuration:          cfg.reloadDuration,
        currentReloadTimer:      0,
      };
      newDamageTexts.push({
        id: uuidv4(), text: `⚡ ${cfg.label}`,
        x: newPlayer.x + newPlayer.width / 2,
        y: newPlayer.y - 22,
        timer: 90, color: cfg.color, velocityY: -0.9,
        fontSize: 16, fontWeight: 'bold',
      });
      AudioSystem.play('ally_collect');
      return false;
    });

    // Tick held-weapon expiry
    if (!isTutorial && newPlayer.weaponTimer > 0) {
      newPlayer = { ...newPlayer, weaponTimer: newPlayer.weaponTimer - DELTA_SECONDS };
      if (newPlayer.weaponTimer <= 0 && newPlayer.weaponBaseSnapshot) {
        const snap = newPlayer.weaponBaseSnapshot;
        newPlayer = {
          ...newPlayer,
          equippedWeapon:          WeaponType.PISTOL,
          weaponTimer:             0,
          weaponBaseSnapshot:      undefined,
          // Restore original championType (may be undefined = GUN_GUY, or a chosen champion)
          championType:            snap.championType,
          damage:                  snap.damage,
          shootCooldown:           snap.shootCooldown,
          clipSize:                snap.clipSize,
          ammoLeftInClip:          snap.clipSize,
          reloadDuration:          snap.reloadDuration,
          currentReloadTimer:      0,
          piercingRoundsLevel:     snap.piercingRoundsLevel,
          projectileSpeedModifier: snap.projectileSpeedModifier,
        };
        newDamageTexts.push({
          id: uuidv4(), text: '🔫 PISTOL',
          x: newPlayer.x + newPlayer.width / 2,
          y: newPlayer.y - 20,
          timer: 75, color: '#00FFCC', velocityY: -0.6,
          fontSize: 14, fontWeight: '300',
        });
      }
    }

    // ── 13. Enemy spawn (gradual) ──────────────────────────────────────────
    if (!isTutorial && pendingInitialSpawns > 0) {
      initialSpawnTickCounter--;
      if (initialSpawnTickCounter <= 0) {
        const type = determineNextEnemyType(store.round, newEnemies, specialEnemyState);
        if (type) {
          newEnemies.push(createEnemy(store.round, store.worldArea, type));
          if (type === EnemyType.BOSS) AudioSystem.play('boss_spawn');
          pendingInitialSpawns--;
        }
        initialSpawnTickCounter = INITIAL_SPAWN_INTERVAL_TICKS;
      }
    }

    // ── 14. Ally collectible spawn ─────────────────────────────────────────
    let newNextAllySpawnTimer = store.nextAllySpawnTimer - DELTA_SECONDS;
    let nextAllyTypeForStore: AllyType | null = store.nextAllyType ?? null;
    if (newNextAllySpawnTimer <= 0 && !isTutorial) {
      const allTypes = store.unlockedAllyTypes;
      if (allTypes.length > 0) {
        const type = store.nextAllyType ?? allTypes[Math.floor(Math.random() * allTypes.length)];
        const ca = createCollectibleAlly(type, newPlayer, newCollectibles, store.worldArea);
        if (ca) newCollectibles.push(ca);
        nextAllyTypeForStore = allTypes[Math.floor(Math.random() * allTypes.length)];
      }
      newNextAllySpawnTimer = ALLY_SPAWN_INTERVAL;
    }

    // ── 14.5. Timed weapon drop spawn ─────────────────────────────────────
    let newWeaponDropSpawnTimer = (store.weaponDropSpawnTimer ?? WEAPON_DROP_SPAWN_TIMER) - DELTA_SECONDS;
    if (newWeaponDropSpawnTimer <= 0 && !isTutorial) {
      const ALLY_TO_WPN: Partial<Record<AllyType, WeaponType>> = {
        [AllyType.SHOTGUN]:     WeaponType.SHOTGUN,
        [AllyType.RIFLEMAN]:    WeaponType.RIFLEMAN,
        [AllyType.SNIPER]:      WeaponType.SNIPER,
        [AllyType.RPG_SOLDIER]: WeaponType.RPG,
        [AllyType.FLAMER]:      WeaponType.FLAMER,
      };
      const pool = store.unlockedAllyTypes
        .map(t => ALLY_TO_WPN[t])
        .filter((w): w is WeaponType => w !== undefined);
      if (pool.length > 0) {
        const wt = pool[Math.floor(Math.random() * pool.length)];
        const spawnX = store.camera.x + 80 + Math.random() * Math.max(1, store.gameArea.width  - 160);
        const spawnY = store.camera.y + 80 + Math.random() * Math.max(1, store.gameArea.height - 160);
        newWeaponDrops.push(createWeaponDrop(wt, spawnX, spawnY, store.worldArea));
      }
      newWeaponDropSpawnTimer = WEAPON_DROP_SPAWN_TIMER;
    }

    // ── 15. Wave progression ───────────────────────────────────────────────
    let newGameStatus: GameStatus = store.gameStatus;
    let nextRoundTimer = store.nextRoundTimer;

    if (newGameStatus === 'PLAYING') {
      const allEnemiesSpawned = pendingInitialSpawns <= 0;
      if (allEnemiesSpawned && newEnemies.length === 0) {
        // Wave cleared — start inter-wave countdown
        nextRoundTimer = INTER_WAVE_DELAY_SECONDS;
        AudioSystem.play('wave_start');
        newGameStatus = 'ROUND_COMPLETE';
      }
    } else if (newGameStatus === 'ROUND_COMPLETE') {
      // Count down; fire next round when timer expires
      nextRoundTimer = Math.max(0, nextRoundTimer - DELTA_SECONDS);
      if (nextRoundTimer <= 0) {
        useGameStore.getState().startNewRound(newPlayer, store.round + 1);
        return; // startNewRound sets its own full state
      }
    }

    // ── 16. Player death ───────────────────────────────────────────────────
    if (newPlayer.health <= 0 && newGameStatus !== 'GAME_OVER_PENDING' && newGameStatus !== 'GAME_OVER') {
      newGameStatus = 'GAME_OVER_PENDING';
    }

    // ── 17. Effects tick ───────────────────────────────────────────────────
    newDamageTexts  = tickDamageTexts(newDamageTexts);
    newMuzzleFlashes = tickMuzzleFlashes(newMuzzleFlashes);
    newParticles    = tickEffectParticles(newParticles);
    const shieldResult = tickShieldZones(store.shieldZones, newParticles);
    const newShieldZones = shieldResult.zones;
    newParticles = shieldResult.newParticles;
    newChainEffects = tickChainLightning(newChainEffects);
    const shakeResult = tickCameraShake(newCamShake, newCamera, store.gameArea);
    newCamShake      = shakeResult.shake;
    const shakenCamera = shakeResult.camera;

    // ── 18. Combo tick ─────────────────────────────────────────────────────
    const timedCombo = tickCombo(comboState);
    newPlayer = { ...newPlayer, comboCount: timedCombo.comboCount };

    // ── 19. Wave title ─────────────────────────────────────────────────────
    let waveTitleTimer = store.waveTitleTimer > 0 ? store.waveTitleTimer - 1 : 0;

    // ── 20. Patch store ────────────────────────────────────────────────────
    useGameStore.getState().applyTickResult({
      player:               newPlayer,
      enemies:              newEnemies,
      projectiles:          newProjectiles,
      goldPiles:            newGoldPiles,
      collectibleAllies:    newCollectibles,
      damageTexts:          newDamageTexts,
      muzzleFlashes:        newMuzzleFlashes,
      effectParticles:      newParticles,
      shieldZones:          newShieldZones,
      chainLightningEffects: newChainEffects,
      cameraShake:          newCamShake,
      camera:               shakenCamera,
      gameStatus:           newGameStatus as GameStatus,
      currentWaveEnemies,
      pendingInitialSpawns,
      initialSpawnTickCounter,
      specialEnemyState,
      nextRoundTimer,
      nextAllySpawnTimer:   newNextAllySpawnTimer,
      nextAllyType:         nextAllyTypeForStore,
      airstrikeAvailable:   comboState.airstrikeAvailable,
      airstrikeActive:      comboState.airstrikeActive,
      airstrikesPending,
      airstrikeSpawnTimer,
      comboTimer:           timedCombo.comboTimer,
      waveTitleTimer,
      weaponDrops:          newWeaponDrops,
      weaponDropSpawnTimer: newWeaponDropSpawnTimer,
    });
  }

  // ── Game over pending tick ─────────────────────────────────────────────────
  private _tickGameOverPending(store: ReturnType<typeof useGameStore.getState>) {
    const next = store.gameOverPendingTimer + 1;
    if (next >= 180) { // 3 s at 60fps
      useGameStore.getState().applyTickResult({ gameStatus: 'GAME_OVER', gameOverPendingTimer: 0 });
    } else {
      useGameStore.getState().applyTickResult({ gameOverPendingTimer: next });
    }
  }

  // ── Shoot direction helpers ────────────────────────────────────────────────
  private _computeShootDir(
    player: Player,
    store: ReturnType<typeof useGameStore.getState>,
    camera: Position,
    viewport: Size,
  ): Position | null {
    // Always auto-aim at the nearest enemy (like allies)
    const target = findClosestEnemy(player, store.enemies, Infinity, camera, viewport, false);
    if (!target) return null;
    const cx = player.x + player.width  / 2;
    const cy = player.y + player.height / 2;
    const dx = target.x + target.width  / 2 - cx;
    const dy = target.y + target.height / 2 - cy;
    const len = Math.sqrt(dx * dx + dy * dy);
    return len > 0 ? { x: dx / len, y: dy / len } : null;
  }

  private _computeAllyShootDir(
    ally: Ally,
    store: ReturnType<typeof useGameStore.getState>,
    camera: Position,
    viewport: Size,
  ): Position | null {
    const target = findClosestEnemy(ally, store.enemies, ally.range, camera, viewport, false);
    if (!target) return null;
    const cx = ally.x + ally.width  / 2;
    const cy = ally.y + ally.height / 2;
    const dx = target.x + target.width  / 2 - cx;
    const dy = target.y + target.height / 2 - cy;
    const len = Math.sqrt(dx * dx + dy * dy);
    return len > 0 ? { x: dx / len, y: dy / len } : null;
  }
}

// ─── Singleton ─────────────────────────────────────────────────────────────
export const gameLoop = new GameLoop();
