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
  baseSize = 80, // Diameter of the joystick base
  knobSize = 30,  // Diameter of the knob
  baseColor = 'rgba(100, 100, 100, 0.3)',
  knobColor = 'rgba(200, 200, 200, 0.6)',
  joystickPosition = { bottom: '50px', right: '50px' } // Default to bottom-left
}) => {
  const baseRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [knobPosition, setKnobPosition] = useState<Position>({ x: 0, y: 0 }); // Relative to base center
  const touchIdRef = useRef<number | null>(null);

  const maxKnobOffset = (baseSize - knobSize) / 2;

  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (event.touches.length === 1 && baseRef.current) { // Only primary touch
      event.preventDefault(); // Prevent page scroll, zoom
      const touch = event.touches[0];
      touchIdRef.current = touch.identifier;
      setIsDragging(true);
      
      const baseRect = baseRef.current.getBoundingClientRect();
      const touchXInBase = touch.clientX - (baseRect.left + baseSize / 2);
      const touchYInBase = touch.clientY - (baseRect.top + baseSize / 2);
      
      updateKnobAndEmit(touchXInBase, touchYInBase);
    }
  }, [baseSize, onMove]);

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
        event.preventDefault();
        const baseRect = baseRef.current.getBoundingClientRect();
        const touchXInBase = activeTouch.clientX - (baseRect.left + baseSize / 2);
        const touchYInBase = activeTouch.clientY - (baseRect.top + baseSize / 2);
        updateKnobAndEmit(touchXInBase, touchYInBase);
      }
    }
  }, [isDragging, baseSize, onMove]);

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
  }, [onRelease]);

  const updateKnobAndEmit = (rawX: number, rawY: number) => {
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
  };
  
  useEffect(() => {
    const currentBaseRef = baseRef.current;
    if (currentBaseRef) {
      currentBaseRef.addEventListener('touchstart', handleTouchStart, { passive: false });
      // Listen on window for move and end to allow dragging outside the base
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEndOrCancel, { passive: false });
      window.addEventListener('touchcancel', handleTouchEndOrCancel, { passive: false });

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
        backgroundColor: baseColor,
        ...joystickPosition,
      }}
      aria-hidden="true" // Decorative, control is implicit
    >
      <div
        className="joystick-knob"
        style={{
          width: `${knobSize}px`,
          height: `${knobSize}px`,
          backgroundColor: knobColor,
          transform: `translate(${knobPosition.x}px, ${knobPosition.y}px)`,
          left: `${(baseSize - knobSize) / 2}px`, // Center knob initially
          top: `${(baseSize - knobSize) / 2}px`,
        }}
      />
    </div>
  );
};

export default Joystick;
