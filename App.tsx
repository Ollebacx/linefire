
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useGameStore } from './src/stores/gameStore';
import { GameCanvas } from './src/renderer/GameCanvas';
import { HUD } from './components/HUD';
import { UpgradeModal } from './components/UpgradeModal';
import StartScreen from './components/StartScreen';
import GameOverScreen from './components/GameOverScreen';
import BackgroundAnimation from './components/BackgroundAnimation';
import OffScreenIndicator from './components/OffScreenIndicator';
import Joystick from './components/Joystick';
import StaticFieldLinesBackground from './components/StaticFieldLinesBackground';
import WaveStartTitle from './components/WaveStartTitle';
import TutorialOverlay from './components/TutorialOverlay';
import { WORLD_AREA, UI_BACKGROUND_NEUTRAL, UI_STROKE_PRIMARY, UI_ACCENT_SUBTLE, WAVE_TITLE_STAY_DURATION_TICKS, WAVE_TITLE_FADE_OUT_DURATION_TICKS, UI_STROKE_SECONDARY } from './constants';
import type { Size } from './types';


export const App: React.FC = () => {
  const [visualGameSize, setVisualGameSize] = useState<Size>({ width: window.innerWidth, height: window.innerHeight });
  const [trueFullscreenSize, setTrueFullscreenSize] = useState<Size>({ width: window.innerWidth, height: window.innerHeight });
  const gameOuterContainerRef = useRef<HTMLDivElement>(null);
  const gameAreaRef            = useRef<HTMLDivElement>(null);

  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  // ── New architecture: read everything from Zustand store ─────────────────────
  const {
    // Actions
    startGame, purchaseUpgrade, playNewRunFromShop, goToMenu,
    restartFromGameOver, togglePause, activateAirstrike, deployShieldZone,
    startTutorialMode, advanceTutorialStep, endTutorialMode, updateGameAreaSize,
    setJoystickDirection, maxOutAllUpgrades,
    // State
    player, round, gameStatus, totalEnemiesThisRound, currentWaveEnemies,
    availableUpgrades, nextRoundTimer, nextAllySpawnTimer, isTouchDevice,
    camera, airstrikeAvailable, airstrikeActive, logs, gameOverPendingTimer,
    waveTitleText, waveTitleTimer, tutorialStep, tutorialMessages, tutorialEntities,
    gameArea, collectibleAllies, enemies,
  } = useGameStore();

  const handleJoystickMove    = useCallback((dir: { x: number; y: number }) => setJoystickDirection(dir), [setJoystickDirection]);
  const handleJoystickRelease = useCallback(() => setJoystickDirection({ x: 0, y: 0 }), [setJoystickDirection]);

  // ── Global debug shortcut: Ctrl+D → max all upgrades ──────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'd' || e.key === 'D') && e.ctrlKey) {
        e.preventDefault();
        maxOutAllUpgrades();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [maxOutAllUpgrades]);

  useEffect(() => {
    const ambientElement = document.getElementById('ambient-sound');
    if (ambientElement instanceof HTMLAudioElement) {
      ambientAudioRef.current = ambientElement;
      ambientAudioRef.current.muted = isMuted;
    } else {
      console.warn('Failed to get ambient-sound HTMLAudioElement. Found:', ambientElement);
      ambientAudioRef.current = null;
    }

    const backgroundElement = document.getElementById('background-music');
    if (backgroundElement instanceof HTMLAudioElement) {
      backgroundAudioRef.current = backgroundElement;
      backgroundAudioRef.current.muted = isMuted;
    } else {
      console.warn('Failed to get background-music HTMLAudioElement. Found:', backgroundElement);
      backgroundAudioRef.current = null;
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prevMuted => {
      const newMutedState = !prevMuted;
      if (ambientAudioRef.current) {
        ambientAudioRef.current.muted = newMutedState;
      }
      if (backgroundAudioRef.current) {
        backgroundAudioRef.current.muted = newMutedState;
      }
      if (!newMutedState) {
          if (['SHOP', 'PLAYING', 'PAUSED', 'GAME_OVER_PENDING', 'GAME_OVER', 'INIT_NEW_RUN', 'TUTORIAL_ACTIVE'].includes(gameStatus) && ambientAudioRef.current && ambientAudioRef.current.paused) {
            playAudio(ambientAudioRef, 'ambient-sound');
          }
          if (['PLAYING', 'INIT_NEW_RUN', 'TUTORIAL_ACTIVE'].includes(gameStatus) && backgroundAudioRef.current && backgroundAudioRef.current.paused) {
             playAudio(backgroundAudioRef, 'background-music');
          }
      }
      return newMutedState;
    });
  }, [gameStatus]);


  const playAudio = useCallback(async (audioRef: React.RefObject<HTMLAudioElement>, audioName: string) => {
    const audioEl = audioRef.current;
    if (audioEl && typeof audioEl.play === 'function') {
      audioEl.muted = isMuted;
      try {
        await audioEl.play();
      } catch (error) {
        if ((error as DOMException).name === 'AbortError') {
          console.log(`${audioName} play() request was interrupted.`);
        } else {
          console.error(`Error playing ${audioName}:`, error);
        }
      }
    } else {
      console.warn(`Cannot play ${audioName}: audioRef.current is not valid.`);
    }
  }, [isMuted]);

  const pauseAudio = useCallback((audioRef: React.RefObject<HTMLAudioElement>, audioName: string) => {
    const audioEl = audioRef.current;
    if (audioEl && typeof audioEl.pause === 'function') {
      if (!audioEl.paused) audioEl.pause();
    } else {
      console.warn(`Cannot pause ${audioName}: audioRef.current is not valid.`);
    }
  }, []);

  const stopAudio = useCallback((audioRef: React.RefObject<HTMLAudioElement>, audioName: string) => {
    const audioEl = audioRef.current;
    if (audioEl && typeof audioEl.pause === 'function' && typeof audioEl.load === 'function') {
      if (!audioEl.paused) audioEl.pause();
      audioEl.currentTime = 0;
    } else {
      console.warn(`Cannot stop ${audioName}: audioRef.current is not valid.`);
    }
  }, []);

  useEffect(() => {
    if (['SHOP', 'PLAYING', 'PAUSED', 'GAME_OVER_PENDING', 'GAME_OVER', 'INIT_NEW_RUN', 'TUTORIAL_ACTIVE'].includes(gameStatus)) {
      playAudio(ambientAudioRef, 'ambient-sound');
    } else if (gameStatus === 'IDLE' || gameStatus === 'CHAMPION_SELECT') {
      stopAudio(ambientAudioRef, 'ambient-sound');
    }

    if (gameStatus === 'PLAYING' || gameStatus === 'INIT_NEW_RUN' || gameStatus === 'TUTORIAL_ACTIVE') {
      playAudio(backgroundAudioRef, 'background-music');
    } else if (gameStatus === 'PAUSED') {
      pauseAudio(backgroundAudioRef, 'background-music');
    } else if (['GAME_OVER_PENDING', 'GAME_OVER', 'SHOP', 'IDLE', 'CHAMPION_SELECT'].includes(gameStatus)) {
      stopAudio(backgroundAudioRef, 'background-music');
    }
  }, [gameStatus, playAudio, pauseAudio, stopAudio, isMuted]);


  useEffect(() => {
    const calculateAndSetGameArea = () => {
      setTrueFullscreenSize({ width: window.innerWidth, height: window.innerHeight});

      if (gameOuterContainerRef.current) {
        const containerWidth = gameOuterContainerRef.current.clientWidth;
        const containerHeight = gameOuterContainerRef.current.clientHeight;

        if (containerWidth === 0 || containerHeight === 0) return;

        let newVisualSize: Size = { width: containerWidth, height: containerHeight };
        newVisualSize.width = Math.max(newVisualSize.width, 320);
        newVisualSize.height = Math.max(newVisualSize.height, 320);

        setVisualGameSize(currentSize => {
            if (currentSize.width !== newVisualSize.width || currentSize.height !== newVisualSize.height) {
                return newVisualSize;
            }
            return currentSize;
        });
        updateGameAreaSize(newVisualSize);
      }
    };

    calculateAndSetGameArea();
    window.addEventListener('resize', calculateAndSetGameArea);
    window.addEventListener('orientationchange', calculateAndSetGameArea);

    return () => {
      window.removeEventListener('resize', calculateAndSetGameArea);
      window.removeEventListener('orientationchange', calculateAndSetGameArea);
    };
  }, [updateGameAreaSize]);

  const handleGameAreaClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // Check if the click target or its parent is a button; if so, do nothing
    let targetElement = event.target as HTMLElement;
    while (targetElement && targetElement !== gameAreaRef.current) {
        if (targetElement.tagName === 'BUTTON' || targetElement.getAttribute('role') === 'button' || targetElement.classList.contains('btn-action-mobile')) {
            return; 
        }
        targetElement = targetElement.parentElement as HTMLElement;
    }


    if (gameAreaRef.current && (event.target === gameAreaRef.current || gameAreaRef.current.contains(event.target as Node))) {
        // Desktop airstrike activation by clicking screen, not buttons
        if (!isTouchDevice) {
             if (gameStatus === 'PLAYING' && airstrikeAvailable && !airstrikeActive) {
                activateAirstrike();
            } else if (gameStatus === 'TUTORIAL_ACTIVE' && tutorialStep === 8 &&
                        player.airstrikeAvailable && player.airstrikeActive !== undefined && !player.airstrikeActive) {
                activateAirstrike();
            }
        }
    }
  };

  const currentWaveTitleOpacity = useMemo(() => {
    if (waveTitleTimer <= 0) return 0;
    if (waveTitleTimer <= WAVE_TITLE_FADE_OUT_DURATION_TICKS) {
      return waveTitleTimer / WAVE_TITLE_FADE_OUT_DURATION_TICKS;
    }
    return 1;
  }, [waveTitleTimer]);

  const gameContent = () => {
    if (gameStatus === 'IDLE') {
      return (
        <StartScreen 
          onStart={startGame} 
          onStartTutorial={startTutorialMode}
        />
      );
    }
    
    const staticLinesBackgroundElement = (gameStatus === 'SHOP' || gameStatus === 'PLAYING' || gameStatus === 'PAUSED' || gameStatus === 'GAME_OVER_PENDING' || gameStatus === 'TUTORIAL_ACTIVE') ? (
        <StaticFieldLinesBackground worldArea={WORLD_AREA} camera={camera} gameArea={gameArea} />
      ) : null;

    if (gameStatus === 'SHOP') {
      return (
        <>
          {staticLinesBackgroundElement}
          <UpgradeModal
              player={player}
              upgrades={availableUpgrades}
              logs={logs}
              onPurchase={purchaseUpgrade}
              onContinue={playNewRunFromShop}
              onGoToMenu={goToMenu}
          />
        </>
      );
    }

    const gameScreenElements = (
      <>
        {staticLinesBackgroundElement}
        <HUD
            player={player}
            round={gameStatus === 'TUTORIAL_ACTIVE' ? 0 : round}
            enemiesLeft={currentWaveEnemies}
            totalEnemiesThisRound={totalEnemiesThisRound}
            gameStatus={gameStatus}
            nextRoundTimer={gameStatus === 'TUTORIAL_ACTIVE' ? undefined : nextRoundTimer}
            nextAllySpawnTimer={gameStatus === 'TUTORIAL_ACTIVE' ? 9999 : nextAllySpawnTimer}
            onPauseToggle={togglePause}
            isPaused={gameStatus === 'PAUSED'}
            airstrikeAvailable={gameStatus === 'TUTORIAL_ACTIVE' ? player.airstrikeAvailable || false : airstrikeAvailable}
            airstrikeActive={gameStatus === 'TUTORIAL_ACTIVE' ? player.airstrikeActive || false : airstrikeActive}
            tutorialHighlightTarget={gameStatus === 'TUTORIAL_ACTIVE' ? tutorialEntities.tutorialHighlightTarget : null}
            isMuted={isMuted}
            onToggleMute={toggleMute}
            isTouchDevice={isTouchDevice}
            onActivateAirstrike={activateAirstrike}
            onDeployShield={deployShieldZone}
        />
        <GameCanvas width={visualGameSize.width} height={visualGameSize.height} />
        {/* Off-screen indicators for enemies and collectible allies */}
        {(gameStatus === 'PLAYING' || gameStatus === 'ROUND_COMPLETE') && enemies.map(enemy => {
          const onScreen =
            enemy.x + enemy.width  > camera.x &&
            enemy.x                < camera.x + gameArea.width &&
            enemy.y + enemy.height > camera.y &&
            enemy.y                < camera.y + gameArea.height;
          if (onScreen) return null;
          return (
            <OffScreenIndicator
              key={enemy.id}
              target={enemy}
              indicatorType="enemy"
              player={player}
              camera={camera}
              viewport={gameArea}
            />
          );
        })}
        {(gameStatus === 'PLAYING' || gameStatus === 'ROUND_COMPLETE') && collectibleAllies.map(ca => {
          const onScreen =
            ca.x + ca.width  > camera.x &&
            ca.x             < camera.x + gameArea.width &&
            ca.y + ca.height > camera.y &&
            ca.y             < camera.y + gameArea.height;
          if (onScreen) return null;
          return (
            <OffScreenIndicator
              key={ca.id}
              target={ca}
              indicatorType="collectibleAlly"
              player={player}
              camera={camera}
              viewport={gameArea}
            />
          );
        })}
        {currentWaveTitleOpacity > 0 && (gameStatus === 'PLAYING' || gameStatus === 'INIT_NEW_RUN' || gameStatus === 'ROUND_COMPLETE') && (
          <WaveStartTitle text={waveTitleText} opacity={currentWaveTitleOpacity} />
        )}
      </>
    );

    if (gameStatus === 'GAME_OVER') {
        return (
            <>
                {gameScreenElements}
                <GameOverScreen
                    player={player}
                    round={round}
                    onGoToMenu={goToMenu}
                    onGoToShop={restartFromGameOver}
                    onRetry={playNewRunFromShop}
                />
            </>
        );
    }


    if (gameStatus === 'PAUSED') {
      return (
        <>
          {gameScreenElements}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center z-[900]"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)'}}
            aria-modal="true"
            role="dialog"
            aria-labelledby="pause-dialog-title"
          >
            <h2
              id="pause-dialog-title"
              className="text-6xl sm:text-7xl select-none uppercase mb-6"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: '100', 
                color: UI_BACKGROUND_NEUTRAL,
              }}
            >
              PAUSED
            </h2>
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePause();
              }}
              className="btn-minimal mb-3 py-2.5 px-8 text-lg"
              style={{borderColor: UI_BACKGROUND_NEUTRAL, color: UI_BACKGROUND_NEUTRAL, backgroundColor: 'rgba(0,0,0,0.2)', minWidth: '200px'}}
              aria-label="Resume Game"
            >
              RESUME
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToMenu();
              }}
              className="btn-minimal py-2.5 px-8 text-lg"
              style={{borderColor: UI_BACKGROUND_NEUTRAL, color: UI_BACKGROUND_NEUTRAL, backgroundColor: 'rgba(0,0,0,0.2)', minWidth: '200px'}}
              aria-label="Return to Menu"
            >
              MENU
            </button>
          </div>
        </>
      );
    }

    if (gameStatus === 'PLAYING' || gameStatus === 'INIT_NEW_RUN' || gameStatus === 'GAME_OVER_PENDING' || gameStatus === 'ROUND_COMPLETE') {
        return gameScreenElements;
    }

    if (gameStatus === 'TUTORIAL_ACTIVE') {
        return (
            <>
                {gameScreenElements}
                <TutorialOverlay
                    currentMessageHTML={tutorialMessages[tutorialStep] || "Tutorial step message missing."}
                    onNextStep={advanceTutorialStep}
                    onEndTutorial={endTutorialMode}
                    isLastStep={tutorialStep >= tutorialMessages.length - 1}
                />
            </>
        );
    }

    return null;
  };

  return (
    <div
      ref={gameOuterContainerRef}
      className="w-full h-full flex justify-center items-center overflow-hidden"
      style={{ backgroundColor: UI_STROKE_SECONDARY }} 
    >
      {/* BackgroundAnimation is fixed, zIndex 0, provides white bg and animated entities */}
      {gameStatus === 'IDLE' && (
        <BackgroundAnimation viewportWidth={trueFullscreenSize.width} viewportHeight={trueFullscreenSize.height} />
      )}
      {/* StaticFieldLinesBackground for IDLE state, full screen, zIndex 1 (above BackgroundAnimation) */}
      {gameStatus === 'IDLE' && (
        <StaticFieldLinesBackground
          worldArea={trueFullscreenSize}
          camera={{ x: 0, y: 0 }}
          gameArea={trueFullscreenSize}
          lineColor={UI_ACCENT_SUBTLE + '99'} // Slightly transparent lines
          numberOfLines={100} // Reduced from 250
          strokeWidth={1}
        />
      )}
      {/* gameAreaRef for main content, zIndex 5 (above background layers) */}
      <div
        ref={gameAreaRef}
        className={`relative overflow-hidden game-cursor select-none noselect ${
            gameStatus !== 'IDLE' ? 'game-area-background' : '' // Solid white for game, transparent for IDLE to show full-bg anims
        }`}
        style={{
          width: `${visualGameSize.width}px`,
          height: `${visualGameSize.height}px`,
          zIndex: 5, 
        }}
        tabIndex={0}
        onClick={handleGameAreaClick}
      >
        {gameContent()}
      </div>
      {isTouchDevice && (gameStatus === 'PLAYING' || gameStatus === 'PAUSED' || gameStatus === 'GAME_OVER_PENDING' || gameStatus === 'TUTORIAL_ACTIVE') && (
        <Joystick
          onMove={handleJoystickMove}
          onRelease={handleJoystickRelease}
          baseSize={80} 
          knobSize={50}
          joystickPosition={{
            bottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
            left: 'max(20px, env(safe-area-inset-left, 20px))', // Moved to bottom-left
          }}
        />
      )}
    </div>
  );
};
