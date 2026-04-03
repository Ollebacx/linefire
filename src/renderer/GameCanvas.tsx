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
  //
  // IMPORTANT: the canvas element in JSX has NO width/height React props.
  // Passing width={w} height={h} as React props causes React to call
  // canvas.width = w on every re-render that changes dimensions.
  // canvas.width assignment resets the WebGL context — mid-init on first load
  // this corrupts Pixi, which freezes the renderer (music still plays because
  // React effects manage audio independently of the game loop).
  // On reload the init is fast enough that Pixi completes before App's resize
  // effect triggers a re-render, so the bug doesn't show.
  //
  // Instead we set the backing-buffer size imperatively here (once), then let
  // Pixi's own resize() handle all subsequent dimension changes.
  useEffect(() => {
    if (!canvasRef.current) return;
    let aborted = false;
    let unsubRender:  (() => void) | null = null;
    let unsubLoop:    (() => void) | null = null;

    // Set initial backing-buffer dimensions imperatively so there's no
    // 300×150 flash before Pixi inits, and so React never resets them.
    canvasRef.current.width  = width;
    canvasRef.current.height = height;

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
    }).catch((err) => {
      if (!aborted) {
        // Pixi init failed — log so it's visible in DevTools, then clean up.
        console.error('[GameCanvas] PixiRenderer.init() failed:', err);
        renderer.destroy();
        rendererRef.current = null;
      }
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
    // NOTE: width/height are intentionally NOT passed as React props.
    // React maps those to canvas.width = w and canvas.height = h DOM property
    // assignments, which reset the WebGL context on every resize re-render.
    // Pixi owns the backing-buffer dimensions (set in init + resize effects).
    // CSS style below sizes the element visually in the layout.
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', top: 0, left: 0, display: 'block', outline: 'none', width: `${width}px`, height: `${height}px` }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    />
  );
};

export { gameLoop };

