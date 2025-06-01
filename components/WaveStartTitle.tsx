
import React from 'react';
import { UI_BACKGROUND_NEUTRAL, UI_STROKE_PRIMARY, UI_STROKE_SECONDARY } from '../constants';

interface WaveStartTitleProps {
  text: string;
  opacity: number;
}

const WaveStartTitle: React.FC<WaveStartTitleProps> = ({ text, opacity }) => {
  if (opacity <= 0) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-[800]"
      style={{
        opacity: opacity,
        transition: opacity < 1 ? 'opacity 0.2s linear' : 'none', 
      }}
      aria-live="assertive"
      aria-atomic="true"
    >
      <h2
        className="text-3xl sm:text-3xl lg:text-3xl select-none tracking-wider"
        style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: '300', // Changed from 700 to 300 (Light)
          color: UI_STROKE_PRIMARY, // Changed from UI_BACKGROUND_NEUTRAL
          // Removed WebkitTextStroke and textShadow
        }}
      >
        {text}
      </h2>
    </div>
  );
};

export default WaveStartTitle;