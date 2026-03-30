/**
 * uiStore — lightweight Zustand slice for overlay/screen state
 *
 * Keeps UI concerns separate from game simulation state.
 */
import { create } from 'zustand';

export type ScreenOverlay =
  | 'none'
  | 'pause'
  | 'upgrade_available'
  | 'champion_select'
  | 'post_round'
  | 'game_over'
  | 'tutorial_message';

export interface UiStore {
  // ── Active overlay
  overlay: ScreenOverlay;
  setOverlay: (o: ScreenOverlay) => void;

  // ── Settings panel
  settingsOpen: boolean;
  toggleSettings: () => void;

  // ── Audio
  isMuted: boolean;
  toggleMute: () => void;
  volume: number;          // 0–1
  setVolume: (v: number) => void;

  // ── FPS counter (dev)
  showFps: boolean;
  toggleFps: () => void;
  fps: number;
  setFps: (fps: number) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  overlay: 'none',
  setOverlay: (overlay) => set({ overlay }),

  settingsOpen: false,
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),

  isMuted: false,
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),

  volume: 0.5,
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),

  showFps: false,
  toggleFps: () => set((s) => ({ showFps: !s.showFps })),

  fps: 0,
  setFps: (fps) => set({ fps }),
}));
