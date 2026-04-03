import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from './src/stores/gameStore';
import StartScreen from './components/StartScreen';
import GameplayUI from './components/GameplayUI';
import BackgroundAnimation from './components/BackgroundAnimation';
import Joystick from './components/Joystick';
import { GameCanvas } from './src/renderer/GameCanvas';
import { UpgradeModal } from './components/UpgradeModal';
import { AudioSystem } from './src/systems/AudioSystem';
import type { Size } from './types';
import type { Upgrade } from './types';
import type { SoundVolumes } from './components/SoundSettingsPanel';

const DEFAULT_VOLUMES: SoundVolumes = { master: 0.75, music: 0.75, sfx: 0.75 };

// ── Shop screen ─────────────────────────────────────────────────────────────
// Isolated so App never re-renders on player/upgrade changes during SHOP.
const ShopUI: React.FC<{
  onPurchase: (upgrade: Upgrade) => void;
  onContinue: () => void;
  onGoToMenu: () => void;
}> = ({ onPurchase, onContinue, onGoToMenu }) => {
  const player            = useGameStore(s => s.player);
  const availableUpgrades = useGameStore(s => s.availableUpgrades);
  const logs              = useGameStore(s => s.logs);
  return (
    <div className="lf-screen-enter" style={{ position: "absolute", inset: 0 }}>
      <UpgradeModal
        player={player} upgrades={availableUpgrades} logs={logs}
        onPurchase={onPurchase} onContinue={onContinue} onGoToMenu={onGoToMenu}
      />
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
export const App: React.FC = () => {
  const [visualGameSize,     setVisualGameSize]     = useState<Size>({ width: window.innerWidth, height: window.innerHeight });
  const [trueFullscreenSize, setTrueFullscreenSize] = useState<Size>({ width: window.innerWidth, height: window.innerHeight });
  const gameOuterContainerRef = useRef<HTMLDivElement>(null);
  const gameAreaRef           = useRef<HTMLDivElement>(null);
  const [isMuted,        setIsMuted]        = useState(false);
  const [soundVolumes,   setSoundVolumes]   = useState<SoundVolumes>(DEFAULT_VOLUMES);
  const [showSoundPanel, setShowSoundPanel] = useState(false);

  // ── NARROW store subscriptions ──────────────────────────────────────────
  // None of these fields appear in applyTickResult, so App NEVER re-renders at 60 fps.
  const gameStatus    = useGameStore(s => s.gameStatus);
  const isTouchDevice = useGameStore(s => s.isTouchDevice ?? false);
  const controlScheme = useGameStore(s => s.controlScheme ?? 'keyboard');
  const round         = useGameStore(s => s.round); // changes only at wave boundaries

  // Actions: useShallow gives stable refs and never triggers a re-render.
  const {
    startGame, purchaseUpgrade, playNewRunFromShop, goToMenu, restartFromGameOver,
    togglePause, activateAirstrike, deployShieldZone,
    startTutorialMode, advanceTutorialStep, endTutorialMode,
    updateGameAreaSize, setJoystickDirection, maxOutAllUpgrades, setControlScheme,
  } = useGameStore(useShallow(s => ({
    startGame:           s.startGame,
    purchaseUpgrade:     s.purchaseUpgrade,
    playNewRunFromShop:  s.playNewRunFromShop,
    goToMenu:            s.goToMenu,
    restartFromGameOver: s.restartFromGameOver,
    togglePause:         s.togglePause,
    activateAirstrike:   s.activateAirstrike,
    deployShieldZone:    s.deployShieldZone,
    startTutorialMode:   s.startTutorialMode,
    advanceTutorialStep: s.advanceTutorialStep,
    endTutorialMode:     s.endTutorialMode,
    updateGameAreaSize:  s.updateGameAreaSize,
    setJoystickDirection: s.setJoystickDirection,
    maxOutAllUpgrades:   s.maxOutAllUpgrades,
    setControlScheme:    s.setControlScheme,
  })));

  // ── Debug: Ctrl+D → max upgrades ────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'd' || e.key === 'D') && e.ctrlKey) { e.preventDefault(); maxOutAllUpgrades(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [maxOutAllUpgrades]);

  // ── Volume helpers ───────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    setIsMuted(prev => { const next = !prev; AudioSystem.toggleMute(); return next; });
  }, []);

  const handleVolumeChange = useCallback((key: keyof SoundVolumes, value: number) => {
    setSoundVolumes(prev => {
      const next = { ...prev, [key]: value };
      if      (key === 'master') AudioSystem.setMasterVolume(value);
      else if (key === 'music')  AudioSystem.setMusicVolume(value);
      else if (key === 'sfx')    AudioSystem.setSfxVolume(value);
      return next;
    });
  }, []);

  // ── Music engine ─────────────────────────────────────────────────────────
  useEffect(() => {
    const inGame = ['SHOP','PLAYING','PAUSED','GAME_OVER_PENDING','GAME_OVER','INIT_NEW_RUN','TUTORIAL_ACTIVE'].includes(gameStatus);
    if (inGame) AudioSystem.startAmbient(); else AudioSystem.stopAmbient();
    if (gameStatus === 'PLAYING' || gameStatus === 'INIT_NEW_RUN' || gameStatus === 'TUTORIAL_ACTIVE') {
      AudioSystem.startCombat();
    } else if (gameStatus === 'PAUSED') {
      AudioSystem.pauseCombat();
    } else {
      AudioSystem.stopCombat();
    }
  }, [gameStatus]);

  useEffect(() => {
    if (gameStatus === 'PLAYING' || gameStatus === 'TUTORIAL_ACTIVE') {
      const intensity = round <= 2 ? 1 : round <= 5 ? 2 : round <= 9 ? 3 : 4;
      AudioSystem.setMusicIntensity(intensity);
    }
  }, [round, gameStatus]);

  // ── Resize ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const calc = () => {
      setTrueFullscreenSize({ width: window.innerWidth, height: window.innerHeight });
      if (!gameOuterContainerRef.current) return;
      const w = Math.max(gameOuterContainerRef.current.clientWidth,  320);
      const h = Math.max(gameOuterContainerRef.current.clientHeight, 320);
      setVisualGameSize(prev => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
      updateGameAreaSize({ width: w, height: h });
    };
    calc();
    window.addEventListener('resize', calc);
    window.addEventListener('orientationchange', calc);
    return () => { window.removeEventListener('resize', calc); window.removeEventListener('orientationchange', calc); };
  }, [updateGameAreaSize]);

  // ── Airstrike on game-area click (desktop) ───────────────────────────────
  const handleGameAreaClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    let el = event.target as HTMLElement;
    while (el && el !== gameAreaRef.current) {
      if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button' ||
          el.classList.contains('btn-action-mobile')) return;
      el = el.parentElement as HTMLElement;
    }
    // Read from static snapshot — no subscription needed.
    const s = useGameStore.getState();
    if (!s.isTouchDevice) {
      if (s.gameStatus === 'PLAYING' && s.airstrikeAvailable && !s.airstrikeActive) {
        s.activateAirstrike();
      } else if (s.gameStatus === 'TUTORIAL_ACTIVE' && s.tutorialStep === 8 &&
                 s.player.airstrikeAvailable && !s.airstrikeActive) {
        s.activateAirstrike();
      }
    }
  }, []);

  const handleJoystickMove    = useCallback((dir: { x: number; y: number }) => setJoystickDirection(dir), [setJoystickDirection]);
  const handleJoystickRelease = useCallback(() => setJoystickDirection({ x: 0, y: 0 }), [setJoystickDirection]);

  // ── Screen routing ───────────────────────────────────────────────────────
  const renderContent = () => {
    if (gameStatus === 'IDLE') {
      return (
        <div className="lf-screen-enter" style={{ position: "absolute", inset: 0 }}>
          <StartScreen
            onStart={startGame}
            onStartTutorial={startTutorialMode}
            controlScheme={controlScheme}
            onControlSchemeChange={setControlScheme}
            soundVolumes={soundVolumes}
            isMuted={isMuted}
            onVolumeChange={handleVolumeChange}
            onToggleMute={toggleMute}
          />
        </div>
      );
    }

    if (gameStatus === 'SHOP') {
      return (
        <ShopUI
          onPurchase={purchaseUpgrade}
          onContinue={playNewRunFromShop}
          onGoToMenu={goToMenu}
        />
      );
    }

    // All gameplay states (PLAYING, PAUSED, GAME_OVER, TUTORIAL_ACTIVE …)
    // live inside GameplayUI which owns the fast-changing store subscriptions.
    return (
      <GameplayUI
        isMuted={isMuted}
        onToggleMute={toggleMute}
        soundVolumes={soundVolumes}
        onVolumeChange={handleVolumeChange}
        showSoundPanel={showSoundPanel}
        onToggleSoundPanel={() => setShowSoundPanel(p => !p)}
        onCloseSoundPanel={() => setShowSoundPanel(false)}
        onPauseToggle={togglePause}
        onGoToMenu={goToMenu}
        onGoToShop={restartFromGameOver}
        onRetry={playNewRunFromShop}
        onActivateAirstrike={activateAirstrike}
        onDeployShield={deployShieldZone}
        onAdvanceTutorial={advanceTutorialStep}
        onEndTutorial={endTutorialMode}
      />
    );
  };

  return (
    <div
      ref={gameOuterContainerRef}
      className="w-full h-full flex justify-center items-center overflow-hidden"
      style={{ backgroundColor: '#080A14' }}
    >
      {gameStatus === 'IDLE' && (
        <BackgroundAnimation viewportWidth={trueFullscreenSize.width} viewportHeight={trueFullscreenSize.height} />
      )}
      <div
        ref={gameAreaRef}
        className={`relative overflow-hidden game-cursor select-none noselect${gameStatus !== 'IDLE' ? ' game-area-background' : ''}`}
        style={{ width: `${visualGameSize.width}px`, height: `${visualGameSize.height}px`, zIndex: 5 }}
        tabIndex={0}
        onClick={handleGameAreaClick}
      >
        {/* Canvas is always mounted — one WebGL context for the entire browser session.
            Re-creating it each game (mount/unmount) causes GPU memory to accumulate to ~1.3 GB/game.
            Keeping it alive means Chrome never needs to allocate a second WebGL context. */}
        <GameCanvas width={visualGameSize.width} height={visualGameSize.height} />
        {/* UI content overlaid on the canvas (position:relative children + absolute overlays) */}
        {renderContent()}
      </div>
      {isTouchDevice && ['PLAYING','PAUSED','GAME_OVER_PENDING','TUTORIAL_ACTIVE'].includes(gameStatus) && (
        <Joystick
          onMove={handleJoystickMove}
          onRelease={handleJoystickRelease}
          baseSize={80}
          knobSize={50}
          joystickPosition={{
            bottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
            left:   'max(20px, env(safe-area-inset-left, 20px))',
          }}
        />
      )}
    </div>
  );
};
