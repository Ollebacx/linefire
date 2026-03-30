/**
 * ProjectileSystem
 * Moves projectiles, handles collisions, AoE explosions, chain lightning.
 * Pure function – returns new state slices.
 */
import { v4 as uuidv4 } from 'uuid';
import type {
  Projectile, Enemy, Player, Ally, Position, ShieldZone,
  DamageText, EffectParticle, ChainLightningEffect, CameraShakeState, GoldPile,
} from '../types';
import { EnemyType } from '../types';
import { checkCollision, getCenter, distanceBetweenGameObjects, distanceBetweenPoints } from '../utils/geometry';
import { WORLD_AREA } from '../constants/world';
import { GOLD_PILE_SIZE, GOLD_VALUE } from '../constants/player';
import { UI_ACCENT_WARNING, UI_ACCENT_LIGHTNING } from '../constants/ui';
import {
  AIRSTRIKE_IMPACT_SHAKE_INTENSITY, AIRSTRIKE_IMPACT_SHAKE_DURATION,
  CHAIN_LIGHTNING_VISUAL_DURATION, PLAYER_HIT_FLASH_DURATION_TICKS,
} from '../constants/player';
import { RPG_IMPACT_CAMERA_SHAKE_INTENSITY, RPG_IMPACT_CAMERA_SHAKE_DURATION } from '../constants/enemy';
import {
  DAMAGE_TEXT_DURATION_TICKS, DAMAGE_TEXT_FLOAT_SPEED,
  DAMAGE_TEXT_ENEMY_HIT_COLOR, DAMAGE_TEXT_ENEMY_KILL_COLOR,
  DAMAGE_TEXT_FONT_SIZE_HIT, DAMAGE_TEXT_FONT_SIZE_KILL,
  DAMAGE_TEXT_FONT_WEIGHT_HIT, DAMAGE_TEXT_FONT_WEIGHT_KILL,
  EFFECT_PARTICLE_DURATION_TICKS, EFFECT_PARTICLE_BASE_SIZE,
  EFFECT_PARTICLE_SPEED_MIN, EFFECT_PARTICLE_SPEED_MAX,
  EFFECT_PARTICLE_COUNT_IMPACT, EFFECT_PARTICLE_COUNT_DEATH,
  EFFECT_PARTICLE_COLOR_IMPACT, EFFECT_PARTICLE_COLOR_DEATH_PRIMARY, EFFECT_PARTICLE_COLOR_DEATH_SECONDARY,
} from '../constants/effects';

export interface ProjectileSystemResult {
  remainingProjectiles: Projectile[];
  enemies: Enemy[];
  player: Player;
  newGoldPiles: GoldPile[];
  newDamageTexts: DamageText[];
  newEffectParticles: EffectParticle[];
  newChainLightningEffects: ChainLightningEffect[];
  cameraShake: CameraShakeState | null;
  killCount: number;
  tankKillCount: number;
  comboIncrement: number;
}

