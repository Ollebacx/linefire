
import React from 'react';

interface WaveStartTitleProps {
  text: string;
  opacity: number;
}

const WaveStartTitle: React.FC<WaveStartTitleProps> = ({ text, opacity }) => {
  if (opacity <= 0) return null;

  const isBossWave = text.includes('BOSS');
  const color = isBossWave ? '#FF2055' : '#00FFCC';
  const glow = isBossWave
    ? '0 0 30px rgba(255,32,85,0.9), 0 0 70px rgba(255,32,85,0.4)'
    : '0 0 30px rgba(0,255,204,0.8), 0 0 70px rgba(0,255,204,0.3)';

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-[800]"
      style={{ opacity, transition: opacity < 1 ? 'opacity 0.2s linear' : 'none' }}
      aria-live="assertive"
      aria-atomic="true"
    >
      <div style={{ textAlign: 'center' }}>
        <h2 style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: '100',
          fontSize: 'clamp(2.2rem, 8vw, 5rem)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color,
          textShadow: glow,
        }}>
          {text}
        </h2>
        <div style={{
          margin: '0.4rem auto 0',
          width: '40%', height: '1px',
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          boxShadow: `0 0 8px ${color}`,
        }} />
      </div>
    </div>
  );
};

export default WaveStartTitle;