/**
 * GameLoop — requestAnimationFrame orchestrator
 *
 * Runs all pure systems each frame, then patches the Zustand store.
 * Completely decoupled from React's render cycle.
 *
 * Tick rate target: 60 fps (16.67 ms/frame).
 */
import { v4 as uuidv4 } from 'uuid';
import type { Player, Ally, Position, Size, GameStatus, Enemy, Projectile } from '../types';
import { EnemyType } from '../types';
import type { InputSnapshot } from '../systems/MovementSystem';
import type { ComboState } from '../systems/ComboSystem';

import { applyPlayerMovement, updateCamera, updateAllyMovement, chainAllyLeaders } from '../systems/MovementSystem';
import { processProjectiles } from '../systems/ProjectileSystem';
import { playerShoot, allyShoot, tickReload, enemyMeleeAttack, findClosestEnemy } from '../systems/CombatSystem';
import { createEnemy, createCollectibleAlly, determineNextEnemyType } from '../systems/SpawnSystem';
import { INITIAL_SPAWN_INTERVAL_TICKS } from '../systems/WaveSystem';
import { tickCombo, registerKill, completeAirstrike } from '../systems/ComboSystem';
import {
  tickDamageTexts, tickMuzzleFlashes, tickEffectParticles,
  tickShieldZones, tickChainLightning, tickCameraShake,
} from '../systems/EffectsSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { addAllyToPlayer } from '../entities/createAlly';

import { useGameStore } from '../stores/gameStore';
import { useUiStore } from '../stores/uiStore';

