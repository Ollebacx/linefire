import React from 'react';
import { useGameStore } from '../src/stores/gameStore';
import { HUD } from './HUD';
import OffScreenIndicator from './OffScreenIndicator';
import WaveStartTitle from './WaveStartTitle';
import GameOverScreen from './GameOverScreen';
import TutorialOverlay from './TutorialOverlay';
import SoundSettingsPanel from './SoundSettingsPanel';
import { GameCanvas } from '../src/renderer/GameCanvas';
import { WAVE_TITLE_FADE_OUT_DURATION_TICKS } from '../constants';
import type { SoundVolumes } from './SoundSettingsPanel';

export interface GameplayUIProps {
  visualWidth: number;
  visualHeight: number;
  isMuted: boolean;
  onToggleMute: () => void;
  soundVolumes: SoundVolumes;
  onVolumeChange: (key: keyof SoundVolumes, value: number) => void;
  showSoundPanel: boolean;
  onToggleSoundPanel: () => void;
  onCloseSoundPanel: () => void;
  onPauseToggle: () => void;
  onGoToMenu: () => void;
  onGoToShop: () => void;
  onRetry: () => void;
  onActivateAirstrike: () => void;
  onDeployShield: () => void;
  onAdvanceTutorial: () => void;
  onEndTutorial: () => void;
}

/**
 * GameplayUI — owns all fast-changing store subscriptions.
 * Extracted from App so App itself only re-renders on screen transitions,
 * not 60 times per second during gameplay.
 */