export function processProjectiles(
  projectiles: Projectile[],
  enemies: Enemy[],
  player: Player,
  shieldZones: ShieldZone[],
  camera: Position,
  viewport: { width: number; height: number },
  isPlayerInteractive: boolean,
): ProjectileSystemResult {
  let currentEnemies = enemies.map(e => ({ ...e }));
  let currentPlayer = { ...player, allies: player.allies.map(a => ({ ...a })) };

  const remainingProjectiles: Projectile[] = [];
  const newGoldPiles: GoldPile[] = [];
  const newDamageTexts: DamageText[] = [];
  const newEffectParticles: EffectParticle[] = [];
  const newChainLightningEffects: ChainLightningEffect[] = [];
  const aoeExplosions: { proj: Projectile; center: Position }[] = [];
  let cameraShake: CameraShakeState | null = null;
  let killCount = 0;
  let tankKillCount = 0;
  let comboIncrement = 0;

  const isShielded = (target: { x: number; y: number; width: number; height: number }) =>
    currentPlayer.shieldAbilityUnlocked &&
    shieldZones.some(sz => distanceBetweenPoints(getCenter(target as any), getCenter(sz)) <= sz.radius);

  const handleEnemyDeath = (enemy: Enemy) => {
    if (!isPlayerInteractive) return;
    killCount++;
    if (enemy.enemyType === EnemyType.ROCKET_TANK) tankKillCount++;
    comboIncrement++;
    const base = Math.ceil(enemy.points / GOLD_VALUE) * 2;
    const rand = 2 + Math.floor(Math.random() * 4);
    const ec = getCenter(enemy);
    for (let i = 0; i < base + rand; i++) {
      newGoldPiles.push({
        id: uuidv4(),
        x: ec.x - GOLD_PILE_SIZE.width / 2 + (Math.random() - 0.5) * enemy.width * 1.5,
        y: ec.y - GOLD_PILE_SIZE.height / 2 + (Math.random() - 0.5) * enemy.height * 1.5,
        ...GOLD_PILE_SIZE, value: GOLD_VALUE, color: UI_ACCENT_WARNING,
      });
    }
    newDamageTexts.push({
      id: uuidv4(), text: `+${enemy.points} PTS`,
      x: ec.x, y: ec.y - enemy.height / 2,
      timer: DAMAGE_TEXT_DURATION_TICKS, color: DAMAGE_TEXT_ENEMY_KILL_COLOR,
      velocityY: DAMAGE_TEXT_FLOAT_SPEED, fontSize: DAMAGE_TEXT_FONT_SIZE_KILL, fontWeight: DAMAGE_TEXT_FONT_WEIGHT_KILL,
    });
    for (let i = 0; i < EFFECT_PARTICLE_COUNT_DEATH; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = EFFECT_PARTICLE_SPEED_MIN + Math.random() * (EFFECT_PARTICLE_SPEED_MAX - EFFECT_PARTICLE_SPEED_MIN) * 1.5;
      newEffectParticles.push({
        id: uuidv4(), x: ec.x, y: ec.y,
        size: EFFECT_PARTICLE_BASE_SIZE + Math.random() * 3,
        color: Math.random() < 0.7 ? EFFECT_PARTICLE_COLOR_DEATH_PRIMARY : EFFECT_PARTICLE_COLOR_DEATH_SECONDARY,
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        timer: EFFECT_PARTICLE_DURATION_TICKS * 1.2, initialTimer: EFFECT_PARTICLE_DURATION_TICKS * 1.2, type: 'death',
      });
    }
  };

  for (const proj of projectiles) {
    let p = { ...proj };
    p.x += p.velocity.x;
    p.y += p.velocity.y;
    let removed = false;

    // Travel-distance limit
    if (p.maxTravelDistance !== undefined && p.distanceTraveled !== undefined) {
      p.distanceTraveled += Math.sqrt(p.velocity.x ** 2 + p.velocity.y ** 2);
      if (p.distanceTraveled >= p.maxTravelDistance) {
        removed = true;
        if (p.isAirstrike && p.aoeRadius) {
          const center = p.targetY ? { x: getCenter(p).x, y: p.targetY } : getCenter(p);
          aoeExplosions.push({ proj: p, center });
          if (p.causesShake) cameraShake = { intensity: AIRSTRIKE_IMPACT_SHAKE_INTENSITY, duration: AIRSTRIKE_IMPACT_SHAKE_DURATION, timer: AIRSTRIKE_IMPACT_SHAKE_DURATION };
        }
      }
    }

    // Out of bounds
    if (!removed && (p.x + p.width < -100 || p.x > WORLD_AREA.width + 100 || p.y + p.height < -100 || p.y > WORLD_AREA.height + 100)) {
      removed = true;
    }

    if (!removed) {
      if (p.isPlayerProjectile) {
        currentEnemies = currentEnemies.filter(enemy => {
          if (!checkCollision(p, enemy)) return true;

          const ec = getCenter(enemy);
          const dmg = p.damage;
          enemy.health -= dmg;

          newDamageTexts.push({
            id: uuidv4(), text: `-${dmg.toFixed(0)}`, x: ec.x, y: ec.y - enemy.height / 2,
            timer: DAMAGE_TEXT_DURATION_TICKS, color: DAMAGE_TEXT_ENEMY_HIT_COLOR,
            velocityY: DAMAGE_TEXT_FLOAT_SPEED, fontSize: DAMAGE_TEXT_FONT_SIZE_HIT, fontWeight: DAMAGE_TEXT_FONT_WEIGHT_HIT,
          });
          for (let i = 0; i < EFFECT_PARTICLE_COUNT_IMPACT; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = EFFECT_PARTICLE_SPEED_MIN + Math.random() * (EFFECT_PARTICLE_SPEED_MAX - EFFECT_PARTICLE_SPEED_MIN);
            newEffectParticles.push({
              id: uuidv4(), x: ec.x, y: ec.y, size: EFFECT_PARTICLE_BASE_SIZE + Math.random() * 2,
              color: EFFECT_PARTICLE_COLOR_IMPACT,
              velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
              timer: EFFECT_PARTICLE_DURATION_TICKS, initialTimer: EFFECT_PARTICLE_DURATION_TICKS, type: 'impact',
            });
          }

          // Chain lightning
          if (p.ownerId === currentPlayer.id && !p.isAirstrike && currentPlayer.chainLightningChance > 0 && (p.chainsLeft ?? 0) > 0 && Math.random() < currentPlayer.chainLightningChance) {
            let chainTarget: Enemy | null = null;
            let minChainDist = currentPlayer.chainRange;
            for (const other of currentEnemies) {
              if (other.id !== enemy.id && !(p.alreadyChainedTo ?? []).includes(other.id)) {
                const d = distanceBetweenGameObjects(enemy, other);
                if (d < minChainDist) { minChainDist = d; chainTarget = other; }
              }
            }
            if (chainTarget) {
              const chainDmg = p.damage * currentPlayer.chainDamageMultiplier;
              chainTarget.health -= chainDmg;
              newDamageTexts.push({
                id: uuidv4(), text: `-${chainDmg.toFixed(0)}`,
                x: getCenter(chainTarget).x, y: getCenter(chainTarget).y - chainTarget.height / 2,
                timer: DAMAGE_TEXT_DURATION_TICKS, color: UI_ACCENT_LIGHTNING,
                velocityY: DAMAGE_TEXT_FLOAT_SPEED, fontSize: DAMAGE_TEXT_FONT_SIZE_HIT - 1, fontWeight: DAMAGE_TEXT_FONT_WEIGHT_HIT,
              });
              newChainLightningEffects.push({
                id: uuidv4(), startX: ec.x, startY: ec.y,
                endX: getCenter(chainTarget).x, endY: getCenter(chainTarget).y,
                timer: CHAIN_LIGHTNING_VISUAL_DURATION, color: UI_ACCENT_LIGHTNING,
              });
              p.alreadyChainedTo = [...(p.alreadyChainedTo ?? []), chainTarget.id];
              p.chainsLeft = (p.chainsLeft ?? 1) - 1;
            }
          }

          // Piercing
          if (p.pierceCount !== undefined && p.pierceCount > 0) {
            p.pierceCount--;
          } else if (!p.aoeRadius) {
            removed = true;
          }

          if (removed) {
            if (p.causesShake) cameraShake = { intensity: p.isAirstrike ? AIRSTRIKE_IMPACT_SHAKE_INTENSITY : RPG_IMPACT_CAMERA_SHAKE_INTENSITY, duration: p.isAirstrike ? AIRSTRIKE_IMPACT_SHAKE_DURATION : RPG_IMPACT_CAMERA_SHAKE_DURATION, timer: p.isAirstrike ? AIRSTRIKE_IMPACT_SHAKE_DURATION : RPG_IMPACT_CAMERA_SHAKE_DURATION };
            if (p.aoeRadius) aoeExplosions.push({ proj: p, center: ec });
          }

          if (enemy.health <= 0) { handleEnemyDeath(enemy); return false; }
          return true;
        });

      } else {
        // Enemy projectile
        if (!isShielded(currentPlayer) && currentPlayer.health > 0 && checkCollision(p, currentPlayer)) {
          currentPlayer.health -= p.damage;
          if (currentPlayer.health > 0) currentPlayer.playerHitTimer = PLAYER_HIT_FLASH_DURATION_TICKS;
          removed = true;
          if (p.causesShake) cameraShake = { intensity: RPG_IMPACT_CAMERA_SHAKE_INTENSITY, duration: RPG_IMPACT_CAMERA_SHAKE_DURATION, timer: RPG_IMPACT_CAMERA_SHAKE_DURATION };
          if (p.aoeRadius) aoeExplosions.push({ proj: p, center: getCenter(currentPlayer) });
        }

        if (!removed) {
          for (const ally of currentPlayer.allies) {
            const allyShielded = currentPlayer.shieldAbilityUnlocked && shieldZones.some(sz => distanceBetweenPoints(getCenter(ally), getCenter(sz)) <= sz.radius);
            if (!allyShielded && checkCollision(p, ally)) {
              ally.health = 0;
              removed = true;
              if (p.causesShake) cameraShake = { intensity: RPG_IMPACT_CAMERA_SHAKE_INTENSITY, duration: RPG_IMPACT_CAMERA_SHAKE_DURATION, timer: RPG_IMPACT_CAMERA_SHAKE_DURATION };
              if (p.aoeRadius) aoeExplosions.push({ proj: p, center: getCenter(ally) });
              break;
            }
          }
          currentPlayer.allies = currentPlayer.allies.filter(a => a.health > 0);
        }
      }
    }

    if (!removed) remainingProjectiles.push(p);
  }

  // ── AoE explosions ────────────────────────────────────────────────────────
  for (const { proj, center } of aoeExplosions) {
    currentEnemies = currentEnemies.filter(enemy => {
      const d = distanceBetweenPoints(getCenter(enemy), center);
      if (d > proj.aoeRadius!) return true;
      enemy.health -= proj.damage;
      const ec = getCenter(enemy);
      newDamageTexts.push({
        id: uuidv4(), text: `-${proj.damage.toFixed(0)}`, x: ec.x, y: ec.y - enemy.height / 2,
        timer: DAMAGE_TEXT_DURATION_TICKS, color: DAMAGE_TEXT_ENEMY_HIT_COLOR,
        velocityY: DAMAGE_TEXT_FLOAT_SPEED, fontSize: DAMAGE_TEXT_FONT_SIZE_HIT, fontWeight: DAMAGE_TEXT_FONT_WEIGHT_HIT,
      });
      if (enemy.health <= 0) { handleEnemyDeath(enemy); return false; }
      return true;
    });
  }

  return {
    remainingProjectiles, enemies: currentEnemies, player: currentPlayer,
    newGoldPiles, newDamageTexts, newEffectParticles, newChainLightningEffects,
    cameraShake, killCount, tankKillCount, comboIncrement,
  };
}