import { checkCollision, distanceBetweenPoints, distanceBetweenGameObjects, getCenter } from '../utils/geometry';
import {
  AIRSTRIKE_MISSILE_DAMAGE, AIRSTRIKE_MISSILE_AOE_RADIUS, AIRSTRIKE_MISSILE_SPEED,
  AIRSTRIKE_PROJECTILE_SIZE, AIRSTRIKE_MISSILE_INTERVAL_TICKS,
  ENEMY_PROJECTILE_SPEED, RPG_PROJECTILE_SIZE, PROJECTILE_SIZE,
} from '../constants/player';
import {
  ENEMY_ROCKET_TANK_PROJECTILE_SPEED, ENEMY_ROCKET_TANK_AOE_RADIUS,
} from '../constants/enemy';
import { ALLY_SPAWN_INTERVAL } from '../constants/ally';
import { GOLD_MAGNET_PULL_SPEED } from '../constants/player';
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

  // ── Start ──────────────────────────────────────────────────────────────────
  start() {
    if (this.rafId !== null) return;
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
  }

  // ── Inner rAF callback ─────────────────────────────────────────────────────
  private _loop = (timestamp: number) => {
    this.rafId = requestAnimationFrame(this._loop);

    const elapsed = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;
    this.accumulator += elapsed;

    // Fixed-step update (up to 3 catch-up ticks to avoid spiral of death)
    let ticks = 0;
    while (this.accumulator >= TARGET_FRAME_MS && ticks < 3) {
      this._tick();
      this.accumulator -= TARGET_FRAME_MS;
      ticks++;
    }

    // FPS counter (sampled each call)
    if (ticks > 0 && elapsed > 0) {
      useUiStore.getState().setFps(Math.min(Math.round(1000 / elapsed), 999));
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
    };

    // ── 2. Player movement ─────────────────────────────────────────────────
    let newPlayer: Player = {
      ...applyPlayerMovement({ ...store.player }, input, store.gameArea, store.camera),
      allies: store.player.allies.map(a => ({ ...a })),
    };

    const newCamera: Position = updateCamera(
      { ...store.camera }, newPlayer, store.gameArea,
    );

    // ── 3. Ally movement ───────────────────────────────────────────────────
    chainAllyLeaders(newPlayer.allies, newPlayer.id);
    newPlayer.allies = newPlayer.allies.map((ally, idx) => {
      const leaders: Array<Player | Ally> = idx === 0
        ? [newPlayer]
        : [newPlayer.allies[idx - 1]];
      return updateAllyMovement({ ...ally }, leaders, newPlayer.squadSpacingMultiplier);
    });

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
      const result = playerShoot(newPlayer, shootDir, newPlayer.globalFireRateModifier);
      newPlayer = result.player;
      newProjectiles.push(...result.projectiles);
      if (result.muzzleFlash) newMuzzleFlashes.push(result.muzzleFlash);
    }

    newPlayer.allies = newPlayer.allies.map(ally => {
      const dir = this._computeAllyShootDir(ally, store, newCamera, viewport);
      if (!dir) return ally;
      const res = allyShoot({ ...ally, lastShootingDirection: dir }, dir, newPlayer.globalFireRateModifier, newPlayer.globalDamageModifier);
      newProjectiles.push(...res.projectiles);
      if (res.muzzleFlash) newMuzzleFlashes.push(res.muzzleFlash);
      return { ...res.ally, lastShootingDirection: dir };
    });

    // ── 5.5. Enemy movement ────────────────────────────────────────────────
    let newEnemies: Enemy[] = store.enemies.map(enemy => {
      const allTargets: Array<Player | Ally> = [newPlayer, ...newPlayer.allies];
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
        aoeTimer:    enemy.aoeTimer    != null ? Math.max(0, enemy.aoeTimer    - 1) : undefined,
      };
    });

    // ── 6. Enemy melee + ranged attacks ────────────────────────────────────
    let newDamageTexts = [...store.damageTexts];
    const RANGED_ENEMY_TYPES = new Set([
      EnemyType.RANGED_SHOOTER, EnemyType.ROCKET_TANK, EnemyType.ENEMY_SNIPER,
    ]);

    newEnemies = newEnemies.map(enemy => {
      // ── Ranged enemies: fire a visible projectile ─────────────────────────
      if (RANGED_ENEMY_TYPES.has(enemy.enemyType)) {
        if (enemy.attackTimer === 0) {
          const allTargets: Array<Player | Ally> = [newPlayer, ...newPlayer.allies];
          let nearestTarget: Player | Ally = newPlayer;
          let nearestDist = Infinity;
          for (const t of allTargets) {
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

    // ── 7. Projectile system ───────────────────────────────────────────────
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
    let newCamShake      = projResult.cameraShake ?? store.cameraShake;

    // ── 8. Gold / coin magnet ──────────────────────────────────────────────
    let newGoldPiles = [...store.goldPiles, ...projResult.newGoldPiles];
    const newGoldPilesResult: typeof newGoldPiles = [];
    for (const gp of newGoldPiles) {
      if (checkCollision(gp, newPlayer)) {
        // Physically touching — collect
        newPlayer = {
          ...newPlayer,
          gold: newPlayer.gold + gp.value,
          currentRunGoldEarned: newPlayer.currentRunGoldEarned + gp.value,
        };
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

    if (projResult.killCount > 0) {
      currentWaveEnemies += projResult.killCount;
      comboState = registerKill(comboState, projResult.killCount);
      newPlayer  = { ...newPlayer, comboCount: comboState.comboCount, currentRunKills: newPlayer.currentRunKills + projResult.killCount };
      AudioSystem.play('enemy_death');
    }
    if (projResult.tankKillCount > 0) {
      newPlayer = { ...newPlayer, currentRunTanksDestroyed: (newPlayer.currentRunTanksDestroyed ?? 0) + projResult.tankKillCount };
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

    // ── 11. Ally death ─────────────────────────────────────────────────────
    const hadAlly = newPlayer.allies.length;
    newPlayer.allies = newPlayer.allies.filter(a => a.health > 0);
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

    // ── 13. Enemy spawn (gradual) ──────────────────────────────────────────
    if (!isTutorial && pendingInitialSpawns > 0) {
      initialSpawnTickCounter--;
      if (initialSpawnTickCounter <= 0) {
        const type = determineNextEnemyType(store.round, newEnemies, specialEnemyState);
        if (type) {
          newEnemies.push(createEnemy(store.round, store.worldArea, type));
          pendingInitialSpawns--;
        }
        initialSpawnTickCounter = INITIAL_SPAWN_INTERVAL_TICKS;
      }
    }

    // ── 14. Ally collectible spawn ─────────────────────────────────────────
    let newNextAllySpawnTimer = store.nextAllySpawnTimer - DELTA_SECONDS;
    if (newNextAllySpawnTimer <= 0 && !isTutorial) {
      const allTypes = store.unlockedAllyTypes;
      if (allTypes.length > 0) {
        const type = allTypes[Math.floor(Math.random() * allTypes.length)];
        const ca = createCollectibleAlly(type, newPlayer, newCollectibles, store.worldArea);
        if (ca) newCollectibles.push(ca);
      }
      newNextAllySpawnTimer = ALLY_SPAWN_INTERVAL;
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
      airstrikeAvailable:   comboState.airstrikeAvailable,
      airstrikeActive:      comboState.airstrikeActive,
      airstrikesPending,
      airstrikeSpawnTimer,
      comboTimer:           timedCombo.comboTimer,
      waveTitleTimer,
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
