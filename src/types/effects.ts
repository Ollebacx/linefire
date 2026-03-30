import type { Position, GameObject } from './geometry';

export interface DamageText {
  id: string;
  text: string;
  x: number;
  y: number;
  timer: number;
  color: string;
  velocityY: number;
  fontSize: number;
  fontWeight: string;
}

export interface MuzzleFlash {
  id: string;
  x: number;
  y: number;
  angle: number;
  size: number;
  timer: number;
  color: string;
}

export interface EffectParticle {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
  velocity: Position;
  timer: number;
  initialTimer: number;
  type: 'impact' | 'death' | 'shield_pulse';
}

export interface ShieldZone extends GameObject {
  duration: number;
  timer: number;
  radius: number;
  opacity: number;
}

export interface ChainLightningEffect {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  timer: number;
  color: string;
}

export interface CameraShakeState {
  intensity: number;
  duration: number;
  timer: number;
}
