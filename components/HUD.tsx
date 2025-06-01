
import React from 'react';
import { Player, GameState, TutorialHighlightTarget } from '../types';
import { PauseIcon, PlayIcon } from '@heroicons/react/24/solid';
import { UI_STROKE_PRIMARY, UI_BACKGROUND_NEUTRAL, UI_ACCENT_CRITICAL, UI_STROKE_SECONDARY, UI_ACCENT_SUBTLE, ALLY_SPAWN_INTERVAL, UI_ACCENT_HEALTH, UI_ACCENT_WARNING } from '../constants';

interface HUDProps {
  player: Player;
  round: number;
  enemiesLeft: number; 
  totalEnemiesThisRound: number; 
  gameStatus: GameState['gameStatus'];
  nextRoundTimer?: number;
  nextAllySpawnTimer: number;
  onPauseToggle: () => void;
  isPaused: boolean;
  airstrikeAvailable: boolean;
  airstrikeActive: boolean;
  tutorialHighlightTarget?: TutorialHighlightTarget;
}

const HUD: React.FC<HUDProps> = ({ 
  player, round, enemiesLeft, totalEnemiesThisRound, gameStatus, 
  nextRoundTimer, nextAllySpawnTimer, onPauseToggle, isPaused,
  airstrikeAvailable, airstrikeActive, tutorialHighlightTarget
}) => {
  const healthPercentage = (player.health / player.maxHealth) * 100;
  const isHealthLow = healthPercentage < 30;

  const baseTextStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    color: UI_STROKE_PRIMARY,
  };

  const textStyle: React.CSSProperties = {
    ...baseTextStyle,
    fontWeight: '400', // Regular for general text
  };
  const smallTextStyle: React.CSSProperties = { ...baseTextStyle, fontSize: '0.8rem', lineHeight: '1rem', fontWeight: '400'};
  const headingStyle: React.CSSProperties = { ...baseTextStyle, fontSize: '1rem', fontWeight: '600' }; // Semibold for headings
  
  const barHeight = 'h-3 sm:h-4';
  const barWidth = 'w-24 sm:w-32';

  let topCenterDynamicMessage = null;
  const topCenterMessageBaseStyle: React.CSSProperties = {
    ...baseTextStyle, 
    fontSize: '0.9rem',
    lineHeight: '1.1rem', 
    fontWeight: '500', // Medium for status messages
    marginTop: '0.25rem', 
  };

  if (gameStatus !== 'TUTORIAL_ACTIVE') {
    if (airstrikeActive) {
      topCenterDynamicMessage = (
        <p style={{...topCenterMessageBaseStyle, color: UI_ACCENT_WARNING }}>
          AIRSTRIKE INBOUND!
        </p>
      );
    } else if (airstrikeAvailable) {
      topCenterDynamicMessage = (
        <p style={{...topCenterMessageBaseStyle, color: UI_ACCENT_WARNING }}>
          AIRSTRIKE READY!
          <br/>
          <span style={{fontSize: '0.75rem', fontWeight: '400'}}>(Q/Click Screen)</span>
        </p>
      );
    } else if (player.comboCount > 0) {
      topCenterDynamicMessage = (
         <p style={{...topCenterMessageBaseStyle, color: UI_STROKE_PRIMARY }}>
          Combo: {player.comboCount}x
        </p>
      );
    }
  } else { 
    if (tutorialHighlightTarget === null && player.airstrikeActive) { 
       topCenterDynamicMessage = (
        <p style={{...topCenterMessageBaseStyle, color: UI_ACCENT_WARNING }}>
          AIRSTRIKE INBOUND!
        </p>
      );
    } else if (tutorialHighlightTarget === null && player.airstrikeAvailable) {
      topCenterDynamicMessage = (
        <p style={{...topCenterMessageBaseStyle, color: UI_ACCENT_WARNING }}>
          AIRSTRIKE READY! <span style={{fontSize: '0.75rem', fontWeight: '400'}}>(Q/Click Screen)</span>
        </p>
      );
    }
  }


  return (
    <>
      <div className="absolute top-0 left-0 w-full p-2 sm:p-3 z-10 flex justify-between items-start text-xs sm:text-sm">
        {/* Left Section: Health, Ally Timer */}
        <div className="flex flex-col items-start space-y-1.5">
          {/* Health Bar */}
          <div 
            className={`flex items-center ${tutorialHighlightTarget === 'health' ? 'hud-highlight' : ''}`}
            data-tutorial-highlight-id="health"
          >
            <div className={`${barWidth} ${barHeight} rounded-sm`} style={{ border: `1.5px solid ${UI_STROKE_SECONDARY}`, backgroundColor: UI_BACKGROUND_NEUTRAL }}>
              <div
                className="h-full transition-all duration-150 ease-linear rounded-sm"
                style={{
                    width: `${Math.max(0, healthPercentage)}%`,
                    backgroundColor: isHealthLow ? UI_ACCENT_CRITICAL : UI_ACCENT_HEALTH
                }}
                aria-hidden="true"
              ></div>
            </div>
            <p style={{...smallTextStyle, fontWeight: '500', color: isHealthLow ? UI_ACCENT_CRITICAL : UI_STROKE_PRIMARY }} className="ml-1.5 sm:ml-2" aria-live="polite" aria-atomic="true">{Math.max(0, player.health).toFixed(0)}/{player.maxHealth.toFixed(0)}</p>
          </div>

          {/* Ally Spawn Timer Text */}
          <div 
            className={`flex items-center ${tutorialHighlightTarget === 'allyTimer' ? 'hud-highlight' : ''}`}
            data-tutorial-highlight-id="allyTimer"
          >
            <p style={{...smallTextStyle, color: UI_STROKE_PRIMARY, fontWeight: '400' }} className="ml-0">
              Next Ally: {Math.round(Math.max(0, nextAllySpawnTimer))}s
            </p>
          </div>
        </div>

        {/* Top Center Section: Coins, Airstrike Status / Combo */}
        <div className="absolute left-1/2 top-2 sm:top-3 transform -translate-x-1/2 flex flex-col items-center pointer-events-none">
            {/* Coins Display */}
            <div 
                className={`${tutorialHighlightTarget === 'coins' ? 'hud-highlight' : ''}`}
                data-tutorial-highlight-id="coins"
            >
                <p style={{...headingStyle, fontSize: '1.2rem', fontWeight: '700'}} className="flex items-center">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1" aria-hidden="true">
                    <circle cx="8" cy="8" r="6.5" stroke={UI_STROKE_PRIMARY} strokeWidth="1.5"/>
                    </svg>
                    {player.coins}
                </p>
            </div>
            {/* Airstrike / Combo Display (below coins) */}
            {topCenterDynamicMessage && (
                <div className="text-center">
                    {topCenterDynamicMessage}
                </div>
            )}
        </div>
        
        {/* Right Section: Round & Control Buttons */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          <div 
            className={`text-right ${tutorialHighlightTarget === 'wave' ? 'hud-highlight' : ''}`}
            data-tutorial-highlight-id="wave"
          >
            <h2 style={{...headingStyle, fontWeight: '600'}}>Wave: {round}</h2>
            {gameStatus === 'PLAYING' && nextRoundTimer !== undefined && nextRoundTimer > 0 && enemiesLeft >= totalEnemiesThisRound && (
              <p style={{...smallTextStyle, color: UI_STROKE_SECONDARY, fontWeight: '400' }} className="mt-0.5">
                Next: <span style={{color: UI_STROKE_PRIMARY, fontWeight: '500'}}>{Math.ceil(nextRoundTimer)}s</span>
              </p>
            )}
          </div>
          <button
            onClick={onPauseToggle}
            className="p-1.5 sm:p-2 rounded-md"
            style={{ border: `1.5px solid ${UI_STROKE_PRIMARY}`, backgroundColor: UI_BACKGROUND_NEUTRAL }}
            aria-label={isPaused ? "Resume game" : "Pause game"}
            aria-pressed={isPaused}
          >
            {isPaused ? <PlayIcon className="w-4 h-4 sm:w-5 sm:h-5" style={{color: UI_STROKE_PRIMARY}} /> : <PauseIcon className="w-4 h-4 sm:w-5 sm:h-5" style={{color: UI_STROKE_PRIMARY}} />}
          </button>
        </div>
      </div>
    </>
  );
};

export default HUD;