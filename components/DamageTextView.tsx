
import React from 'react';
import { DamageText } from '../types'; // Assuming DamageText type is defined in types.ts
import { UI_STROKE_PRIMARY } from '../constants'; // For potential text shadow or outline

interface DamageTextViewProps {
  damageText: DamageText;
  cameraX: number;
  cameraY: number;
}

const DamageTextView: React.FC<DamageTextViewProps> = ({ damageText, cameraX, cameraY }) => {
  const { text, x, y, timer, color, fontSize, fontWeight } = damageText;

  // Calculate screen position
  const screenX = x - cameraX;
  const screenY = y - cameraY;

  // Calculate opacity based on timer (fade out effect)
  // Example: Full opacity for first half of duration, then fade
  const totalDuration = 60; // Assuming DAMAGE_TEXT_DURATION_TICKS is 60
  const fadeStartThreshold = totalDuration / 2;
  let opacity = 1;
  if (timer < fadeStartThreshold) {
    opacity = Math.max(0, timer / fadeStartThreshold);
  }


  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${screenX}px`,
    top: `${screenY}px`,
    transform: 'translateX(-50%)', // Center the text horizontally
    color: color,
    fontSize: `${fontSize}px`,
    fontWeight: fontWeight,
    fontFamily: "'Inter', sans-serif",
    opacity: opacity,
    transition: 'opacity 0.05s linear', // Smooth fade for opacity only
    pointerEvents: 'none',
    zIndex: 1000, // Ensure it's above other game objects
    whiteSpace: 'nowrap',
    textShadow: `0px 0px 3px ${UI_STROKE_PRIMARY}99` // Subtle shadow for readability
  };

  return (
    <div style={style} aria-hidden="true">
      {text}
    </div>
  );
};

export default DamageTextView;
