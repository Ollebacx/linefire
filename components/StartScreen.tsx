import React, { useState, useEffect } from 'react';
import { SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/outline';
import SoundSettingsPanel from './SoundSettingsPanel';
import type { SoundVolumes } from './SoundSettingsPanel';

interface StartScreenProps {
  onStart: () => void;
  onStartTutorial: () => void;
  controlScheme: 'keyboard' | 'mouse' | 'wasd_mouse';
  onControlSchemeChange: (scheme: 'keyboard' | 'mouse' | 'wasd_mouse') => void;
  soundVolumes: SoundVolumes;
  isMuted: boolean;
  onVolumeChange: (key: keyof SoundVolumes, value: number) => void;
  onToggleMute: () => void;
}

// ── Local best run persistence ──────────────────────────────────────────
const BEST_KEY = 'lf_best_wave';
export function saveBestWave(wave: number) {
  const prev = parseInt(localStorage.getItem(BEST_KEY) ?? '0', 10);
  if (wave > prev) localStorage.setItem(BEST_KEY, String(wave));
}
function getBestWave(): number {
  return parseInt(localStorage.getItem(BEST_KEY) ?? '0', 10);
}

// ── Game pillars ────────────────────────────────────────────────────────
const PILLARS = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="6" r="2.5" fill="currentColor" opacity="0.9"/>
        <circle cx="5"  cy="14" r="2"  fill="currentColor" opacity="0.65"/>
        <circle cx="15" cy="14" r="2"  fill="currentColor" opacity="0.65"/>
        <line x1="10" y1="8.5" x2="5.5"  y2="12.2" stroke="currentColor" strokeWidth="0.8" opacity="0.35"/>
        <line x1="10" y1="8.5" x2="14.5" y2="12.2" stroke="currentColor" strokeWidth="0.8" opacity="0.35"/>
      </svg>
    ),
    label: 'BUILD YOUR SQUAD',
    desc: 'Allies spawn mid-wave and follow your lead. Position matters.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 16 L10 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M6 9 L10 5 L14 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <circle cx="10" cy="13" r="1.5" fill="currentColor" opacity="0.6"/>
      </svg>
    ),
    label: 'UPGRADE BETWEEN WAVES',
    desc: 'Spend gold on shield, airstrike, chain lightning and squad power.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2 L18 10 L10 18 L2 10 Z" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.85"/>
        <path d="M10 6 L10 14 M6 10 L14 10" stroke="currentColor" strokeWidth="1.2" opacity="0.55"/>
      </svg>
    ),
    label: 'FACE THE BOSS',
    desc: 'Every few waves a boss arrives. Take it down or fall trying.',
  },
];

const CYAN  = '#00E5FF';
const SLATE = '#94A3B8';
const DIM   = 'rgba(226,232,240,0.18)';

