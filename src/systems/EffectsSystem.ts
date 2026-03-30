/**
 * EffectsSystem
 * Ticks: damage texts, muzzle flashes, particles, shield zones, chain lightning.
 * Returns new arrays (pure).
 */
import { v4 as uuidv4 } from 'uuid';
import type {
  DamageText, MuzzleFlash, EffectParticle, ShieldZone, ChainLightningEffect,
  CameraShakeState, Position, Size,
} from '../types';
import { WORLD_AREA } from '../constants/world';
import { UI_ACCENT_SHIELD } from '../constants/ui';
import {
  SHIELD_ZONE_OPACITY_PULSE_MIN, SHIELD_ZONE_OPACITY_PULSE_MAX, SHIELD_ZONE_OPACITY_PULSE_SPEED,
} from '../constants/player';
import {
  EFFECT_PARTICLE_DURATION_TICKS, EFFECT_PARTICLE_BASE_SIZE,
} from '../constants/effects';

// ─── Damage texts ─────────────────────────────────────────────────────────────
export function tickDamageTexts(texts: DamageText[]): DamageText[] {
  return texts
    .map(t => ({ ...t, y: t.y + t.velocityY, timer: t.timer - 1 }))
    .filter(t => t.timer > 0);
}

// ─── Muzzle flashes ───────────────────────────────────────────────────────────
export function tickMuzzleFlashes(flashes: MuzzleFlash[]): MuzzleFlash[] {
  return flashes
    .map(f => ({ ...f, timer: f.timer - 1 }))
    .filter(f => f.timer > 0);
}

// ─── Effect particles ─────────────────────────────────────────────────────────
export function tickEffectParticles(particles: EffectParticle[]): EffectParticle[] {
  return particles
    .map(p => ({ ...p, x: p.x + p.velocity.x, y: p.y + p.velocity.y, timer: p.timer - 1 }))
    .filter(p => p.timer > 0);
}

// ─── Shield zones ─────────────────────────────────────────────────────────────
export function tickShieldZones(
  zones: ShieldZone[],
  outParticles: EffectParticle[],
): { zones: ShieldZone[]; newParticles: EffectParticle[] } {
  const newParticles: EffectParticle[] = [...outParticles];
  const zones2 = zones
    .map(sz => {
      let op = sz.opacity + SHIELD_ZONE_OPACITY_PULSE_SPEED;
      if (op > SHIELD_ZONE_OPACITY_PULSE_MAX || op < SHIELD_ZONE_OPACITY_PULSE_MIN) op = SHIELD_ZONE_OPACITY_PULSE_MIN;

      if (Math.random() < 0.1) {
        const angle = Math.random() * Math.PI * 2;
        newParticles.push({
          id: uuidv4(),
          x: sz.x + sz.width / 2 + Math.cos(angle) * sz.radius,
          y: sz.y + sz.height / 2 + Math.sin(angle) * sz.radius,
          size: EFFECT_PARTICLE_BASE_SIZE * (0.5 + Math.random() * 0.5),
          color: UI_ACCENT_SHIELD + 'AA',
          velocity: { x: (Math.random() - 0.5) * 0.5, y: (Math.random() - 0.5) * 0.5 - 0.3 },
          timer: EFFECT_PARTICLE_DURATION_TICKS * 0.8,
          initialTimer: EFFECT_PARTICLE_DURATION_TICKS * 0.8,
          type: 'shield_pulse',
        });
      }
      return { ...sz, timer: sz.timer - 1, opacity: op };
    })
    .filter(sz => sz.timer > 0);
  return { zones: zones2, newParticles };
}

// ─── Chain lightning effects ──────────────────────────────────────────────────
export function tickChainLightning(effects: ChainLightningEffect[]): ChainLightningEffect[] {
  return effects.map(e => ({ ...e, timer: e.timer - 1 })).filter(e => e.timer > 0);
}

// ─── Camera shake ─────────────────────────────────────────────────────────────
export function tickCameraShake(
  shake: CameraShakeState | null,
  camera: Position,
  gameArea: Size,
): { shake: CameraShakeState | null; camera: Position } {
  if (!shake) return { shake: null, camera };
  const next = shake.timer - 1;
  if (next <= 0) return { shake: null, camera };

  const ox = (Math.random() - 0.5) * 2 * shake.intensity;
  const oy = (Math.random() - 0.5) * 2 * shake.intensity;
  return {
    shake: { ...shake, timer: next },
    camera: {
      x: Math.max(0, Math.min(camera.x + ox, WORLD_AREA.width - gameArea.width)),
      y: Math.max(0, Math.min(camera.y + oy, WORLD_AREA.height - gameArea.height)),
    },
  };
}
