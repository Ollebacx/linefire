
import React from 'react';
import { Player, GameState, TutorialHighlightTarget, AllyType, WeaponType } from '../types';
import { WEAPON_CONFIGS } from '../constants';
import { PauseIcon, PlayIcon, SpeakerWaveIcon, SpeakerXMarkIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { UI_STROKE_PRIMARY, UI_BACKGROUND_NEUTRAL, UI_ACCENT_CRITICAL, UI_STROKE_SECONDARY, UI_ACCENT_SUBTLE, UI_ACCENT_HEALTH, UI_ACCENT_WARNING, PLAYER_HIT_FLASH_DURATION_TICKS, AIRSTRIKE_COMBO_THRESHOLD } from '../constants';
import SoundSettingsPanel from './SoundSettingsPanel';
import type { SoundVolumes } from './SoundSettingsPanel';

const ALLY_LABELS: Record<AllyType, string> = {
  [AllyType.GUN_GUY]:     'GUN GUY',
  [AllyType.SHOTGUN]:     'SHOTGUN',
  [AllyType.SNIPER]:      'SNIPER',
  [AllyType.RPG_SOLDIER]: 'RPG',
  [AllyType.FLAMER]:      'FLAMER',
  [AllyType.MINIGUNNER]:  'MINIGUN',
  [AllyType.RIFLEMAN]:    'RIFLEMAN',
};

interface HUDProps {
  player: Player;
  round: number;
  enemiesLeft: number;
  totalEnemiesThisRound: number;
  gameStatus: GameState['gameStatus'];
  nextRoundTimer?: number;
  nextAllySpawnTimer: number;
  nextAllyType?: AllyType | null;
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
  showSoundPanel?: boolean;
  onToggleSoundPanel?: () => void;
  onCloseSoundPanel?: () => void;
  soundVolumes?: SoundVolumes;
  onVolumeChange?: (key: keyof SoundVolumes, value: number) => void;
}

export const HUD: React.FC<HUDProps> = ({
  player, round, enemiesLeft, totalEnemiesThisRound, gameStatus,
  nextRoundTimer, nextAllySpawnTimer, nextAllyType, onPauseToggle, isPaused,
  airstrikeAvailable, airstrikeActive, tutorialHighlightTarget,
  isMuted, onToggleMute, isTouchDevice,
  onActivateAirstrike, onDeployShield,
  showSoundPanel, onToggleSoundPanel, onCloseSoundPanel, soundVolumes, onVolumeChange,
}) => {
  const healthPercentage = player.maxHealth > 0 ? (player.health / player.maxHealth) * 100 : 0;
  const isHealthLow = healthPercentage < 30;
  const isOverclock = isHealthLow && player.health > 0;

  const T: React.CSSProperties = { fontFamily: "'Inter', sans-serif" };

  const val: React.CSSProperties = {
    ...T, fontWeight: '300', fontSize: '0.92rem', letterSpacing: '0.04em',
    color: '#00E5FF', textShadow: '0 0 8px rgba(0,229,255,0.35)',
  };
  const lbl: React.CSSProperties = {
    ...T, fontSize: '0.56rem', fontWeight: '300',
    color: 'rgba(148,163,184,0.7)', textTransform: 'uppercase', letterSpacing: '0.18em',
  };

  const hpColor = isOverclock
    ? '#FF2055'
    : player.playerHitTimer > 0 && player.playerHitTimer % (PLAYER_HIT_FLASH_DURATION_TICKS / 2) < (PLAYER_HIT_FLASH_DURATION_TICKS / 4)
      ? '#FF2055'
      : '#00FF88';
  const hpGlow = isOverclock ? '0 0 12px rgba(255,32,85,0.9)' : '0 0 10px rgba(0,255,136,0.7)';

  const formatTimer = (ticks: number) =>
    `${Math.floor(ticks / 60).toString().padStart(2, '0')}:${Math.floor(ticks % 60).toString().padStart(2, '0')}`;

  const getHighlightClass = (target: TutorialHighlightTarget) =>
    tutorialHighlightTarget === target ? 'hud-highlight' : '';

  const handleAirstrikeTouch = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (e.cancelable) e.preventDefault();
    if (!airstrikeAvailable || airstrikeActive) return;
    onActivateAirstrike();
  };

  const handleShieldTouch = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (e.cancelable) e.preventDefault();
    if (player.shieldAbilityTimer > 0) return;
    onDeployShield();
  };

  // Slot card base style for bottom ability bar
  const slotCard = (ready: boolean, locked = false): React.CSSProperties => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '7px 22px', gap: '2px', minWidth: '96px',
    borderRadius: '6px',
    border: `1px solid ${ready && !locked ? 'rgba(0,255,136,0.30)' : 'rgba(0,229,255,0.12)'}`,
    background: `rgba(4,6,14,${ready && !locked ? '0.82' : '0.65'})`,
    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    boxShadow: ready && !locked ? '0 0 14px rgba(0,255,136,0.08)' : 'none',
    opacity: locked ? 0.38 : 1,
    transition: 'border-color 0.2s, box-shadow 0.2s',
  });

  const renderDesktopHUD = () => (
    <>
      {/* ── TOP BAR ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center',
        padding: '13px 28px 18px',
        background: 'linear-gradient(180deg, rgba(4,6,14,0.96) 50%, rgba(4,6,14,0) 100%)',
        pointerEvents: 'none',
        gap: '24px',
      }}>

        {/* LEFT — HP */}
        <div className={getHighlightClass('health')} style={{ flex: '0 0 22%', minWidth: 0, maxWidth: '220px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
            <span style={{ ...lbl, color: isOverclock ? '#FF2055' : '#00E5FF', letterSpacing: '0.20em', fontSize: '0.58rem' }}>
              {isOverclock ? '⚠ OVERCLOCK' : 'INTEGRITY'}
            </span>
            <span style={{ ...lbl, color: hpColor, fontSize: '0.60rem', letterSpacing: '0.10em' }}>
              {Math.round(healthPercentage)}%
            </span>
          </div>
          <div style={{
            position: 'relative', height: '10px',
            background: 'rgba(10,14,28,0.95)', borderRadius: '5px',
            border: `1px solid ${isOverclock ? 'rgba(255,32,85,0.40)' : 'rgba(0,229,255,0.22)'}`,
            overflow: 'hidden',
            boxShadow: `inset 0 1px 4px rgba(0,0,0,0.6), 0 0 6px ${isOverclock ? 'rgba(255,32,85,0.12)' : 'rgba(0,229,255,0.06)'}`,
          }}>
            <div style={{
              width: `${healthPercentage}%`, height: '100%',
              background: isOverclock
                ? 'linear-gradient(90deg, #CC0033, #FF2055)'
                : 'linear-gradient(90deg, #00CC66, #00FF88)',
              borderRadius: '4px',
              boxShadow: hpGlow,
              transition: 'width 0.28s ease-out, background 0.12s linear',
            }} />
            {healthPercentage > 3 && (
              <div style={{
                position: 'absolute', top: '15%',
                left: `calc(${healthPercentage}% - 2px)`,
                width: '2px', height: '70%',
                background: 'rgba(255,255,255,0.85)', borderRadius: '2px', filter: 'blur(0.5px)',
              }} />
            )}
          </div>
        </div>

        {/* CENTER — WAVE */}
        <div className={`${getHighlightClass('wave')}`} style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ ...lbl, fontSize: '0.60rem', marginBottom: '1px' }}>
            {gameStatus === 'TUTORIAL_ACTIVE' ? 'TRAINING' : `WAVE ${round}`}
          </div>
          {gameStatus === 'ROUND_COMPLETE' && nextRoundTimer !== undefined && nextRoundTimer > 0 ? (
            <div style={{ ...val, color: UI_ACCENT_WARNING, textShadow: '0 0 10px rgba(255,149,0,0.6)', fontSize: '0.82rem' }}>
              NEXT IN {Math.ceil(nextRoundTimer)}s
            </div>
          ) : gameStatus !== 'TUTORIAL_ACTIVE' ? (
            <div style={{ ...val, fontSize: '0.82rem' }}>
              {totalEnemiesThisRound - enemiesLeft}
              <span style={{ color: 'rgba(148,163,184,0.5)', margin: '0 4px' }}>/</span>
              {totalEnemiesThisRound}
            </div>
          ) : null}
        </div>

        {/* RIGHT — CREDITS + CONTROLS */}
        <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '18px', pointerEvents: 'auto' }}>
          <div className={`text-right ${getHighlightClass('gold')}`}>
            <div style={{ ...lbl, fontSize: '0.58rem', marginBottom: '1px' }}>CREDITS</div>
            <div style={{ ...val, color: '#FF9500', textShadow: '0 0 10px rgba(255,149,0,0.55)', fontSize: '0.88rem' }}>
              {player.gold}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={onToggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'} className="hud-icon-button">
              {isMuted ? <SpeakerXMarkIcon /> : <SpeakerWaveIcon />}
            </button>
            <button onClick={onPauseToggle} aria-label={isPaused ? 'Resume' : 'Pause'} className="hud-icon-button">
              {isPaused ? <PlayIcon /> : <PauseIcon />}
            </button>
          </div>
        </div>
      </div>

      {/* ── BOTTOM BAR — Ability Slots ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
        padding: '0 24px 16px',
        background: 'linear-gradient(0deg, rgba(4,6,14,0.96) 50%, rgba(4,6,14,0) 100%)',
        pointerEvents: 'none',
        gap: '10px',
      }}>
        {/* WEAPON INDICATOR */}
        {player.equippedWeapon && player.equippedWeapon !== WeaponType.PISTOL && (
          <>
            <div style={slotCard(true)}>
              <div style={{
                ...val, fontSize: '0.84rem',
                color: WEAPON_CONFIGS[player.equippedWeapon]?.color ?? '#00FFCC',
                textShadow: `0 0 10px ${WEAPON_CONFIGS[player.equippedWeapon]?.color ?? '#00FFCC'}80`,
              }}>
                {player.weaponTimer > 0 ? `${Math.ceil(player.weaponTimer)}s` : 'ACTIVE'}
              </div>
              <div style={lbl}>{WEAPON_CONFIGS[player.equippedWeapon]?.label ?? 'WEAPON'}</div>
            </div>
            <div style={{ width: '1px', height: '32px', alignSelf: 'center', background: 'rgba(0,229,255,0.10)' }} />
          </>
        )}

        {/* SUPPORT */}
        <div className={getHighlightClass('allyTimer')}
          style={slotCard(nextAllySpawnTimer <= 0 || nextAllySpawnTimer >= 9999)}>
          <div style={{
            ...val, fontSize: '0.84rem',
            color: nextAllySpawnTimer <= 0 || nextAllySpawnTimer >= 9999 ? '#00FF88' : '#00E5FF',
            textShadow: nextAllySpawnTimer <= 0 || nextAllySpawnTimer >= 9999 ? '0 0 8px rgba(0,255,136,0.5)' : '0 0 6px rgba(0,229,255,0.3)',
          }}>
            {gameStatus === 'TUTORIAL_ACTIVE' ? '--:--'
              : nextAllySpawnTimer > 0 && nextAllySpawnTimer < 9999
                ? formatTimer(nextAllySpawnTimer)
                : 'READY'}
          </div>
          <div style={lbl}>
            {nextAllyType && gameStatus !== 'TUTORIAL_ACTIVE' ? ALLY_LABELS[nextAllyType] : 'SUPPORT'}
          </div>
        </div>

        <div style={{ width: '1px', height: '32px', alignSelf: 'center', background: 'rgba(0,229,255,0.10)' }} />

        {/* AIR STRIKE */}
        <div className={getHighlightClass('airstrike')}
          style={slotCard(airstrikeAvailable && !airstrikeActive)}>
          <div style={{
            ...val, fontSize: '0.84rem',
            color: airstrikeActive ? UI_ACCENT_WARNING : airstrikeAvailable ? '#00FF88' : 'rgba(148,163,184,0.5)',
            textShadow: airstrikeActive
              ? '0 0 10px rgba(255,149,0,0.6)'
              : airstrikeAvailable ? '0 0 8px rgba(0,255,136,0.5)' : 'none',
          }}>
            {airstrikeActive ? 'ACTIVE' : airstrikeAvailable ? 'READY' : 'CHARGING'}
          </div>
          <div style={lbl}>AIR STRIKE · Q</div>
        </div>

        {/* SHIELD */}
        <div className={getHighlightClass('shieldAbility')}
          style={slotCard(player.shieldAbilityUnlocked && player.shieldAbilityTimer === 0, !player.shieldAbilityUnlocked)}>
          <div style={{
            ...val, fontSize: '0.84rem',
            color: !player.shieldAbilityUnlocked
              ? 'rgba(148,163,184,0.4)'
              : player.shieldAbilityTimer > 0 ? 'rgba(148,163,184,0.5)' : '#00FF88',
            textShadow: player.shieldAbilityUnlocked && player.shieldAbilityTimer === 0
              ? '0 0 8px rgba(0,255,136,0.5)' : 'none',
          }}>
            {!player.shieldAbilityUnlocked
              ? 'LOCKED'
              : player.shieldAbilityTimer > 0 ? `${(player.shieldAbilityTimer / 60).toFixed(1)}s` : 'READY'}
          </div>
          <div style={lbl}>SHIELD{player.shieldAbilityUnlocked ? ' · E' : ''}</div>
        </div>
      </div>
    </>
  );

  const renderMobileHUD = () => (
    <>
      {/* TOP BAR */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'flex-start',
        padding: `max(env(safe-area-inset-top), 10px) max(env(safe-area-inset-right), 10px) 14px max(env(safe-area-inset-left), 10px)`,
        background: 'linear-gradient(180deg, rgba(4,6,14,0.96) 55%, rgba(4,6,14,0) 100%)',
        pointerEvents: 'none', gap: '10px',
      }}>

        {/* LEFT: HP + SUPPORT */}
        <div className="flex flex-col" style={{ flex: '0 0 42%', gap: '5px' }}>
          <div className={getHighlightClass('health')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={{ ...lbl, fontSize: '0.54rem', color: isOverclock ? '#FF2055' : '#00E5FF' }}>
                {isOverclock ? '⚠ OVERCLOCK' : 'INTEGRITY'}
              </span>
              <span style={{ ...lbl, fontSize: '0.54rem', color: hpColor }}>{Math.round(healthPercentage)}%</span>
            </div>
            <div style={{
              position: 'relative', height: '8px',
              background: 'rgba(10,14,28,0.95)', borderRadius: '4px',
              border: `1px solid ${isOverclock ? 'rgba(255,32,85,0.40)' : 'rgba(0,229,255,0.22)'}`,
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${healthPercentage}%`, height: '100%',
                background: isOverclock ? 'linear-gradient(90deg,#CC0033,#FF2055)' : 'linear-gradient(90deg,#00CC66,#00FF88)',
                borderRadius: '3px', boxShadow: hpGlow,
                transition: 'width 0.28s ease-out',
              }} />
              {healthPercentage > 4 && (
                <div style={{ position: 'absolute', top: '15%', left: `calc(${healthPercentage}% - 2px)`, width: '2px', height: '70%', background: 'rgba(255,255,255,0.85)', borderRadius: '2px' }} />
              )}
            </div>
          </div>
          <div className={`flex items-center ${getHighlightClass('allyTimer')}`} style={{ gap: '5px' }}>
            <span style={{ ...lbl, fontSize: '0.52rem' }}>
              {nextAllyType && gameStatus !== 'TUTORIAL_ACTIVE' ? ALLY_LABELS[nextAllyType] : 'SUPPORT'}
            </span>
            <span style={{ ...val, fontSize: '0.72rem', color: nextAllySpawnTimer <= 0 || nextAllySpawnTimer >= 9999 ? '#00FF88' : '#00E5FF' }}>
              {gameStatus === 'TUTORIAL_ACTIVE' ? '--:--'
                : nextAllySpawnTimer > 0 && nextAllySpawnTimer < 9999
                  ? formatTimer(nextAllySpawnTimer) : 'RDY'}
            </span>
          </div>
        </div>

        {/* CENTER: WAVE */}
        <div className={`${getHighlightClass('wave')}`} style={{ flex: 1, textAlign: 'center', paddingTop: '2px' }}>
          <div style={{ ...lbl, fontSize: '0.54rem', marginBottom: '2px' }}>
            {gameStatus === 'TUTORIAL_ACTIVE' ? 'TRAINING' : `WAVE ${round}`}
          </div>
          {gameStatus === 'ROUND_COMPLETE' && nextRoundTimer !== undefined && nextRoundTimer > 0 ? (
            <div style={{ ...val, fontSize: '0.72rem', color: UI_ACCENT_WARNING }}>~{Math.ceil(nextRoundTimer)}s</div>
          ) : gameStatus !== 'TUTORIAL_ACTIVE' && (
            <div style={{ ...val, fontSize: '0.72rem' }}>{totalEnemiesThisRound - enemiesLeft}/{totalEnemiesThisRound}</div>
          )}
        </div>

        {/* RIGHT: CREDITS + CONTROLS */}
        <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'flex-start', gap: '8px', pointerEvents: 'auto', paddingTop: '2px' }}>
          <div className={`text-right ${getHighlightClass('gold')}`}>
            <div style={{ ...lbl, fontSize: '0.52rem', marginBottom: '2px' }}>CREDITS</div>
            <div style={{ ...val, fontSize: '0.72rem', color: '#FF9500', textShadow: '0 0 8px rgba(255,149,0,0.5)' }}>{player.gold}</div>
          </div>
          <div style={{ position: 'relative' }}>
            <button
              onTouchStart={(e) => { if (e.cancelable) e.preventDefault(); if (onToggleSoundPanel) onToggleSoundPanel(); }}
              onClick={(e) => { if (isTouchDevice && e.cancelable) e.preventDefault(); else if (onToggleSoundPanel) onToggleSoundPanel(); }}
              aria-label="Sound settings"
              className={`hud-icon-button${showSoundPanel ? ' active' : ''}`}
              style={{ color: showSoundPanel ? '#00E5FF' : undefined }}
            >{isMuted ? <SpeakerXMarkIcon /> : <SpeakerWaveIcon />}</button>
            {showSoundPanel && soundVolumes && onVolumeChange && onCloseSoundPanel && (
              <SoundSettingsPanel
                volumes={soundVolumes}
                isMuted={isMuted}
                onVolumeChange={onVolumeChange}
                onToggleMute={onToggleMute}
                onClose={onCloseSoundPanel}
              />
            )}
          </div>
          <button
            onTouchStart={(e) => { if (e.cancelable) e.preventDefault(); onPauseToggle(); }}
            onClick={(e) => { if (isTouchDevice && e.cancelable) e.preventDefault(); else onPauseToggle(); }}
            aria-label={isPaused ? 'Resume' : 'Pause'} className="hud-icon-button"
          >{isPaused ? <PlayIcon /> : <PauseIcon />}</button>
        </div>
      </div>

      {/* Action Buttons - Bottom Right */}
      <div style={{ pointerEvents: 'auto' }}>
        <button
          onTouchStart={isTouchDevice ? handleAirstrikeTouch : undefined}
          onClick={!isTouchDevice ? onActivateAirstrike : (e) => { if (e.cancelable) e.preventDefault(); }}
          disabled={!airstrikeAvailable || airstrikeActive}
          className={`btn-action-mobile airstrike-button ${airstrikeActive ? 'active' : ''} ${getHighlightClass('airstrike')}`}
          style={{
            bottom: `max(20px, env(safe-area-inset-bottom, 20px))`,
            right: player.shieldAbilityUnlocked
              ? `max(78px, calc(env(safe-area-inset-right, 0px) + 78px))`
              : `max(20px, env(safe-area-inset-right, 20px))`
          }}
          aria-label="Activate Airstrike"
        />
        {player.shieldAbilityUnlocked && (
          <button
            onTouchStart={isTouchDevice ? handleShieldTouch : undefined}
            onClick={!isTouchDevice ? onDeployShield : (e) => { if (e.cancelable) e.preventDefault(); }}
            disabled={player.shieldAbilityTimer > 0}
            className={`btn-action-mobile shield-button-mobile ${player.shieldAbilityTimer === 0 ? 'ready' : ''} ${getHighlightClass('shieldAbility')}`}
            style={{
              bottom: `max(20px, env(safe-area-inset-bottom, 20px))`,
              right: `max(20px, env(safe-area-inset-right, 20px))`
            }}
            aria-label="Deploy Shield"
          ><ShieldCheckIcon /></button>
        )}
      </div>
    </>
  );

  return (
    <>
      {isTouchDevice ? renderMobileHUD() : renderDesktopHUD()}

      {/* Floating combo counter — visible above 3× */}
      {player.comboCount >= 3 && (
        <div
          key={player.comboCount}
          style={{
            position: 'absolute',
            top: '38%',
            left: 0,
            right: 0,
            zIndex: 200,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div style={{ animation: 'combo-pop 0.18s cubic-bezier(0.34,1.56,0.64,1) both', display: 'inline-block', textAlign: 'center' }}>
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: '100',
              fontSize: `${Math.min(6.5, 2.2 + player.comboCount * 0.18)}rem`,
              lineHeight: 1,
              letterSpacing: '0.02em',
              color: player.comboCount >= AIRSTRIKE_COMBO_THRESHOLD ? UI_ACCENT_WARNING : UI_ACCENT_HEALTH,
              textShadow: player.comboCount >= AIRSTRIKE_COMBO_THRESHOLD
                ? '0 0 24px rgba(255,149,0,0.9), 0 0 50px rgba(255,149,0,0.4)'
                : '0 0 16px rgba(0,255,136,0.8)',
            }}>
              {player.comboCount}×
            </div>
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: '300',
              fontSize: '0.60rem',
              letterSpacing: '0.18em',
              color: UI_STROKE_SECONDARY,
              textTransform: 'uppercase',
              marginTop: '4px',
            }}>
              {player.comboCount >= AIRSTRIKE_COMBO_THRESHOLD ? '⚡ AIRSTRIKE READY' : 'CHAIN'}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