const StartScreen: React.FC<StartScreenProps> = ({
  onStart, onStartTutorial, controlScheme, onControlSchemeChange,
  soundVolumes, isMuted, onVolumeChange, onToggleMute,
}) => {
  const [showSoundPanel, setShowSoundPanel] = useState(false);
  const [bestWave, setBestWave] = useState(0);

  useEffect(() => { setBestWave(getBestWave()); }, []);

  const opts: { value: 'keyboard' | 'mouse' | 'wasd_mouse'; label: string; sub: string }[] = [
    { value: 'keyboard',   label: 'KEYBOARD',    sub: 'WASD/arrows · auto-aim' },
    { value: 'wasd_mouse', label: 'WASD + MOUSE', sub: 'WASD move · mouse aims' },
    { value: 'mouse',      label: 'CURSOR',       sub: 'cursor steers · auto-aim' },
  ];

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center z-10 text-center"
      style={{ position: 'relative', backgroundColor: 'transparent', padding: '16px' }}
    >
      <div
        className="glass-panel"
        style={{
          position: 'relative',
          padding: 'clamp(1.75rem, 5vw, 2.5rem) clamp(1.5rem, 6vw, 3rem)',
          maxWidth: '480px', width: '100%',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          boxSizing: 'border-box',
        }}
      >
        {/* Sound button */}
        <button
          onClick={() => setShowSoundPanel(p => !p)}
          style={{
            position: 'absolute', top: 6, right: 6,
            background: showSoundPanel ? 'rgba(0,229,255,0.08)' : 'none',
            border: `1px solid ${showSoundPanel ? 'rgba(0,229,255,0.30)' : 'transparent'}`,
            borderRadius: '6px', cursor: 'pointer', padding: '6px',
            color: showSoundPanel ? CYAN : 'rgba(148,163,184,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          aria-label="Sound settings"
        >
          {isMuted
            ? <SpeakerXMarkIcon style={{ width: 16, height: 16 }} />
            : <SpeakerWaveIcon  style={{ width: 16, height: 16 }} />}
        </button>
        {showSoundPanel && (
          <div style={{ position: 'absolute', top: 40, right: 6, zIndex: 200 }}>
            <SoundSettingsPanel
              volumes={soundVolumes} isMuted={isMuted}
              onVolumeChange={onVolumeChange} onToggleMute={onToggleMute}
              onClose={() => setShowSoundPanel(false)}
            />
          </div>
        )}

        {/* Title block */}
        <div style={{
          fontSize: '0.50rem', letterSpacing: '0.30em',
          fontFamily: "'Inter', sans-serif", fontWeight: 300,
          color: CYAN, textTransform: 'uppercase',
          marginBottom: '0.6rem', opacity: 0.60,
        }}>
          SQUAD SURVIVAL
        </div>

        <h1 className="neon-title" style={{
          fontFamily: "'Inter', sans-serif", fontWeight: 100,
          fontSize: 'clamp(2.8rem, 9vw, 5.2rem)',
          lineHeight: 1, letterSpacing: '0.08em',
          color: '#E2E8F0', textTransform: 'uppercase',
          marginBottom: '0.4rem',
        }}>
          LINEFIRE
        </h1>

        <p style={{
          fontFamily: "'Inter', sans-serif", fontWeight: 300,
          fontSize: 'clamp(0.68rem, 2vw, 0.78rem)',
          color: SLATE, letterSpacing: '0.04em',
          lineHeight: 1.6, marginBottom: '0.3rem',
        }}>
          You move. Your squad follows. Nobody gets left behind.
        </p>

        {bestWave > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            marginBottom: '0.4rem',
            padding: '3px 10px',
            background: 'rgba(0,229,255,0.05)',
            border: '1px solid rgba(0,229,255,0.15)',
            borderRadius: '20px',
          }}>
            <span style={{ fontSize: '0.46rem', letterSpacing: '0.20em', color: 'rgba(0,229,255,0.50)', fontFamily: "'Inter', sans-serif", fontWeight: 300 }}>
              BEST RUN
            </span>
            <span style={{ fontSize: '0.70rem', fontWeight: 400, color: CYAN, fontFamily: "'Inter', sans-serif" }}>
              WAVE {bestWave}
            </span>
          </div>
        )}

        <div style={{
          width: '50%', height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(0,255,204,0.35), transparent)',
          marginBottom: '1.3rem', marginTop: '0.7rem',
        }} />

        {/* 3 Pillars */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '1.4rem' }}>
          {PILLARS.map(p => (
            <div key={p.label} style={{
              display: 'flex', alignItems: 'flex-start', gap: '12px',
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${DIM}`,
              borderRadius: '8px', textAlign: 'left',
            }}>
              <div style={{ color: CYAN, flexShrink: 0, marginTop: '1px' }}>{p.icon}</div>
              <div>
                <div style={{
                  fontFamily: "'Inter', sans-serif", fontWeight: 400,
                  fontSize: '0.52rem', letterSpacing: '0.18em',
                  color: CYAN, marginBottom: '2px', opacity: 0.85,
                }}>
                  {p.label}
                </div>
                <div style={{
                  fontFamily: "'Inter', sans-serif", fontWeight: 300,
                  fontSize: '0.64rem', color: SLATE, letterSpacing: '0.02em', lineHeight: 1.5,
                }}>
                  {p.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div style={{ width: '100%', marginBottom: '1.4rem' }}>
          <p style={{
            fontFamily: "'Inter', sans-serif", fontWeight: 300,
            fontSize: '0.46rem', letterSpacing: '0.22em',
            color: 'rgba(0,229,255,0.40)', textTransform: 'uppercase',
            marginBottom: '0.5rem', textAlign: 'left',
          }}>
            CONTROLS
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {opts.map(opt => {
              const active = controlScheme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => onControlSchemeChange(opt.value)}
                  style={{
                    flex: 1, padding: '0.5rem 0.75rem',
                    background: active ? 'rgba(0,229,255,0.06)' : 'transparent',
                    border: `1px solid ${active ? 'rgba(0,229,255,0.40)' : DIM}`,
                    borderRadius: '6px', cursor: 'pointer',
                    textAlign: 'center', transition: 'all 0.15s', outline: 'none',
                  }}
                >
                  <div style={{
                    fontFamily: "'Inter', sans-serif", fontSize: '0.58rem',
                    fontWeight: active ? 400 : 300, letterSpacing: '0.14em',
                    color: active ? CYAN : 'rgba(226,232,240,0.30)', marginBottom: '2px',
                  }}>
                    {opt.label}
                  </div>
                  <div style={{
                    fontFamily: "'Inter', sans-serif", fontSize: '0.50rem', fontWeight: 300,
                    color: active ? 'rgba(0,229,255,0.50)' : 'rgba(226,232,240,0.18)',
                    letterSpacing: '0.06em',
                  }}>
                    {opt.sub}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* CTAs */}
        <button
          onClick={onStart}
          className="btn-primary-minimal"
          style={{ width: '100%', marginBottom: '0.6rem', padding: '0.78rem 1.5rem', fontSize: '0.82rem' }}
        >
          {bestWave > 0 ? 'PLAY AGAIN' : 'PLAY'}
        </button>
        <button
          onClick={onStartTutorial}
          className="btn-minimal"
          style={{ width: '100%', padding: '0.62rem 1.5rem', fontSize: '0.68rem' }}
        >
          {bestWave === 0 ? 'FIRST TIME? LEARN THE BASICS' : 'HOW TO PLAY'}
        </button>

        {/* Corner decorations */}
        <div style={{ position: 'absolute', top: 8, left: 8, width: 12, height: 12,
          borderTop: '1px solid rgba(0,255,204,0.40)', borderLeft: '1px solid rgba(0,255,204,0.40)' }} />
        <div style={{ position: 'absolute', top: 8, right: 8, width: 12, height: 12,
          borderTop: '1px solid rgba(0,255,204,0.40)', borderRight: '1px solid rgba(0,255,204,0.40)' }} />
        <div style={{ position: 'absolute', bottom: 8, left: 8, width: 12, height: 12,
          borderBottom: '1px solid rgba(0,255,204,0.40)', borderLeft: '1px solid rgba(0,255,204,0.40)' }} />
        <div style={{ position: 'absolute', bottom: 8, right: 8, width: 12, height: 12,
          borderBottom: '1px solid rgba(0,255,204,0.40)', borderRight: '1px solid rgba(0,255,204,0.40)' }} />
      </div>

      <div style={{
        marginTop: '1.1rem', fontSize: '0.46rem', letterSpacing: '0.22em',
        fontFamily: "'Inter', sans-serif", fontWeight: 300,
        color: '#1E3A5F', textTransform: 'uppercase',
      }}>
        v2.0
      </div>
    </div>
  );
};

export default StartScreen;
