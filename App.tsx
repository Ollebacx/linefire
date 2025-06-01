
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useGameLogic } from './hooks/useGameLogic';
import GameObjectView from './components/GameObjectView';
import HUD from './components/HUD';
import { UpgradeModal } from './components/UpgradeModal'; 
import StartScreen from './components/StartScreen';
import GameOverScreen from './components/GameOverScreen';
import ChampionSelectScreen from './components/ChampionSelectScreen';
import OffScreenIndicator from './components/OffScreenIndicator';
import Joystick from './components/Joystick';
import StaticFieldLinesBackground from './components/StaticFieldLinesBackground'; 
import WaveStartTitle from './components/WaveStartTitle'; 
import TutorialOverlay from './components/TutorialOverlay'; 
import { CHAMPION_CHOICES, WORLD_AREA, UI_BACKGROUND_NEUTRAL, UI_STROKE_PRIMARY, UI_ACCENT_SUBTLE, WAVE_TITLE_STAY_DURATION_TICKS, WAVE_TITLE_FADE_OUT_DURATION_TICKS } from './constants';
import { Player, Ally, Enemy, GameState, Projectile, Position, Size, TutorialEntities } from './types';

// Helper component to render the main game scene elements
const RenderGameScene: React.FC<{ gameState: GameState, isTutorialActive?: boolean }> = ({ gameState, isTutorialActive = false }) => {
  const {
    player, enemies, projectiles, coins, collectibleAllies, camera, gameStatus, gameArea, gameOverPendingTimer, tutorialEntities
  } = gameState;

  const entitiesToRender = {
    projectiles: isTutorialActive ? projectiles : projectiles, 
    coins: isTutorialActive ? tutorialEntities.coins : coins,
    collectibleAllies: isTutorialActive ? tutorialEntities.collectibleAllies : collectibleAllies,
    enemies: isTutorialActive ? tutorialEntities.enemies : enemies,
  };


  return (
    <>
      {entitiesToRender.projectiles.map(p =>
          <GameObjectView
              key={p.id}
              gameObject={{...p, color: UI_STROKE_PRIMARY, velocity: p.velocity}} 
              entityType="projectile"
              camera={camera}
              viewport={gameArea}
          />
      )}
      {entitiesToRender.coins.map(c =>
          <GameObjectView
              key={c.id}
              gameObject={{...c, color: UI_STROKE_PRIMARY}} 
              entityType="coin"
              camera={camera}
              viewport={gameArea}
          />
      )}
      {entitiesToRender.collectibleAllies.map(ca => (
        <GameObjectView
          key={ca.id}
          gameObject={ca}
          entityType="collectibleAlly"
          camera={camera}
          viewport={gameArea}
        />
      ))}

      {((): JSX.Element[] => {
        type RenderableCharacter =
          | { type: 'player'; obj: Player }
          | { type: 'ally'; obj: Ally }
          | { type: 'enemy'; obj: Enemy };

        const charactersToRender: RenderableCharacter[] = [
          { type: 'player', obj: player },
          ...player.allies.map(ally => ({ type: 'ally' as const, obj: ally })),
          ...entitiesToRender.enemies.map(enemy => ({ type: 'enemy' as const, obj: enemy })),
        ];

        charactersToRender.sort((a, b) => (a.obj.y + a.obj.height) - (b.obj.y + b.obj.height));

        return charactersToRender.map(item => (
          <GameObjectView
            key={item.obj.id}
            gameObject={item.obj} 
            entityType={item.type}
            camera={camera}
            viewport={gameArea}
            gameStatusForPlayer={item.type === 'player' ? gameStatus : undefined}
            gameOverPendingTimerForPlayer={item.type === 'player' ? gameOverPendingTimer : undefined}
          />
        ));
      })()}

      { (gameStatus === 'PLAYING' || gameStatus === 'PAUSED' || gameStatus === 'GAME_OVER_PENDING' || isTutorialActive) &&
        entitiesToRender.collectibleAllies.map(ca => {
          const targetCenterXOnScreen = ca.x - camera.x + ca.width / 2;
          const targetCenterYOnScreen = ca.y - camera.y + ca.height / 2;
          const isCenterOnScreen =
              targetCenterXOnScreen >= 0 && targetCenterXOnScreen <= gameArea.width &&
              targetCenterYOnScreen >= 0 && targetCenterYOnScreen <= gameArea.height;
          if (!isCenterOnScreen) {
              return (
                  <OffScreenIndicator
                      key={`indicator-ally-${ca.id}`}
                      target={ca}
                      indicatorType="collectibleAlly"
                      player={player}
                      camera={camera}
                      viewport={gameArea}
                  />
              );
          }
          return null;
      })}

      { (gameStatus === 'PLAYING' || gameStatus === 'PAUSED' || gameStatus === 'GAME_OVER_PENDING' || isTutorialActive) &&
        entitiesToRender.enemies.map(enemy => {
          const targetCenterXOnScreen = enemy.x - camera.x + enemy.width / 2;
          const targetCenterYOnScreen = enemy.y - camera.y + enemy.height / 2;
          const isCenterOnScreen =
              targetCenterXOnScreen >= 0 && targetCenterXOnScreen <= gameArea.width &&
              targetCenterYOnScreen >= 0 && targetCenterYOnScreen <= gameArea.height;
          if (!isCenterOnScreen) {
              return (
                  <OffScreenIndicator
                      key={`indicator-enemy-${enemy.id}`}
                      target={enemy}
                      indicatorType="enemy"
                      player={player}
                      camera={camera}
                      viewport={gameArea}
                  />
              );
          }
          return null;
      })}
    </>
  );
};


