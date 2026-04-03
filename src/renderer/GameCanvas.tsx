/**
 * GameCanvas — React component wrapping the Pixi.js renderer.
 *
 * Responsibilities:
 *  • Mount a <canvas> element into the DOM.
 *  • Initialize PixiRenderer asynchronously.
 *  • Start / stop the GameLoop based on gameStatus.
 *  • Subscribe to the Zustand store and call renderer.render() on every tick.
 *  • Expose keyboard / mouse events to the store.
 *  • Propagate resize events.
 *
 * NOTE: This component is always mounted (App.tsx never unmounts it), so
 * we wire everything inside the async init callback rather than relying on
 * `ready` state — that pattern breaks in React StrictMode because
 * setReady(true) becomes a no-op on the second invocation.
 */
import React, { useEffect, useRef, useCallback } from 'react';
import { PixiRenderer } from './PixiRenderer';
import { GameLoop } from '../core/GameLoop';
import { useGameStore } from '../stores/gameStore';

interface GameCanvasProps {
  width: number;
  height: number;
  onReady?: () => void;
}

// Singleton — one game loop for the entire browser session.
const gameLoop = new GameLoop();

const shouldRun = (status: string) =>
  status === 'PLAYING'           ||
  status === 'INIT_NEW_RUN'      ||
  status === 'GAME_OVER_PENDING' ||
  status === 'TUTORIAL_ACTIVE'   ||
  status === 'ROUND_COMPLETE';

export const GameCanvas: React.FC<GameCanvasProps> = ({ width, height, onReady }) => {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<PixiRenderer | null>(null);

  // ── Init Pixi once — wire render/loop INSIDE the promise so StrictMode
  //    double-invoke never leaves renderCallback=null. ─────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;
    let aborted = false;
    let unsubRender:  (() => void) | null = null;
    let unsubLoop:    (() => void) | null = null;

    const renderer = new PixiRenderer();
    rendererRef.current = renderer;

    renderer.init(canvasRef.current, width, height).then(() => {
      if (aborted) { renderer.destroy(); return; }

      // Wire render callback for the game loop (once per rAF).
      gameLoop.setRenderCallback(() => {
        rendererRef.current?.render(useGameStore.getState());
      });

      // Render on every non-loop store change (pause, shop, menus).
      unsubRender = useGameStore.subscribe(() => {
        if (!gameLoop.isRunning) {
          rendererRef.current?.render(useGameStore.getState());
        }
      });

      // Start/stop the loop whenever gameStatus changes.
      unsubLoop = useGameStore.subscribe((state) => {
        if (shouldRun(state.gameStatus)) {
          if (!gameLoop.isRunning) gameLoop.start();
        } else {
          if (gameLoop.isRunning) gameLoop.stop();
        }
      });

      // Render current state and check initial status.
      renderer.render(useGameStore.getState());
      const { gameStatus } = useGameStore.getState();
      if (shouldRun(gameStatus)) gameLoop.start(); else gameLoop.stop();

      onReady?.();
    });

    return () => {
      aborted = true;
      unsubRender?.();
      unsubLoop?.();
      gameLoop.setRenderCallback(null);
      gameLoop.stop();
      renderer.destroy();
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once — canvas is never unmounted

  // ── Resize ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    rendererRef.current?.resize(width, height);
  }, [width, height]);

  // ── Keyboard events ──────────────────────────────────────────────────────────
  useEffect(() => {
    window.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      const store = useGameStore.getState();
      if (e.key === 'q' || e.key === 'Q') { store.activateAirstrike(); return; }
      if (e.key === 'e' || e.key === 'E') { store.deployShieldZone(); return; }
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { store.togglePause(); return; }
      if ((e.key === 'd' || e.key === 'D') && e.ctrlKey) { e.preventDefault(); store.maxOutAllUpgrades(); return; }
      store.setKeyDown(e.key);
    };
    const onKeyUp = (e: KeyboardEvent) => useGameStore.getState().setKeyUp(e.key);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup',   onKeyUp);
    };
  }, []);

  // ── Mouse / touch ────────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    useGameStore.getState().setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const handleMouseLeave = useCallback(() => {
    useGameStore.getState().setMousePosition(null);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, display: 'block', outline: 'none', width: `${width}px`, height: `${height}px` }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    />
  );
};

export { gameLoop };

