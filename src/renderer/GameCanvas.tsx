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
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PixiRenderer } from './PixiRenderer';
import { GameLoop } from '../core/GameLoop';
import { useGameStore } from '../stores/gameStore';

interface GameCanvasProps {
  width: number;
  height: number;
  /** Called when the canvas is ready (Pixi initialised). */
  onReady?: () => void;
}

// Singleton game loop — one instance for the lifetime of the app.
const gameLoop = new GameLoop();

export const GameCanvas: React.FC<GameCanvasProps> = ({ width, height, onReady }) => {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<PixiRenderer | null>(null);
  const [ready, setReady] = useState(false);

  // ── Init Pixi once the canvas element is in the DOM ─────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;

    let aborted = false;
    const canvas   = canvasRef.current;
    const renderer = new PixiRenderer();
    rendererRef.current = renderer;

    renderer.init(canvas, width, height).then(() => {
      if (aborted) {
        // StrictMode unmounted before async init resolved — clean up safely
        renderer.destroy();
        return;
      }
      setReady(true);
      onReady?.();
    });

    return () => {
      aborted = true;
      gameLoop.stop();
      renderer.destroy(); // no-op if not yet initialized
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  // ── Resize — only after Pixi is ready ────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    rendererRef.current?.resize(width, height);
  }, [width, height, ready]);

  // ── Subscribe to store updates → call render ─────────────────────────────────
  useEffect(() => {
    if (!ready) return;

    // During gameplay the game loop owns rendering (once per rAF via renderCallback).
    // We only render here for non-loop state changes: shop, pause, menus, etc.
    const unsubscribe = useGameStore.subscribe(() => {
      if (!gameLoop.isRunning) {
        rendererRef.current?.render(useGameStore.getState());
      }
    });

    // Wire the game loop so it renders exactly once per rAF frame (not once per tick).
    gameLoop.setRenderCallback(() => {
      rendererRef.current?.render(useGameStore.getState());
    });

    // Render current state immediately
    rendererRef.current?.render(useGameStore.getState());

    return () => {
      unsubscribe();
      gameLoop.setRenderCallback(null);
    };
  }, [ready]);

  // ── GameLoop start / stop based on gameStatus ─────────────────────────────────
  useEffect(() => {
    if (!ready) return;

    let prevStatus = useGameStore.getState().gameStatus;
    const unsubscribe = useGameStore.subscribe((state) => {
      const { gameStatus } = state;
      if (gameStatus === prevStatus) return;
      prevStatus = gameStatus;
      if (
        gameStatus === 'PLAYING'      ||
        gameStatus === 'INIT_NEW_RUN' ||
        gameStatus === 'GAME_OVER_PENDING' ||
        gameStatus === 'TUTORIAL_ACTIVE'   ||
        gameStatus === 'ROUND_COMPLETE'
      ) {
        gameLoop.start();
      } else {
        gameLoop.stop();
      }
    });

    // Trigger immediately for current status
    const { gameStatus } = useGameStore.getState();
    if (
      gameStatus === 'PLAYING'      ||
      gameStatus === 'INIT_NEW_RUN' ||
      gameStatus === 'GAME_OVER_PENDING' ||
      gameStatus === 'TUTORIAL_ACTIVE'   ||
      gameStatus === 'ROUND_COMPLETE'
    ) {
      gameLoop.start();
    }

    return () => { gameLoop.stop(); unsubscribe(); };
  }, [ready]);

  // ── Keyboard events on window (no focus required) ────────────────────────────
  useEffect(() => {
    // Ensure window has focus so keydown events fire immediately on game start.
    // Some browsers lose focus to the last-clicked button (e.g. the Shop "Play" button).
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
    const onKeyUp = (e: KeyboardEvent) => {
      useGameStore.getState().setKeyUp(e.key);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup',   onKeyUp);
    };
  }, []);

  // ── Mouse / touch events → store ─────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    useGameStore.getState().setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    useGameStore.getState().setMousePosition(null);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        display: 'block',
        outline: 'none',
        width: `${width}px`,
        height: `${height}px`,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    />
  );
};

// Re-export the singleton game loop so App can call .stop() if needed
export { gameLoop };