const GameplayUI: React.FC<GameplayUIProps> = ({
  visualWidth, visualHeight,
  isMuted, onToggleMute, soundVolumes, onVolumeChange,
  showSoundPanel, onToggleSoundPanel, onCloseSoundPanel,
  onPauseToggle, onGoToMenu, onGoToShop, onRetry,
  onActivateAirstrike, onDeployShield,
  onAdvanceTutorial, onEndTutorial,
}) => {
  // Full subscription — this component re-renders at game-loop frequency.
  // Only GameplayUI's small subtree is reconciled (not App's full tree).
  const {
    player, round, gameStatus, totalEnemiesThisRound, currentWaveEnemies,
    nextRoundTimer, nextAllySpawnTimer, nextAllyType, isTouchDevice,
    camera, airstrikeAvailable, airstrikeActive,
    waveTitleText, waveTitleTimer,
    tutorialStep, tutorialMessages, tutorialEntities,
    gameArea, collectibleAllies, enemies,
  } = useGameStore();

  const isHealthCritical =
    player.health > 0 && player.maxHealth > 0 &&
    player.health / player.maxHealth < 0.30;

  const waveTitleOpacity =
    waveTitleTimer <= 0 ? 0
    : waveTitleTimer <= WAVE_TITLE_FADE_OUT_DURATION_TICKS
      ? waveTitleTimer / WAVE_TITLE_FADE_OUT_DURATION_TICKS
      : 1;

  const coreUI = (
    <>
      {/* Low-HP vignette */}
      {isHealthCritical && (gameStatus === 'PLAYING' || gameStatus === 'GAME_OVER_PENDING') && (
        <div className="hp-vignette" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50 }} />
      )}

      <HUD
        player={player}
        round={gameStatus === 'TUTORIAL_ACTIVE' ? 0 : round}
        enemiesLeft={currentWaveEnemies}
        totalEnemiesThisRound={totalEnemiesThisRound}
        gameStatus={gameStatus}
        nextRoundTimer={gameStatus === 'TUTORIAL_ACTIVE' ? undefined : nextRoundTimer}
        nextAllySpawnTimer={gameStatus === 'TUTORIAL_ACTIVE' ? 9999 : nextAllySpawnTimer}
        nextAllyType={gameStatus === 'TUTORIAL_ACTIVE' ? null : nextAllyType}
        onPauseToggle={onPauseToggle}
        isPaused={gameStatus === 'PAUSED'}
        airstrikeAvailable={gameStatus === 'TUTORIAL_ACTIVE' ? (player.airstrikeAvailable || false) : airstrikeAvailable}
        airstrikeActive={airstrikeActive}
        tutorialHighlightTarget={gameStatus === 'TUTORIAL_ACTIVE' ? tutorialEntities.tutorialHighlightTarget : null}
        isMuted={isMuted}
        onToggleMute={onToggleMute}
        isTouchDevice={isTouchDevice}
        onActivateAirstrike={onActivateAirstrike}
        onDeployShield={onDeployShield}
        showSoundPanel={showSoundPanel}
        onToggleSoundPanel={onToggleSoundPanel}
        onCloseSoundPanel={onCloseSoundPanel}
        soundVolumes={soundVolumes}
        onVolumeChange={onVolumeChange}
      />

      <GameCanvas width={visualWidth} height={visualHeight} />

      {/* Off-screen enemy indicators */}
      {(gameStatus === 'PLAYING' || gameStatus === 'ROUND_COMPLETE') && enemies.map(enemy => {
        const onScreen =
          enemy.x + enemy.width  > camera.x && enemy.x < camera.x + gameArea.width &&
          enemy.y + enemy.height > camera.y && enemy.y < camera.y + gameArea.height;
        if (onScreen) return null;
        return (
          <OffScreenIndicator key={enemy.id} target={enemy} indicatorType="enemy"
            player={player} camera={camera} viewport={gameArea} />
        );
      })}

      {/* Off-screen collectible ally indicators */}
      {(gameStatus === 'PLAYING' || gameStatus === 'ROUND_COMPLETE') && collectibleAllies.map(ca => {
        const onScreen =
          ca.x + ca.width  > camera.x && ca.x < camera.x + gameArea.width &&
          ca.y + ca.height > camera.y && ca.y < camera.y + gameArea.height;
        if (onScreen) return null;
        return (
          <OffScreenIndicator key={ca.id} target={ca} indicatorType="collectibleAlly"
            player={player} camera={camera} viewport={gameArea} />
        );
      })}

      {/* Wave title */}
      {waveTitleOpacity > 0 &&
       (gameStatus === 'PLAYING' || gameStatus === 'INIT_NEW_RUN' || gameStatus === 'ROUND_COMPLETE') && (
        <WaveStartTitle text={waveTitleText} opacity={waveTitleOpacity} />
      )}
    </>
  );

  // ── PAUSED overlay ──────────────────────────────────────────────────────
  if (gameStatus === 'PAUSED') {
    return (
      <>
        {coreUI}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center z-[900]"
          style={{ backgroundColor: 'rgba(4,6,14,0.78)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          aria-modal="true" role="dialog" aria-labelledby="pause-dialog-title"
        >
          <h2
            id="pause-dialog-title"
            className="select-none uppercase mb-8"
            style={{
              fontFamily: "'Inter', sans-serif", fontWeight: '100',
              fontSize: 'clamp(3rem, 8vw, 5rem)', letterSpacing: '0.18em',
              color: '#E2E8F0', textShadow: '0 0 40px rgba(0,229,255,0.25)',
            }}
          >
            PAUSED
          </h2>
          <button
            onClick={(e) => { e.stopPropagation(); onPauseToggle(); }}
            className="btn-primary-minimal mb-3"
            style={{ minWidth: '200px', padding: '0.75rem 2rem', fontSize: '0.85rem' }}
          >
            RESUME
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onGoToMenu(); }}
            className="btn-minimal"
            style={{ minWidth: '200px', padding: '0.65rem 2rem', fontSize: '0.8rem' }}
          >
            MENU
          </button>
          <div style={{ marginTop: '2rem', width: '220px' }}>
            <div style={{
              fontFamily: "'Inter', sans-serif", fontSize: '0.52rem', fontWeight: 300,
              letterSpacing: '0.22em', color: 'rgba(0,229,255,0.45)',
              textTransform: 'uppercase', marginBottom: '10px',
            }}>
              AUDIO
            </div>
            <SoundSettingsPanel
              volumes={soundVolumes} isMuted={isMuted}
              onVolumeChange={onVolumeChange} onToggleMute={onToggleMute}
              onClose={() => {}} embedded
            />
          </div>
        </div>
      </>
    );
  }

  // ── GAME_OVER overlay ────────────────────────────────────────────────────
  if (gameStatus === 'GAME_OVER') {
    return (
      <>
        {coreUI}
        <div className="lf-screen-enter" style={{ position: 'absolute', inset: 0 }}>
          <GameOverScreen
            player={player} round={round}
            onGoToMenu={onGoToMenu} onGoToShop={onGoToShop} onRetry={onRetry}
          />
        </div>
      </>
    );
  }

  // ── TUTORIAL overlay ─────────────────────────────────────────────────────
  if (gameStatus === 'TUTORIAL_ACTIVE') {
    return (
      <>
        {coreUI}
        <TutorialOverlay
          currentMessageHTML={tutorialMessages[tutorialStep] || 'Tutorial step message missing.'}
          onNextStep={onAdvanceTutorial}
          onEndTutorial={onEndTutorial}
          isLastStep={tutorialStep >= tutorialMessages.length - 1}
        />
      </>
    );
  }

  // PLAYING | INIT_NEW_RUN | GAME_OVER_PENDING | ROUND_COMPLETE
  return coreUI;
};

export default GameplayUI;
