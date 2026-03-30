
import React from 'react';
import { Player, GameState, TutorialHighlightTarget } from '../types';
import { PauseIcon, PlayIcon, SpeakerWaveIcon, SpeakerXMarkIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'; // PaperAirplaneIcon removed
import { UI_STROKE_PRIMARY, UI_BACKGROUND_NEUTRAL, UI_ACCENT_CRITICAL, UI_STROKE_SECONDARY, UI_ACCENT_SUBTLE, UI_ACCENT_HEALTH, UI_ACCENT_WARNING, PLAYER_HIT_FLASH_DURATION_TICKS } from '../constants';

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
  isMuted: boolean;
  onToggleMute: () => void;
  isTouchDevice: boolean;
  onActivateAirstrike: () => void;
  onDeployShield: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  player, round, enemiesLeft, totalEnemiesThisRound, gameStatus,
  nextRoundTimer, nextAllySpawnTimer, onPauseToggle, isPaused,
  airstrikeAvailable, airstrikeActive, tutorialHighlightTarget,
  isMuted, onToggleMute, isTouchDevice,
  onActivateAirstrike, onDeployShield
}) => {
  const healthPercentage = player.maxHealth > 0 ? (player.health / player.maxHealth) * 100 : 0;
  const isHealthLow = healthPercentage < 30;

  const baseTextStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    color: UI_STROKE_PRIMARY,
  };
  const valueTextStyle: React.CSSProperties = {...baseTextStyle, fontWeight: '600', fontSize: '1.0rem', lineHeight: '1.2rem' };
  const labelTextStyle: React.CSSProperties = {...baseTextStyle, fontSize: '0.75rem', lineHeight: '1rem', fontWeight: '300', color: UI_STROKE_SECONDARY, textTransform: 'uppercase' };

  const getHighlightClass = (target: TutorialHighlightTarget) => {
    return tutorialHighlightTarget === target ? 'hud-highlight' : '';
  };

  const handleAirstrikeTouch = (e: React.TouchEvent<HTMLButtonElement>) => {
    console.log("Airstrike button onTouchStart fired. Disabled: ", !airstrikeAvailable || airstrikeActive);
    if (e.cancelable) e.preventDefault(); // Prevent click from also firing on touch devices
    if (!airstrikeAvailable || airstrikeActive) return;
    onActivateAirstrike();
  };

  const handleShieldTouch = (e: React.TouchEvent<HTMLButtonElement>) => {
    console.log("Shield button onTouchStart fired. Disabled: ", player.shieldAbilityTimer > 0);
    if (e.cancelable) e.preventDefault(); // Prevent click from also firing on touch devices
    if (player.shieldAbilityTimer > 0) return;
    onDeployShield();
  };


  const renderDesktopHUD = () => (
    <div className="p-2 sm:p-3" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, pointerEvents: 'none' }}>
        {/* Top Row: Health, Wave, Gold */}
        <div className="flex justify-between items-start mb-1 sm:mb-2">
            {/* Health Bar */}
            <div className={getHighlightClass('health')} style={{ flexBasis: '30%' }}>
                <div style={labelTextStyle}>Integrity</div>
                <div style={{ height: '12px', backgroundColor: UI_ACCENT_SUBTLE, borderRadius: '3px', border: `1px solid ${UI_STROKE_SECONDARY}`}}>
                    <div style={{ width: `${healthPercentage}%`, height: '100%', backgroundColor: isHealthLow ? UI_ACCENT_CRITICAL : (player.playerHitTimer > 0 && player.playerHitTimer % (PLAYER_HIT_FLASH_DURATION_TICKS/2) < (PLAYER_HIT_FLASH_DURATION_TICKS/4) ? UI_ACCENT_CRITICAL : UI_ACCENT_HEALTH), borderRadius: '2px', transition: 'width 0.2s ease-out, background-color 0.05s linear' }}></div>
                </div>
            </div>

            {/* Wave Info */}
             <div className={`text-center ${getHighlightClass('wave')}`} style={{ flexBasis: '30%' }}>
                <div style={labelTextStyle}>Wave {gameStatus === 'TUTORIAL_ACTIVE' ? '-' : round}</div>
                {gameStatus === 'ROUND_COMPLETE' && nextRoundTimer !== undefined && nextRoundTimer > 0 ? (
                    <div style={{...valueTextStyle, color: UI_ACCENT_WARNING}}>
                        Next wave in {Math.ceil(nextRoundTimer)}s
                    </div>
                ) : gameStatus !== 'TUTORIAL_ACTIVE' && (
                    <div style={valueTextStyle}>
                        {totalEnemiesThisRound - enemiesLeft} / {totalEnemiesThisRound}
                    </div>
                )}
            </div>

            {/* Gold */}
            <div className={`text-right ${getHighlightClass('gold')}`} style={{ flexBasis: '30%' }}>
                <div style={labelTextStyle}>Gold</div>
                <div style={valueTextStyle}>{player.gold}</div>
            </div>
        </div>

        {/* Bottom Row: Ally Timer, Airstrike, Shield, Pause/Mute */}
        <div 
            className="fixed bottom-0 left-0 right-0 flex justify-between items-center p-2 sm:p-3" 
            style={{pointerEvents: 'auto', backgroundColor: `${UI_BACKGROUND_NEUTRAL}4D`, backdropFilter: 'blur(2px)' }}
        >
            <div className={getHighlightClass('allyTimer')}>
                <div style={labelTextStyle}>Support Unit</div>
                <div style={valueTextStyle}>
                    {gameStatus === 'TUTORIAL_ACTIVE' ? '--:--' : (nextAllySpawnTimer > 0 && nextAllySpawnTimer < 9999 ? `${Math.ceil(nextAllySpawnTimer / 60).toString().padStart(2, '0')}:${Math.ceil(nextAllySpawnTimer % 60).toString().padStart(2, '0')}` : 'READY')}
                </div>
            </div>
            
            <div className={`text-center ${getHighlightClass('airstrike')}`}>
                <div style={labelTextStyle}>Airstrike (Q)</div>
                 <div style={{...valueTextStyle, color: airstrikeActive ? UI_ACCENT_WARNING : (airstrikeAvailable ? UI_ACCENT_HEALTH : UI_STROKE_SECONDARY)}}>
                    {airstrikeActive ? 'ACTIVE' : (airstrikeAvailable ? 'READY' : 'CHARGE')}
                </div>
            </div>

            <div className={`text-center ${getHighlightClass('shieldAbility')}`}>
                <div style={labelTextStyle}>
                    Shield {player.shieldAbilityUnlocked ? "(E)" : "(LOCKED)"}
                </div>
                {player.shieldAbilityUnlocked ? (
                    <div style={{...valueTextStyle, color: player.shieldAbilityTimer > 0 ? UI_STROKE_SECONDARY : UI_ACCENT_HEALTH }}>
                        {player.shieldAbilityTimer > 0 ? `${(player.shieldAbilityTimer / 60).toFixed(1)}s` : 'READY'}
                    </div>
                ) : (
                    <div style={{...valueTextStyle, color: UI_STROKE_SECONDARY }}>
                        N/A
                    </div>
                )}
            </div>

            <div className="flex space-x-2 sm:space-x-3">
                <button onClick={onToggleMute} aria-label={isMuted ? "Unmute sound" : "Mute sound"} className="hud-icon-button">
                    {isMuted ? <SpeakerXMarkIcon /> : <SpeakerWaveIcon />}
                </button>
                <button onClick={onPauseToggle} aria-label={isPaused ? "Resume game" : "Pause game"} className="hud-icon-button">
                    {isPaused ? <PlayIcon /> : <PauseIcon />}
                </button>
            </div>
        </div>
    </div>
  );

  const renderMobileHUD = () => (
    <>
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 p-2 flex justify-between items-start z-[100]" style={{ pointerEvents: 'none', paddingLeft: `max(env(safe-area-inset-left), 8px)`, paddingRight: `max(env(safe-area-inset-right), 8px)`, paddingTop: `max(env(safe-area-inset-top), 8px)`}}>
        {/* Left Group: Health & Ally Timer */}
        <div className={`flex flex-col items-start space-y-1`}>
            <div className={`${getHighlightClass('health')}`} style={{ width: '120px' }}>
              <div style={{...labelTextStyle, fontSize: '0.7rem'}}>INTEGRITY</div>
              <div style={{ height: '10px', backgroundColor: UI_ACCENT_SUBTLE, borderRadius: '3px', border: `1px solid ${UI_STROKE_SECONDARY}`}}>
                  <div style={{ width: `${healthPercentage}%`, height: '100%', backgroundColor: isHealthLow ? UI_ACCENT_CRITICAL : (player.playerHitTimer > 0 && player.playerHitTimer % (PLAYER_HIT_FLASH_DURATION_TICKS/2) < (PLAYER_HIT_FLASH_DURATION_TICKS/4) ? UI_ACCENT_CRITICAL : UI_ACCENT_HEALTH), borderRadius: '2px', transition: 'width 0.2s ease-out, background-color 0.05s linear' }}></div>
              </div>
            </div>
            <div className={`flex items-center space-x-1 ${getHighlightClass('allyTimer')}`}>
                <div style={{...labelTextStyle, fontSize: '0.7rem'}}>SUPPORT:</div>
                <div style={{...valueTextStyle, fontSize: '0.8rem'}}>
                    {gameStatus === 'TUTORIAL_ACTIVE' ? '--:--' : (nextAllySpawnTimer > 0 && nextAllySpawnTimer < 9999 ? `${Math.ceil(nextAllySpawnTimer / 60).toString().padStart(2, '0')}:${Math.ceil(nextAllySpawnTimer % 60).toString().padStart(2, '0')}` : 'RDY')}
                </div>
            </div>
        </div>
        
        {/* Center: Wave Info */}
        <div className={`text-center ${getHighlightClass('wave')}`} style={{ flexGrow: 1, paddingLeft: '8px', paddingRight: '8px' }}>
            <div style={{...labelTextStyle, fontSize: '0.7rem'}}>WAVE {gameStatus === 'TUTORIAL_ACTIVE' ? '-' : round}</div>
            {gameStatus === 'ROUND_COMPLETE' && nextRoundTimer !== undefined && nextRoundTimer > 0 ? (
                <div style={{...valueTextStyle, fontSize: '0.8rem', color: UI_ACCENT_WARNING}}>
                    Next: {Math.ceil(nextRoundTimer)}s
                </div>
            ) : gameStatus !== 'TUTORIAL_ACTIVE' && (
                <div style={{...valueTextStyle, fontSize: '0.8rem'}}>
                    {totalEnemiesThisRound - enemiesLeft} / {totalEnemiesThisRound}
                </div>
            )}
        </div>

        {/* Right: Gold + Controls */}
         <div className="flex items-start space-x-2" style={{pointerEvents: 'auto'}}>
            <div className={`text-right ${getHighlightClass('gold')}`}>
                 <div style={{...labelTextStyle, fontSize: '0.7rem'}}>GOLD</div>
                 <div style={{...valueTextStyle, fontSize: '0.8rem'}}>{player.gold}</div>
            </div>
            <button 
              onTouchStart={(e) => { console.log("Mute button onTouchStart"); if (e.cancelable) e.preventDefault(); onToggleMute(); }}
              onClick={(e) => { if(isTouchDevice && e.cancelable) e.preventDefault(); else onToggleMute(); }}
              aria-label={isMuted ? "Unmute sound" : "Mute sound"} 
              className="hud-icon-button"
            >
                {isMuted ? <SpeakerXMarkIcon /> : <SpeakerWaveIcon />}
            </button>
            <button 
              onTouchStart={(e) => { console.log("Pause button onTouchStart"); if (e.cancelable) e.preventDefault(); onPauseToggle(); }}
              onClick={(e) => { if(isTouchDevice && e.cancelable) e.preventDefault(); else onPauseToggle();}}
              aria-label={isPaused ? "Resume game" : "Pause game"} 
              className="hud-icon-button"
            >
                {isPaused ? <PlayIcon /> : <PauseIcon />}
            </button>
        </div>
      </div>

      {/* Action Buttons - Bottom Right */}
      <div style={{pointerEvents: 'auto'}}>
         {/* Airstrike Button - To the LEFT of Shield button. Size: 56px */}
        <button
          onTouchStart={isTouchDevice ? handleAirstrikeTouch : undefined}
          onClick={!isTouchDevice ? onActivateAirstrike : (e) => { console.log("Airstrike onClick called on touch device, likely an issue or fallback."); if(e.cancelable) e.preventDefault();}}
          disabled={!airstrikeAvailable || airstrikeActive}
          className={`btn-action-mobile airstrike-button ${airstrikeActive ? 'active' : ''} ${getHighlightClass('airstrike')}`}
          style={{ 
            bottom: `max(20px, env(safe-area-inset-bottom, 20px))`, 
            right: player.shieldAbilityUnlocked 
                   ? `max(78px, calc(env(safe-area-inset-right, 0px) + 78px))` /* Shield(48px) + Spacing(10px) + Base(20px) = 78px */
                   : `max(20px, env(safe-area-inset-right, 20px))` /* If no shield, it's the rightmost */
          }}
          aria-label="Activate Airstrike"
        >
          {/* Icon removed for airstrike button */}
        </button>

        {/* Shield Button - Furthest to the right. Size: 48px */}
        {player.shieldAbilityUnlocked && (
          <button
            onTouchStart={isTouchDevice ? handleShieldTouch : undefined}
            onClick={!isTouchDevice ? onDeployShield : (e) => { console.log("Shield onClick called on touch device, likely an issue or fallback."); if(e.cancelable) e.preventDefault();}}
            disabled={player.shieldAbilityTimer > 0}
            className={`btn-action-mobile shield-button-mobile ${player.shieldAbilityTimer === 0 ? 'ready' : ''} ${getHighlightClass('shieldAbility')}`}
            style={{ 
                bottom: `max(20px, env(safe-area-inset-bottom, 20px))`, 
                right: `max(20px, env(safe-area-inset-right, 20px))` 
            }}
            aria-label="Deploy Shield"
          >
            <ShieldCheckIcon />
          </button>
        )}
      </div>
    </>
  );

  return isTouchDevice ? renderMobileHUD() : renderDesktopHUD();
};
