import React, { useRef, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { SpeakerWaveIcon } from '@heroicons/react/24/outline';

export interface SoundVolumes {
  master: number;  // 0–1
  music: number;   // 0–1
  sfx: number;     // 0–1
}

interface SoundSettingsPanelProps {
  volumes: SoundVolumes;
  isMuted: boolean;
  onVolumeChange: (key: keyof SoundVolumes, value: number) => void;
  onToggleMute: () => void;
  onClose: () => void;
  /** When true: no floating positioning, no close button, no click-outside dismiss */
  embedded?: boolean;
}

const CYAN  = '#00E5FF';
const DIM   = 'rgba(148,163,184,0.55)';
const TRACK_BG = 'rgba(0,229,255,0.10)';
const TRACK_FILL = 'rgba(0,229,255,0.65)';

const SLIDERS: { key: keyof SoundVolumes; label: string }[] = [
  { key: 'master', label: 'MASTER'  },
  { key: 'music',  label: 'MUSIC'   },
  { key: 'sfx',    label: 'EFFECTS' },
];

const SoundSettingsPanel: React.FC<SoundSettingsPanelProps> = ({
  volumes, isMuted, onVolumeChange, onToggleMute, onClose, embedded = false,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside (only when floating)
  useEffect(() => {
    if (embedded) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // delay so the same click that opens it doesn't close it
    const id = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => { clearTimeout(id); document.removeEventListener('mousedown', handler); };
  }, [onClose, embedded]);

  // Close on Escape (only when floating)
  useEffect(() => {
    if (embedded) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, embedded]);

  return (
    <div
      ref={panelRef}
      style={embedded ? {
        width: '220px',
        background: 'rgba(4,6,14,0.60)',
        border: '1px solid rgba(0,229,255,0.12)',
        borderRadius: '10px',
        padding: '14px 16px 16px',
        fontFamily: "'Inter', sans-serif",
      } : {
        position: 'absolute',
        top: '56px',
        right: '12px',
        zIndex: 999,
        width: '220px',
        background: 'rgba(4,6,14,0.96)',
        border: '1px solid rgba(0,229,255,0.18)',
        borderRadius: '10px',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(0,229,255,0.08)',
        padding: '14px 16px 16px',
        fontFamily: "'Inter', sans-serif",
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header — only shown when floating */}
      {!embedded && (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <SpeakerWaveIcon style={{ width: 13, height: 13, color: CYAN, opacity: 0.75 }} />
          <span style={{
            fontSize: '0.55rem', fontWeight: 300, letterSpacing: '0.22em',
            color: CYAN, textTransform: 'uppercase', opacity: 0.75,
          }}>
            AUDIO
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(148,163,184,0.5)', padding: '2px',
            display: 'flex', alignItems: 'center',
          }}
          aria-label="Close audio settings"
        >
          <XMarkIcon style={{ width: 14, height: 14 }} />
        </button>
      </div>
      )}

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
        {SLIDERS.map(({ key, label }) => {
          const val = volumes[key];
          const pct = Math.round(val * 100);
          return (
            <div key={key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <span style={{ fontSize: '0.50rem', fontWeight: 300, letterSpacing: '0.18em', color: DIM, textTransform: 'uppercase' }}>
                  {label}
                </span>
                <span style={{ fontSize: '0.55rem', fontWeight: 300, color: pct === 0 ? 'rgba(148,163,184,0.3)' : CYAN, letterSpacing: '0.08em', minWidth: '28px', textAlign: 'right' }}>
                  {pct}%
                </span>
              </div>
              <div style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
                {/* Track background */}
                <div style={{
                  position: 'absolute', left: 0, right: 0, height: '3px',
                  borderRadius: '2px', background: TRACK_BG,
                }} />
                {/* Fill */}
                <div style={{
                  position: 'absolute', left: 0, width: `${pct}%`, height: '3px',
                  borderRadius: '2px',
                  background: pct === 0
                    ? 'rgba(100,116,139,0.3)'
                    : key === 'master'
                      ? 'linear-gradient(90deg, rgba(0,229,255,0.5), rgba(0,229,255,0.9))'
                      : key === 'music'
                        ? 'linear-gradient(90deg, rgba(0,255,136,0.5), rgba(0,255,136,0.9))'
                        : 'linear-gradient(90deg, rgba(255,149,0,0.5), rgba(255,149,0,0.9))',
                  transition: 'width 0.05s',
                }} />
                {/* Thumb */}
                {pct > 0 && (
                  <div style={{
                    position: 'absolute', left: `calc(${pct}% - 6px)`,
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: key === 'master' ? CYAN : key === 'music' ? '#00FF88' : '#FF9500',
                    boxShadow: `0 0 6px ${key === 'master' ? 'rgba(0,229,255,0.6)' : key === 'music' ? 'rgba(0,255,136,0.6)' : 'rgba(255,149,0,0.6)'}`,
                    pointerEvents: 'none',
                    transition: 'left 0.05s',
                  }} />
                )}
                {/* Native range input (invisible, on top for interaction) */}
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={pct}
                  onChange={e => onVolumeChange(key, Number(e.target.value) / 100)}
                  style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    opacity: 0, cursor: 'pointer', margin: 0,
                    WebkitAppearance: 'none',
                  }}
                  aria-label={label}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'rgba(0,229,255,0.08)', margin: '14px 0 12px' }} />

      {/* Mute toggle */}
      <button
        onClick={onToggleMute}
        style={{
          width: '100%',
          background: isMuted ? 'rgba(255,32,85,0.10)' : 'rgba(0,229,255,0.06)',
          border: `1px solid ${isMuted ? 'rgba(255,32,85,0.30)' : 'rgba(0,229,255,0.15)'}`,
          borderRadius: '6px',
          padding: '7px 12px',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.58rem',
          fontWeight: 300,
          letterSpacing: '0.16em',
          color: isMuted ? '#FF2055' : 'rgba(148,163,184,0.65)',
          textTransform: 'uppercase',
          transition: 'all 0.15s',
        }}
      >
        {isMuted ? 'MUTED — CLICK TO UNMUTE' : 'MUTE ALL'}
      </button>
    </div>
  );
};

export default SoundSettingsPanel;
