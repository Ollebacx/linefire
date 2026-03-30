
import React from 'react';
import { Position, Size, Player, GameObject, AllyType, EnemyType } from '../types';
import { UI_STROKE_PRIMARY, UI_ACCENT_CRITICAL, UI_STROKE_SECONDARY } from '../constants';

interface OffScreenIndicatorProps {
  target: GameObject & { allyType?: AllyType; enemyType?: EnemyType };
  indicatorType: 'collectibleAlly' | 'enemy';
  player: Player;
  camera: Position;
  viewport: Size;
}

const INDICATOR_SIZE = 20; // px, size of the indicator's bounding box
const PADDING = 15;       // px from edge, increased slightly for better visibility
const EPSILON = 0.00001; // Small value to prevent division by zero

const OffScreenIndicator: React.FC<OffScreenIndicatorProps> = ({ target, indicatorType, player, camera, viewport }) => {
  const playerCenterScreenX = (player.x - camera.x) + player.width / 2;
  const playerCenterScreenY = (player.y - camera.y) + player.height / 2;

  const targetCenterScreenX = (target.x - camera.x) + target.width / 2;
  const targetCenterScreenY = (target.y - camera.y) + target.height / 2;

  let dirX = targetCenterScreenX - playerCenterScreenX;
  let dirY = targetCenterScreenY - playerCenterScreenY;

  if (Math.abs(dirX) < EPSILON && Math.abs(dirY) < EPSILON) {
    dirX = EPSILON; 
  }

  const angleRad = Math.atan2(dirY, dirX);
  let angleDeg = angleRad * (180 / Math.PI);
  if (isNaN(angleDeg)) angleDeg = 0;

  const viewportCenterX = viewport.width / 2;
  const viewportCenterY = viewport.height / 2;
  
  // These are distances from viewport center to the padded edge
  const paddedHalfWidth = (viewport.width - 2 * PADDING) / 2;
  const paddedHalfHeight = (viewport.height - 2 * PADDING) / 2;

  // Absolute coordinates of the padded box edges
  const paddedBoxLeft = viewportCenterX - paddedHalfWidth; // Equivalent to PADDING
  const paddedBoxRight = viewportCenterX + paddedHalfWidth; // Equivalent to viewport.width - PADDING
  const paddedBoxTop = viewportCenterY - paddedHalfHeight; // Equivalent to PADDING
  const paddedBoxBottom = viewportCenterY + paddedHalfHeight; // Equivalent to viewport.height - PADDING
  
  let t = Infinity;

  // Top edge
  if (Math.abs(dirY) > EPSILON) {
    const t_top = (paddedBoxTop - playerCenterScreenY) / dirY;
    const x_at_t_top = playerCenterScreenX + t_top * dirX;
    if (t_top >= 0 && x_at_t_top >= paddedBoxLeft && x_at_t_top <= paddedBoxRight) {
      t = Math.min(t, t_top);
    }
  }

  // Bottom edge
  if (Math.abs(dirY) > EPSILON) {
    const t_bottom = (paddedBoxBottom - playerCenterScreenY) / dirY;
    const x_at_t_bottom = playerCenterScreenX + t_bottom * dirX;
    if (t_bottom >= 0 && x_at_t_bottom >= paddedBoxLeft && x_at_t_bottom <= paddedBoxRight) {
      t = Math.min(t, t_bottom);
    }
  }
  
  // Left edge
  if (Math.abs(dirX) > EPSILON) {
    const t_left = (paddedBoxLeft - playerCenterScreenX) / dirX;
    const y_at_t_left = playerCenterScreenY + t_left * dirY;
    if (t_left >= 0 && y_at_t_left >= paddedBoxTop && y_at_t_left <= paddedBoxBottom) {
      t = Math.min(t, t_left);
    }
  }

  // Right edge
  if (Math.abs(dirX) > EPSILON) {
    const t_right = (paddedBoxRight - playerCenterScreenX) / dirX;
    const y_at_t_right = playerCenterScreenY + t_right * dirY;
    if (t_right >= 0 && y_at_t_right >= paddedBoxTop && y_at_t_right <= paddedBoxBottom) {
      t = Math.min(t, t_right);
    }
  }
  
  let indicatorEdgeX: number;
  let indicatorEdgeY: number;

  if (t !== Infinity && t >=0) { // t should be non-negative if found
      indicatorEdgeX = playerCenterScreenX + t * dirX;
      indicatorEdgeY = playerCenterScreenY + t * dirY;
  } else {
      // Fallback: If primary logic didn't find an intersection (e.g., player outside padded box looking away)
      // This situation is complex. A simple fallback is to aim for the closest screen corner or edge point.
      // For now, default to a corner, though this might not be ideal if player is far off.
      // The primary logic should cover most cases where player is on-screen or near-screen.
      // A simple projection towards target, clamped to PADDING might be better here.
      let projectedX = playerCenterScreenX + (viewport.width) * Math.cos(angleRad); // Project far
      let projectedY = playerCenterScreenY + (viewport.height) * Math.sin(angleRad); // Project far
      
      indicatorEdgeX = Math.max(PADDING, Math.min(projectedX, viewport.width - PADDING));
      indicatorEdgeY = Math.max(PADDING, Math.min(projectedY, viewport.height - PADDING));

      // If still not on an edge (e.g. target was on-screen by center, but this indicator code was called),
      // try to push it to an edge. This is a last resort.
      const dxEdge = indicatorEdgeX - viewportCenterX;
      const dyEdge = indicatorEdgeY - viewportCenterY;

      if (Math.abs(dxEdge / (viewport.width/2)) > Math.abs(dyEdge / (viewport.height/2))) { // Closer to vertical edge
          indicatorEdgeX = dxEdge > 0 ? viewport.width - PADDING : PADDING;
      } else { // Closer to horizontal edge
          indicatorEdgeY = dyEdge > 0 ? viewport.height - PADDING : PADDING;
      }
  }

  // Final clamping to ensure it's visually within the absolute padded box
  indicatorEdgeX = Math.max(PADDING, Math.min(indicatorEdgeX, viewport.width - PADDING));
  indicatorEdgeY = Math.max(PADDING, Math.min(indicatorEdgeY, viewport.height - PADDING));
  
  let finalIndicatorX = indicatorEdgeX - INDICATOR_SIZE / 2;
  let finalIndicatorY = indicatorEdgeY - INDICATOR_SIZE / 2;

  if (isNaN(finalIndicatorX)) finalIndicatorX = PADDING; // Default to a safe visible spot
  if (isNaN(finalIndicatorY)) finalIndicatorY = PADDING;

  const strokeColor = indicatorType === 'enemy' ? UI_ACCENT_CRITICAL : UI_STROKE_SECONDARY;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${finalIndicatorX}px`,
        top: `${finalIndicatorY}px`,
        width: `${INDICATOR_SIZE}px`,
        height: `${INDICATOR_SIZE}px`,
        transform: `rotate(${angleDeg}deg)`,
        zIndex: 200,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 5L21 12L14 19" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="3" y1="12" x2="19" y2="12" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
      </svg>
    </div>
  );
};

export default OffScreenIndicator;
