
import React from 'react';
import { MuzzleFlash } from '../types';

interface MuzzleFlashViewProps {
  muzzleFlash: MuzzleFlash;
  cameraX: number;
  cameraY: number;
}

const MuzzleFlashView: React.FC<MuzzleFlashViewProps> = ({ muzzleFlash, cameraX, cameraY }) => {
  const { x, y, angle, size, timer, color } = muzzleFlash;

  const screenX = x - cameraX;
  const screenY = y - cameraY;

  // Fade out effect
  const opacity = Math.max(0, timer / 4); // Assuming MUZZLE_FLASH_DURATION_TICKS is 4

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${screenX}px`,
    top: `${screenY}px`,
    width: `${size}px`,
    height: `${size}px`,
    transformOrigin: 'center center',
    transform: `translate(-50%, -50%) rotate(${angle}deg)`, // Center and rotate
    opacity: opacity,
    pointerEvents: 'none',
    zIndex: 900, // Above game objects but below HUD/UI
  };

  // Simple star-like shape for muzzle flash
  return (
    <div style={style} aria-hidden="true">
      <svg width="100%" height="100%" viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L13.65 8.35L20 9.15L15.5 13.15L17.3 19.8L12 16.15L6.7 19.8L8.5 13.15L4 9.15L10.35 8.35L12 2Z"/>
      </svg>
    </div>
  );
};

export default MuzzleFlashView;