export const App: React.FC = () => {
  const [visualGameSize, setVisualGameSize] = useState<Size>({ width: 800, height: 600 });
  const gameOuterContainerRef = useRef<HTMLDivElement>(null);
  const isTouchDeviceInitially = typeof window !== 'undefined' && (('ontouchstart' in window) || navigator.maxTouchPoints > 0);

  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);

  const {
    gameState,
    gameAreaRef,
    startGame,
    confirmChampionSelection,
    purchaseUpgrade,
    playNewRunFromShop,
    goToMenu,
    resetGameData, 
    restartFromGameOver,
    togglePause,
    handleJoystickMove,
    handleJoystickRelease,
    updateGameAreaSize,
    activateAirstrike, 
    startTutorialMode,
    advanceTutorialStep,
    endTutorialMode,
  } = useGameLogic(visualGameSize, isTouchDeviceInitially);

  const {
    player, round, gameStatus, totalEnemiesThisRound, currentWaveEnemies,
    availableUpgrades, nextRoundTimer, nextAllySpawnTimer, isTouchDevice,
    camera, airstrikeAvailable, airstrikeActive, logs, gameOverPendingTimer,
    waveTitleText, waveTitleTimer, tutorialStep, tutorialMessages, tutorialEntities
  } = gameState;

  useEffect(() => {
    const ambientElement = document.getElementById('ambient-sound');
    if (ambientElement instanceof HTMLAudioElement) {
      ambientAudioRef.current = ambientElement;
    } else {
      console.warn('Failed to get ambient-sound HTMLAudioElement. Found:', ambientElement);
      ambientAudioRef.current = null;
    }

    const backgroundElement = document.getElementById('background-music');
    if (backgroundElement instanceof HTMLAudioElement) {
      backgroundAudioRef.current = backgroundElement;
    } else {
      console.warn('Failed to get background-music HTMLAudioElement. Found:', backgroundElement);
      backgroundAudioRef.current = null;
    }
  }, []);

  const playAudio = useCallback(async (audioRef: React.RefObject<HTMLAudioElement>, audioName: string) => {
    const audioEl = audioRef.current;
    if (audioEl && typeof audioEl.play === 'function') {
      try {
        audioEl.muted = false;
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
  }, []);

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
  }, [gameStatus, playAudio, pauseAudio, stopAudio]);


  useEffect(() => {
    const calculateAndSetGameArea = () => {
      if (gameOuterContainerRef.current) {
        const containerWidth = gameOuterContainerRef.current.clientWidth;
        const containerHeight = gameOuterContainerRef.current.clientHeight;
        
        if (containerWidth === 0 || containerHeight === 0) return;
        
        let newVisualSize: Size = { width: containerWidth, height: containerHeight };
        newVisualSize.width = Math.max(newVisualSize.width, 320); 
        newVisualSize.height = Math.max(newVisualSize.height, 320); 

        setVisualGameSize(currentSize => {
            if (currentSize.width !== newVisualSize.width || currentSize.height !== newVisualSize.height) {
                 if (updateGameAreaSize) updateGameAreaSize(newVisualSize);
                return newVisualSize;
            }
            return currentSize;
        });
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
    if (event.target instanceof HTMLButtonElement || (event.target instanceof HTMLElement && event.target.closest('button'))) {
        return; 
    }
    if (gameAreaRef.current && (event.target === gameAreaRef.current || gameAreaRef.current.contains(event.target as Node))) {
        let isUIElement = false;
        const hudElement = document.querySelector('.absolute.top-0.left-0.w-full'); 
        if (hudElement && hudElement.contains(event.target as Node)) {
            const clickedOnPauseButton = (event.target as HTMLElement).closest('button[aria-label*="Pause"], button[aria-label*="Resume"]');
            if (clickedOnPauseButton) {
                isUIElement = true; 
            } else {
                const dataTutorialHighlightElements = (event.target as HTMLElement).closest('[data-tutorial-highlight-id]');
                if (dataTutorialHighlightElements) { 
                    isUIElement = true;
                }
            }
        }
        
        if (!isUIElement) {
          if (gameStatus === 'PLAYING' && gameState.airstrikeAvailable && !gameState.airstrikeActive) {
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
      return <StartScreen onStart={startGame} onStartTutorial={startTutorialMode} />;
    }
    if (gameStatus === 'CHAMPION_SELECT') {
      return <ChampionSelectScreen champions={CHAMPION_CHOICES} onSelectChampion={confirmChampionSelection} onGoBack={goToMenu} />;
    }
    
    const backgroundElement = (gameStatus === 'SHOP' || gameStatus === 'PLAYING' || gameStatus === 'PAUSED' || gameStatus === 'GAME_OVER_PENDING' || gameStatus === 'TUTORIAL_ACTIVE') ? (
        <StaticFieldLinesBackground worldArea={WORLD_AREA} camera={camera} gameArea={gameState.gameArea} />
      ) : null;

    if (gameStatus === 'SHOP') {
      return (
        <>
          {backgroundElement}
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
        {backgroundElement}
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
        />
        <RenderGameScene gameState={gameState} isTutorialActive={gameStatus === 'TUTORIAL_ACTIVE'} />
        {currentWaveTitleOpacity > 0 && (gameStatus === 'PLAYING' || gameStatus === 'INIT_NEW_RUN') && (
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
            onClick={togglePause} 
          >
            <h2
              id="pause-dialog-title"
              className="text-6xl sm:text-7xl select-none uppercase"
              style={{ 
                fontFamily: "'Inter', sans-serif",
                fontWeight: '100', // Thin weight
                color: UI_BACKGROUND_NEUTRAL, 
                textShadow: `0 0 10px ${UI_STROKE_PRIMARY}, 0 0 20px ${UI_STROKE_PRIMARY}` 
              }}
            >
              PAUSED
            </h2>
            <button
              onClick={(e) => {
                e.stopPropagation(); 
                goToMenu();
              }}
              className="btn-minimal mt-8 py-2 px-6 text-lg"
              style={{borderColor: UI_BACKGROUND_NEUTRAL, color: UI_BACKGROUND_NEUTRAL, backgroundColor: 'rgba(0,0,0,0.2)'}}
              aria-label="Return to Menu"
            >
              Return to Menu
            </button>
          </div>
        </>
      );
    }
    
    if (gameStatus === 'PLAYING' || gameStatus === 'INIT_NEW_RUN' || gameStatus === 'GAME_OVER_PENDING') {
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
    >
      <div
        ref={gameAreaRef}
        className="relative overflow-hidden game-cursor select-none noselect game-area-background" 
        style={{
          width: `${visualGameSize.width}px`,
          height: `${visualGameSize.height}px`,
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
          baseSize={100} 
          knobSize={50}  
          joystickPosition={{
            bottom: 'max(20px, env(safe-area-inset-bottom, 20px))', 
            left: 'max(20px, env(safe-area-inset-left, 20px))', 
          }}
        />
      )}
    </div>
  );
};