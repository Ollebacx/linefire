
import React from 'react';
import { Player } from '../types';
import { UI_BACKGROUND_NEUTRAL, UI_STROKE_PRIMARY, UI_STROKE_SECONDARY } from '../constants';

interface GameOverScreenProps {
  player: Player; 
  round: number;
  onGoToMenu: () => void;
  onGoToShop: () => void;
  onRetry: () => void;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ player, round, onGoToMenu, onGoToShop, onRetry }) => {
  const moneyCollected = player.currentRunCoinsEarned;
  const enemiesKilled = player.currentRunKills;
  const highestKillCombo = player.highestComboCount || 0;
  const biggestSquad = player.maxSquadSizeAchieved || 0;

  const enemiesKilledScore = enemiesKilled * 10;
  const highestKillComboScore = highestKillCombo * 100;
  const biggestSquadScore = biggestSquad * 100;

  const totalScore = moneyCollected + enemiesKilledScore + highestKillComboScore + biggestSquadScore;

  const baseStatStyle: React.CSSProperties = { fontFamily: "'Inter', sans-serif" };
  const statRowStyle = "flex justify-between items-baseline text-md sm:text-lg py-1";
  const statLabelStyle: React.CSSProperties = { ...baseStatStyle, fontWeight: '400', textAlign: 'left', flexShrink: 0 };
  const statValueContainerStyle = "flex items-baseline justify-end ml-2 flex-grow";
  const statValueStyle: React.CSSProperties = { ...baseStatStyle, fontWeight: '600', textAlign: 'right' };
  const statMultiplierStyle: React.CSSProperties = { ...baseStatStyle, fontSize: '0.75rem', fontWeight: '400', color: UI_STROKE_SECONDARY, marginLeft: '0.5rem', width: '50px', textAlign: 'left' };


  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4" 
      aria-modal="true"
      role="dialog"
      aria-labelledby="game-over-title"
    >
      <div 
        className="p-5 sm:p-6 md:p-8 rounded-lg w-full max-w-md sm:max-w-lg text-center shadow-xl"
        style={{ backgroundColor: UI_BACKGROUND_NEUTRAL, border: `1.5px solid ${UI_STROKE_PRIMARY}`, color: UI_STROKE_PRIMARY }}
      >
        <h1 id="game-over-title" className="text-4xl sm:text-5xl mb-6 sm:mb-8 uppercase" style={{...baseStatStyle, fontWeight: '100', color: UI_STROKE_PRIMARY}}>
          GAME OVER
        </h1>

        <div className="space-y-1 mb-6 sm:mb-8 text-left px-2 sm:px-4">
          <div className={statRowStyle}>
            <span style={statLabelStyle}>MONEY COLLECTED:</span>
            <div className={statValueContainerStyle}>
              <span style={statValueStyle}>{moneyCollected}</span>
              <span style={statMultiplierStyle}></span> 
            </div>
          </div>
          <div className={statRowStyle}>
            <span style={statLabelStyle}>ENEMIES KILLED:</span>
            <div className={statValueContainerStyle}>
              <span style={statValueStyle}>{enemiesKilled}</span>
              <span style={statMultiplierStyle}>[X10]</span>
            </div>
          </div>
          <div className={statRowStyle}>
            <span style={statLabelStyle}>HIGHEST KILL COMBO:</span>
            <div className={statValueContainerStyle}>
              <span style={statValueStyle}>{highestKillCombo}</span>
              <span style={statMultiplierStyle}>[X100]</span>
            </div>
          </div>
          <div className={statRowStyle}>
            <span style={statLabelStyle}>BIGGEST SQUAD:</span>
            <div className={statValueContainerStyle}>
              <span style={statValueStyle}>{biggestSquad}</span>
              <span style={statMultiplierStyle}>[X100]</span>
            </div>
          </div>
        </div>

        <div className="mb-6 sm:mb-8">
          <p className="text-xl sm:text-2xl" style={{...baseStatStyle, fontWeight: '600', color: UI_STROKE_PRIMARY}}>TOTAL SCORE:</p>
          <p className="text-3xl sm:text-4xl" style={{...baseStatStyle, fontWeight: '700', color: UI_STROKE_PRIMARY}}>{totalScore}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <button
            onClick={onGoToMenu}
            className="btn-minimal w-full py-2.5 sm:py-3 text-sm sm:text-md"
            aria-label="Return to Menu"
          >
            MENU
          </button>
          <button
            onClick={onGoToShop}
            className="btn-minimal w-full py-2.5 sm:py-3 text-sm sm:text-md"
            aria-label="Go to Shop"
          >
            SHOP
          </button>
          <button
            onClick={onRetry}
            className="btn-minimal w-full py-2.5 sm:py-3 text-sm sm:text-md" 
            aria-label="Retry Run"
          >
            RETRY
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverScreen;