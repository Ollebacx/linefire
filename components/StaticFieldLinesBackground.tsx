import React, { useState, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Position, Size } from '../types';
import { UI_ACCENT_SUBTLE } from '../constants'; // Import the constant for line color

interface Line {
  id: string;
  x1: number; // world coordinate
  y1: number; // world coordinate
  x2: number; // world coordinate
  y2: number; // world coordinate
}

interface StaticFieldLinesBackgroundProps {
  worldArea: Size;
  camera: Position;
  gameArea: Size; // viewport
  numberOfLines?: number;
  lineColor?: string;
  lineLength?: { min: number; max: number };
  strokeWidth?: number;
}

const StaticFieldLinesBackground: React.FC<StaticFieldLinesBackgroundProps> = ({
  worldArea,
  camera,
  gameArea,
  numberOfLines = 400,
  lineColor = UI_ACCENT_SUBTLE, // Changed to light gray constant
  lineLength = { min: 5, max: 12 },
  strokeWidth = 1, // Changed to thin lines
}) => {
  const [lines, setLines] = useState<Line[]>([]);

  useEffect(() => {
    const newLines: Line[] = [];
    if (worldArea.width > 0 && worldArea.height > 0) {
      for (let i = 0; i < numberOfLines; i++) {
        const startX = Math.random() * worldArea.width;
        const startY = Math.random() * worldArea.height;
        const angle = Math.random() * Math.PI * 2;
        const length = lineLength.min + Math.random() * (lineLength.max - lineLength.min);
        const endX = startX + Math.cos(angle) * length;
        const endY = startY + Math.sin(angle) * length;
        newLines.push({
          id: uuidv4(),
          x1: startX,
          y1: startY,
          x2: endX,
          y2: endY,
        });
      }
      setLines(newLines);
    }
  }, [worldArea.width, worldArea.height, numberOfLines, lineLength.min, lineLength.max]);

  const visibleLines = useMemo(() => {
    if (!gameArea.width || !gameArea.height) return [];
    return lines.filter(line => {
      const screenX1 = line.x1 - camera.x;
      const screenY1 = line.y1 - camera.y;
      const screenX2 = line.x2 - camera.x;
      const screenY2 = line.y2 - camera.y;

      // Culling logic: check if the line's bounding box is outside the viewport
      // Add a small buffer to the culling to avoid lines disappearing too abruptly at edges.
      const buffer = Math.max(lineLength.max, 20); 
      if (Math.max(screenX1, screenX2) < -buffer || Math.min(screenX1, screenX2) > gameArea.width + buffer ||
          Math.max(screenY1, screenY2) < -buffer || Math.min(screenY1, screenY2) > gameArea.height + buffer) {
        return false;
      }
      return true;
    });
  }, [lines, camera, gameArea, lineLength.max]);

  if (!worldArea.width || !worldArea.height) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        zIndex: 1, // Set to -1 to be behind game objects but in front of parent's background
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        {visibleLines.map(line => (
          <line
            key={line.id}
            x1={line.x1 - camera.x}
            y1={line.y1 - camera.y}
            x2={line.x2 - camera.x}
            y2={line.y2 - camera.y}
            stroke={lineColor}
            strokeWidth={strokeWidth}
            shapeRendering="crispEdges" // Ensures thin lines are rendered sharply
          />
        ))}
      </svg>
    </div>
  );
};

export default React.memo(StaticFieldLinesBackground);