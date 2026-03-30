/**
 * ComboSystem
 * Tracks kill combos and airstrike availability.
 */
import { COMBO_WINDOW_DURATION_TICKS, AIRSTRIKE_COMBO_THRESHOLD } from '../constants/player';

export interface ComboState {
  comboCount: number;
  comboTimer: number;
  airstrikeAvailable: boolean;
  airstrikeActive: boolean;
}

export function tickCombo(state: ComboState): ComboState {
  if (state.comboTimer <= 0) {
    return { ...state, comboCount: 0, comboTimer: 0, airstrikeAvailable: state.airstrikeActive ? state.airstrikeAvailable : false };
  }
  const newTimer = Math.max(0, state.comboTimer - 1);
  if (newTimer === 0) {
    return { ...state, comboCount: 0, comboTimer: 0, airstrikeAvailable: state.airstrikeActive ? state.airstrikeAvailable : false };
  }
  return { ...state, comboTimer: newTimer };
}

export function registerKill(state: ComboState, count = 1): ComboState {
  const newCount = state.comboCount + count;
  const airstrikeReady = !state.airstrikeActive && newCount >= AIRSTRIKE_COMBO_THRESHOLD;
  return {
    comboCount: newCount,
    comboTimer: COMBO_WINDOW_DURATION_TICKS,
    airstrikeAvailable: airstrikeReady || state.airstrikeAvailable,
    airstrikeActive: state.airstrikeActive,
  };
}

export function consumeAirstrike(state: ComboState): ComboState {
  if (!state.airstrikeAvailable || state.airstrikeActive) return state;
  return { ...state, comboCount: 0, airstrikeAvailable: false, airstrikeActive: true };
}

export function completeAirstrike(state: ComboState): ComboState {
  return { ...state, airstrikeActive: false };
}
