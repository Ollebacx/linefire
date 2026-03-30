/**
 * WaveSystem
 * Manages round progression: enemy kill tracking, wave transitions.
 */
import type { GameState } from '../types';
import { ROUND_BASE_ENEMY_COUNT, ROUND_ENEMY_INCREMENT } from '../constants/enemy';
import { WAVE_TITLE_STAY_DURATION_TICKS, WAVE_TITLE_FADE_OUT_DURATION_TICKS } from '../constants/enemy';

export const GAME_OVER_PENDING_DURATION_TICKS = 180;
export const INITIAL_ENEMIES_AT_ROUND_START   = 5;
export const INITIAL_SPAWN_INTERVAL_TICKS     = 20;

export interface WaveTickResult {
  isWaveComplete: boolean;
  shouldStartNextWave: boolean;
  nextRoundTimer: number;
}

export function tickWaveTimer(
  nextRoundTimer: number,
  killedEnemies: number,
  totalEnemies: number,
  liveEnemies: number,
  deltaSeconds: number,
): WaveTickResult {
  const waveComplete = killedEnemies >= totalEnemies && liveEnemies === 0;

  if (!waveComplete) {
    return { isWaveComplete: false, shouldStartNextWave: false, nextRoundTimer };
  }

  const newTimer = Math.max(0, nextRoundTimer - deltaSeconds);
  return {
    isWaveComplete: true,
    shouldStartNextWave: newTimer <= 0,
    nextRoundTimer: newTimer,
  };
}

export function totalEnemiesForRound(round: number): number {
  return ROUND_BASE_ENEMY_COUNT + (round - 1) * ROUND_ENEMY_INCREMENT;
}

export function waveTitleFor(round: number): string {
  return `Wave ${round}`;
}

export function waveTitleDuration(): number {
  return WAVE_TITLE_STAY_DURATION_TICKS + WAVE_TITLE_FADE_OUT_DURATION_TICKS;
}
