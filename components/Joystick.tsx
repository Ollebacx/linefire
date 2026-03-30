import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Position } from '../types';

interface JoystickProps {
  onMove: (direction: Position) => void;
  onRelease: () => void;
  baseSize?: number;
  knobSize?: number;
  baseColor?: string; 
  knobColor?: string; 
  joystickPosition?: { bottom?: string; left?: string; top?: string; right?: string; transform?: string };
}

const Joystick: React.FC<JoystickProps> = ({
  onMove,
  onRelease,
  baseSize = 120, // Diameter of the joystick base
  knobSize = 60,  // Diameter of the knob
  baseColor = 'rgba(100, 100, 100, 0.3)', 
  knobColor = 'rgba(200, 200, 200, 0.6)',
  joystickPosition = { bottom: '50px', left: '50px' } 
}) => {
  const baseRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [knobPosition, setKnobPosition] = useState<Position>({ x: 0, y: 0 }); // Relative to base center
  const touchIdRef = useRef<number | null>(null);

  const maxKnobOffset = (baseSize - knobSize) / 2;

  const updateKnobAndEmit = useCallback((rawX: number, rawY: number) => {
    const distance = Math.sqrt(rawX * rawX + rawY * rawY);
    let clampedX = rawX;
    let clampedY = rawY;

    if (distance > maxKnobOffset) {
      clampedX = (rawX / distance) * maxKnobOffset;
      clampedY = (rawY / distance) * maxKnobOffset;
    }
    setKnobPosition({ x: clampedX, y: clampedY });

    if (distance < 5) { // Dead zone
        onMove({ x: 0, y: 0});
    } else {
        onMove({
            x: clampedX / maxKnobOffset, // Normalized
            y: clampedY / maxKnobOffset  // Normalized
        });
    }
  }, [maxKnobOffset, onMove, setKnobPosition]);


  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (baseRef.current && baseRef.current.contains(event.target as Node)) {
        if (event.touches.length === 1 && touchIdRef.current === null) { 
          // Not calling event.preventDefault() here
          const touch = event.touches[0];
          touchIdRef.current = touch.identifier;
          setIsDragging(true);
          
          const baseRect = baseRef.current.getBoundingClientRect();
          const touchXInBase = touch.clientX - (baseRect.left + baseSize / 2);
          const touchYInBase = touch.clientY - (baseRect.top + baseSize / 2);
          
          updateKnobAndEmit(touchXInBase, touchYInBase);
        }
    }
  }, [baseSize, updateKnobAndEmit, setIsDragging]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (isDragging && baseRef.current) {
      let activeTouch: Touch | null = null;
      for (let i = 0; i < event.changedTouches.length; i++) {
        if (event.changedTouches[i].identifier === touchIdRef.current) {
          activeTouch = event.changedTouches[i];
          break;
        }
      }

      if (activeTouch) {
        event.preventDefault(); // Prevent scrolling/zooming while joystick is actively being used
        const baseRect = baseRef.current.getBoundingClientRect();
        const touchXInBase = activeTouch.clientX - (baseRect.left + baseSize / 2);
        const touchYInBase = activeTouch.clientY - (baseRect.top + baseSize / 2);
        updateKnobAndEmit(touchXInBase, touchYInBase);
      }
    }
  }, [isDragging, baseSize, updateKnobAndEmit]);

  const handleTouchEndOrCancel = useCallback((event: TouchEvent) => {
    let touchEnded = false;
    for (let i = 0; i < event.changedTouches.length; i++) {
        if (event.changedTouches[i].identifier === touchIdRef.current) {
            touchEnded = true;
            break;
        }
    }

    if (touchEnded) {
      setIsDragging(false);
      setKnobPosition({ x: 0, y: 0 });
      onRelease();
      touchIdRef.current = null;
    }
  }, [onRelease, setIsDragging]);
  
  useEffect(() => {
    const currentBaseRef = baseRef.current;
    if (currentBaseRef) {
      currentBaseRef.addEventListener('touchstart', handleTouchStart, { passive: true }); // Changed to passive: true
      window.addEventListener('touchmove', handleTouchMove, { passive: false }); // Stays passive: false
      window.addEventListener('touchend', handleTouchEndOrCancel, { passive: true }); // Changed to passive: true
      window.addEventListener('touchcancel', handleTouchEndOrCancel, { passive: true }); // Changed to passive: true

      return () => {
        currentBaseRef.removeEventListener('touchstart', handleTouchStart);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEndOrCancel);
        window.removeEventListener('touchcancel',handleTouchEndOrCancel);
      };
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEndOrCancel]);

  return (
    <div
      ref={baseRef}
      className="joystick-base"
      style={{
        width: `${baseSize}px`,
        height: `${baseSize}px`,
        ...joystickPosition,
      }}
      aria-hidden="true" 
    >
      <div
        className="joystick-knob"
        style={{
          width: `${knobSize}px`,
          height: `${knobSize}px`,
          transform: `translate(calc(-50% + ${knobPosition.x}px), calc(-50% + ${knobPosition.y}px))`,
          // left and top are now handled by CSS for initial centering
        }}
      />
    </div>
  );
};

export default Joystick;