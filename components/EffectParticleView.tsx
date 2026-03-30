
import React from 'react';
import { EffectParticle } from '../types';

interface EffectParticleViewProps {
  particle: EffectParticle;
  cameraX: number;
  cameraY: number;
}

const EffectParticleView: React.FC<EffectParticleViewProps> = ({ particle, cameraX, cameraY }) => {
  const { x, y, size, color, timer, initialTimer } = particle;

  const screenX = x - cameraX;
  const screenY = y - cameraY;

  // Calculate opacity based on timer (fade out effect)
  const opacity = Math.max(0, timer / initialTimer);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${screenX - size / 2}px`, // Center the particle
    top: `${screenY - size / 2}px`,  // Center the particle
    width: `${size}px`,
    height: `${size}px`,
    backgroundColor: color,
    borderRadius: '50%', // Simple circular particle
    opacity: opacity,
    pointerEvents: 'none',
    zIndex: 800, // Below muzzle flashes, above game objects
    transition: 'opacity 0.05s linear', // Smooth fade for opacity
  };

  return <div style={style} aria-hidden="true" />;
};

export default EffectParticleView;
