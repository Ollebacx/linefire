
import React from 'react';
import { GameObject, AllyType, Position, Size, Player, Enemy, EnemyType, Projectile, GameState, ShieldZone, ChainLightningEffect } from '../types';
import {
    PLAYER_SIZE, ALLY_SIZE, ENEMY_DEFAULT_SIZE, RPG_PROJECTILE_SIZE, FLAMER_PROJECTILE_SIZE, PROJECTILE_SIZE, GOLD_PILE_SIZE, COLLECTIBLE_ALLY_SIZE, // Renamed COIN_SIZE
    AIRSTRIKE_PROJECTILE_SIZE, UI_STROKE_PRIMARY, UI_BACKGROUND_NEUTRAL, UI_ACCENT_CRITICAL, UI_STROKE_SECONDARY, UI_ACCENT_WARNING, UI_ACCENT_SHIELD, UI_ACCENT_LIGHTNING,
    UI_ACCENT_SUBTLE, UI_ACCENT_HEALTH // Added missing imports
} from '../constants';
import { GAME_OVER_PENDING_DURATION_TICKS } from '../src/systems/WaveSystem'; // Import for opacity calculation

interface GameObjectViewProps {
  gameObject: GameObject & {
    color?: string;
    health?: number;
    maxHealth?: number;
    allyType?: AllyType;
    championType?: AllyType;
    visualKey?: string;
    rotation?: number;
    isPlayerProjectile?: boolean;
    velocity?: Position;
    causesShake?: boolean;
    enemyType?: EnemyType;
    distanceTraveled?: number;
    maxTravelDistance?: number;
    isAirstrike?: boolean;
    playerHitTimer?: number; // For player hit flash
    // For ShieldZone & BackgroundAnimation
    radius?: number;
    opacity?: number; // Used by ShieldZone and BackgroundAnimation entities
    // For ChainLightningEffect
    startX?: number;
    startY?: number;
    endX?: number;
    endY?: number;
    // For Projectile specific chain lightning
    alreadyChainedTo?: string[];
    chainsLeft?: number;
    playerChainLightningLevel?: number; // Player's current chain lightning upgrade level
  };
  entityType?: 'player' | 'ally' | 'enemy' | 'projectile' | 'goldPile' | 'collectibleAlly' | 'shieldZone' | 'chainLightningEffect'; // Renamed 'coin' to 'goldPile'
  camera: Position;
  viewport: Size;
  gameStatusForPlayer?: GameState['gameStatus']; // For player fade out
  gameOverPendingTimerForPlayer?: number; // For player fade out
}

const STROKE_WIDTH = '1.5px';
const STROKE_WIDTH_THICK = '2.5px';

const GameObjectView: React.FC<GameObjectViewProps> = ({
    gameObject, entityType, camera, viewport,
    gameStatusForPlayer, gameOverPendingTimerForPlayer
}) => {
  const { x: worldX, y: worldY, width, height, health, maxHealth, velocity, color: gameObjectColor, isAirstrike, playerHitTimer, rotation } = gameObject;
  const playerChampionType = entityType === 'player' ? (gameObject as Player).championType : undefined;
  const actualAllyType = entityType === 'ally' ? gameObject.allyType : undefined;
  const collectibleAllyType = entityType === 'collectibleAlly' ? gameObject.allyType : undefined;
  const enemyType = entityType === 'enemy' ? gameObject.enemyType : undefined;

  const renderX = worldX - camera.x;
  const renderY = worldY - camera.y;

  const cullBuffer = Math.max(width, height) * 2;
   if (entityType !== 'chainLightningEffect' &&
      (renderX + width < -cullBuffer ||
      renderX > viewport.width + cullBuffer ||
      renderY + height < -cullBuffer ||
      renderY > viewport.height + cullBuffer)
  ) {
    return null;
  }

  const showHealthBar = health !== undefined && maxHealth !== undefined && health < maxHealth && (entityType === 'enemy' || (entityType === 'player' && gameStatusForPlayer !== 'GAME_OVER_PENDING'));
  const healthBarYOffset = height + 4;

  const isPlayerEntity = entityType === 'player';
  const playerIsHit = isPlayerEntity && playerHitTimer && playerHitTimer > 0;

  let finalOpacity = 1;
  if (gameObject.opacity !== undefined) {
    finalOpacity = gameObject.opacity; // Prioritize explicit opacity from gameObject (for background anim, shield)
  } else if (isPlayerEntity && gameStatusForPlayer === 'GAME_OVER_PENDING' && gameOverPendingTimerForPlayer !== undefined && GAME_OVER_PENDING_DURATION_TICKS > 0) {
    finalOpacity = Math.max(0, gameOverPendingTimerForPlayer / GAME_OVER_PENDING_DURATION_TICKS);
  }

  if (isPlayerEntity && gameStatusForPlayer === 'GAME_OVER') {
    finalOpacity = 0;
  }


  const svgStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${renderX}px`,
    top: `${renderY}px`,
    width: `${width}px`,
    height: `${height}px`,
    overflow: 'visible',
    zIndex: entityType === 'projectile' || entityType === 'goldPile' ? 5 : (entityType === 'shieldZone' ? 4 : (entityType === 'chainLightningEffect' ? 6 : 10)), // goldPile instead of coin
    opacity: finalOpacity,
    transition: finalOpacity < 1 && (isPlayerEntity || entityType === 'shieldZone') ? 'opacity 0.05s linear' : 'none',
  };

  const playerStrokeColor = playerIsHit ? UI_ACCENT_CRITICAL : UI_STROKE_PRIMARY;

  const commonStrokeProps = {
    stroke: entityType === 'player' ? playerStrokeColor : UI_STROKE_PRIMARY,
    strokeWidth: STROKE_WIDTH,
    fill: 'none',
    vectorEffect: 'non-scaling-stroke',
  };

  const renderPlayerOrAllyGFX = (isPlayer: boolean, type?: AllyType) => {
    const championOrAllyType = isPlayer ? playerChampionType : type;
    const entitySize = isPlayer ? PLAYER_SIZE : ALLY_SIZE;
    const cx = entitySize.width / 2;
    const cy = entitySize.height / 2;
    const r = Math.min(cx, cy) * 0.8;
    const baseLineLen = r * 1.3;

    const currentCommonStrokeProps = {
        ...commonStrokeProps,
        stroke: isPlayer ? playerStrokeColor : UI_STROKE_PRIMARY,
    };

    let weaponGFX = <line x1={cx} y1={cy} x2={cx + baseLineLen} y2={cy} {...currentCommonStrokeProps} />;

    switch (championOrAllyType) {
      case AllyType.RIFLEMAN:
         weaponGFX = <line x1={cx} y1={cy} x2={cx + baseLineLen * 1.1} y2={cy} {...currentCommonStrokeProps} />;
        break;
      case AllyType.SHOTGUN:
        weaponGFX = (
          <g>
            <line x1={cx} y1={cy} x2={cx + baseLineLen * 0.8} y2={cy - baseLineLen * 0.35} {...currentCommonStrokeProps} />
            <line x1={cx} y1={cy} x2={cx + baseLineLen * 0.9} y2={cy} {...currentCommonStrokeProps} />
            <line x1={cx} y1={cy} x2={cx + baseLineLen * 0.8} y2={cy + baseLineLen * 0.35} {...currentCommonStrokeProps} />
          </g>
        );
        break;
      case AllyType.SNIPER:
        weaponGFX = <line x1={cx} y1={cy} x2={cx + baseLineLen * 2.2} y2={cy} {...currentCommonStrokeProps} strokeWidth={STROKE_WIDTH} />;
        break;
      case AllyType.MINIGUNNER:
        const minigunLineLen = baseLineLen * 1.1;
        const crossBarLen = baseLineLen * 0.4;
        weaponGFX = (
          <g>
            <line x1={cx} y1={cy} x2={cx + minigunLineLen} y2={cy} {...currentCommonStrokeProps} />
            <line x1={cx + minigunLineLen} y1={cy - crossBarLen/2} x2={cx + minigunLineLen} y2={cy + crossBarLen/2} {...currentCommonStrokeProps} />
          </g>
        );
        break;
      case AllyType.RPG_SOLDIER:
        weaponGFX = (
          <g>
            <line x1={cx} y1={cy} x2={cx + baseLineLen * 0.8} y2={cy} {...currentCommonStrokeProps} strokeWidth={STROKE_WIDTH_THICK} />
            <rect x={cx + baseLineLen * 0.8} y={cy - 2.5} width="5" height="5" {...currentCommonStrokeProps} fill={UI_BACKGROUND_NEUTRAL} strokeWidth={STROKE_WIDTH}/>
          </g>
        );
        break;
      case AllyType.FLAMER:
        weaponGFX = (
          <g>
            {[ -30, 0, 30].map(angle => (
                 <path key={angle} d={`M ${cx},${cy} Q ${cx + baseLineLen*0.6},${cy + Math.tan(angle * Math.PI / 180) * baseLineLen*0.4} ${cx + baseLineLen*1.0},${cy + Math.tan(angle * Math.PI / 180) * baseLineLen*0.7}`} {...currentCommonStrokeProps} />
            ))}
          </g>
        );
        break;
    }

    let rotationAngle = 0;
    if (velocity) {
        if(velocity.x !== 0 || velocity.y !== 0) {
          rotationAngle = Math.atan2(velocity.y, velocity.x) * 180 / Math.PI;
        }
    }
    if (entityType === 'collectibleAlly') rotationAngle = 0;

    return (
      <g transform={`rotate(${rotationAngle} ${cx} ${cy})`}>
        <circle cx={cx} cy={cy} r={r} {...currentCommonStrokeProps} fill={isPlayer || entityType === 'collectibleAlly' ? UI_BACKGROUND_NEUTRAL : 'none'} />
        {isPlayer && <circle cx={cx} cy={cy} r={r * 0.3} fill={playerStrokeColor} stroke="none" />}
        {weaponGFX}
      </g>
    );
  };

  const renderEnemyGFX = () => {
    const cx = width / 2;
    const cy = height / 2;
    const size = Math.min(width, height) * 0.8; // Base size for GFX elements

    let enemyRotationAngle = 0;
    if (velocity && (velocity.x !==0 || velocity.y !==0)) {
        enemyRotationAngle = Math.atan2(velocity.y, velocity.x) * 180 / Math.PI;
    }

    let coreShape;
    switch (enemyType) {
      case EnemyType.MELEE_GRUNT:
        coreShape = <rect x={cx - size/2} y={cy - size/2} width={size} height={size} {...commonStrokeProps} />;
        break;
      case EnemyType.RANGED_SHOOTER:
        coreShape = (
          <g>
            <rect x={cx - size/2} y={cy - size/2} width={size} height={size} {...commonStrokeProps} />
            {/* Simple circle on the "front" to indicate shooting direction */}
            <circle cx={size * 0.4} cy={0} r={size * 0.1} transform={`translate(${cx}, ${cy})`} fill={UI_STROKE_PRIMARY} stroke="none" />
          </g>
        );
        break;
      case EnemyType.ROCKET_TANK:
        coreShape = (
          <g>
            <rect x={cx - size/2} y={cy - size/2} width={size} height={size} {...commonStrokeProps} strokeWidth={STROKE_WIDTH_THICK} />
            {/* Inner square for detail */}
            <rect x={cx - size*0.3} y={cy - size*0.3} width={size*0.6} height={size*0.6} {...commonStrokeProps} />
             {/* Simple barrel line */}
            <line x1={cx} y1={cy} x2={cx + size * 0.5} y2={cy} {...commonStrokeProps} strokeWidth={STROKE_WIDTH_THICK} />
          </g>
        );
        break;
      case EnemyType.AGILE_STALKER:
        coreShape = (
          <g>
            {/* Diamond shape */}
            <path d={`M ${cx} ${cy - size/2} L ${cx + size/2} ${cy} L ${cx} ${cy + size/2} L ${cx - size/2} ${cy} Z`} {...commonStrokeProps} />
            {/* Simple "eye" lines */}
            <path d={`M ${-size*0.1} ${-size*0.15} Q ${size*0.2} ${0} ${-size*0.1} ${size*0.15}`} transform={`translate(${cx}, ${cy})`} {...commonStrokeProps} strokeWidth="1px"/>
            <path d={`M ${size*0.1} ${-size*0.15} Q ${-size*0.2} ${0} ${size*0.1} ${size*0.15}`} transform={`translate(${cx}, ${cy})`} {...commonStrokeProps} strokeWidth="1px"/>
          </g>
        );
        break;
      case EnemyType.ENEMY_SNIPER:
        const sniperBodyWidth = size * 0.8;
        const sniperBodyHeight = size * 0.6;
        const barrelLength = size * 1.0; // Longer barrel
        const barrelThickness = size * 0.1;
        coreShape = (
            <g>
                {/* Body */}
                <rect 
                    x={cx - sniperBodyWidth / 2} 
                    y={cy - sniperBodyHeight / 2} 
                    width={sniperBodyWidth} 
                    height={sniperBodyHeight} 
                    {...commonStrokeProps} 
                    rx="2"
                />
                {/* Barrel - extending from the center of the body's "front" edge */}
                <rect 
                    x={cx + sniperBodyWidth / 2 - barrelThickness / 2} // Start barrel from edge of body
                    y={cy - barrelThickness / 2} 
                    width={barrelLength} 
                    height={barrelThickness} 
                    fill={UI_STROKE_PRIMARY} // Solid barrel
                    stroke="none"
                />
            </g>
        );
        break;
      case EnemyType.ELECTRIC_DRONE:
        coreShape = (
            <g>
                <circle cx={cx} cy={cy} r={size/2} {...commonStrokeProps} />
                <circle cx={cx} cy={cy} r={size/3} {...commonStrokeProps} fill={UI_ACCENT_LIGHTNING + '33'} />
                 {/* Small lines/antennae */}
                {[0, 90, 180, 270].map(angle => (
                    <line 
                        key={angle}
                        x1={cx} y1={cy}
                        x2={cx + Math.cos(angle * Math.PI / 180) * (size/2 + size*0.1)}
                        y2={cy + Math.sin(angle * Math.PI / 180) * (size/2 + size*0.1)}
                        {...commonStrokeProps}
                        strokeWidth="1px"
                    />
                ))}
            </g>
        );
        break;
      case EnemyType.TUTORIAL_DUMMY:
          coreShape = (
              <g>
                  <circle cx={cx} cy={cy} r={size / 2} {...commonStrokeProps} fill={UI_ACCENT_SUBTLE + '55'}/>
                  <line x1={cx - size/3} y1={cy - size/3} x2={cx + size/3} y2={cy + size/3} {...commonStrokeProps} strokeWidth="1px"/>
                  <line x1={cx - size/3} y1={cy + size/3} x2={cx + size/3} y2={cy - size/3} {...commonStrokeProps} strokeWidth="1px"/>
              </g>
          );
          break;
      default:
        coreShape = <rect x={cx - size/2} y={cy - size/2} width={size} height={size} {...commonStrokeProps} />;
        break;
    }
    return (
        <svg style={{...svgStyle, overflow: 'visible'}} viewBox={`0 0 ${width} ${height}`}>
          <g transform={`rotate(${enemyRotationAngle} ${width / 2} ${height / 2})`}>
            {coreShape}
          </g>
          {showHealthBar && (
            <g transform={`translate(0, ${healthBarYOffset})`}>
              <rect x="0" y="0" width={width} height="4" fill={UI_ACCENT_SUBTLE} rx="1" />
              <rect x="0" y="0" width={width * (health! / maxHealth!)} height="4" fill={UI_ACCENT_HEALTH} rx="1" />
            </g>
          )}
        </svg>
      );
  };

  if (entityType === 'player') {
    return (
        <svg style={svgStyle} viewBox={`0 0 ${PLAYER_SIZE.width} ${PLAYER_SIZE.height}`}>
            {renderPlayerOrAllyGFX(true)}
            {showHealthBar && (
                <g transform={`translate(0, ${healthBarYOffset})`}>
                <rect x="0" y="0" width={width} height="5" fill={UI_ACCENT_SUBTLE} rx="1.5" />
                <rect x="0" y="0" width={width * (health! / maxHealth!)} height="5" fill={UI_ACCENT_HEALTH} rx="1.5" />
                </g>
            )}
        </svg>
    );
  } else if (entityType === 'ally') {
    return (
        <svg style={svgStyle} viewBox={`0 0 ${ALLY_SIZE.width} ${ALLY_SIZE.height}`}>
            {renderPlayerOrAllyGFX(false, actualAllyType)}
        </svg>
    );
  } else if (entityType === 'collectibleAlly') {
    return (
      <svg style={{...svgStyle, animation: 'pulse 1.5s infinite ease-in-out'}} viewBox={`0 0 ${COLLECTIBLE_ALLY_SIZE.width} ${COLLECTIBLE_ALLY_SIZE.height}`}>
        {renderPlayerOrAllyGFX(false, collectibleAllyType)}
      </svg>
    );
  } else if (entityType === 'enemy') {
    return renderEnemyGFX();
  } else if (entityType === 'projectile') {
    const projCx = width / 2;
    const projCy = height / 2;
    const projectileColor = gameObjectColor || UI_STROKE_PRIMARY;
    let projShape;
    const isRPGTypeProjectile = width === RPG_PROJECTILE_SIZE.width && height === RPG_PROJECTILE_SIZE.height;


    if (gameObject.isAirstrike) {
        const W_missile = width;
        const H_missile = height;

        const bodyWidth = W_missile * 0.7;
        const bodyHeight = H_missile * 0.7;
        const noseHeight = H_missile * 0.2;
        const finHeight = H_missile * 0.15;
        const finWidth = W_missile * 0.3; 

        const bodyX = (W_missile - bodyWidth) / 2;
        const bodyY = noseHeight;

        projShape = (
          <g>
            <path
              d={`M ${W_missile/2},0
                 L ${bodyX},${noseHeight}
                 L ${bodyX + bodyWidth},${noseHeight}
                 Z`}
              fill={UI_ACCENT_CRITICAL}
              stroke={UI_STROKE_PRIMARY}
              strokeWidth={STROKE_WIDTH}
            />
            <rect
              x={bodyX}
              y={bodyY}
              width={bodyWidth}
              height={bodyHeight}
              fill={UI_ACCENT_CRITICAL}
              stroke={UI_STROKE_PRIMARY}
              strokeWidth={STROKE_WIDTH}
              rx="1"
            />
            <path
              d={`M ${bodyX},${bodyY + bodyHeight}
                 L ${bodyX - finWidth / 2},${bodyY + bodyHeight + finHeight}
                 L ${bodyX + finWidth / 2},${bodyY + bodyHeight}
                 Z`}
              fill={UI_ACCENT_CRITICAL}
              stroke={UI_STROKE_PRIMARY}
              strokeWidth={STROKE_WIDTH}
            />
            <path
              d={`M ${bodyX + bodyWidth},${bodyY + bodyHeight}
                 L ${bodyX + bodyWidth + finWidth / 2},${bodyY + bodyHeight + finHeight}
                 L ${bodyX + bodyWidth - finWidth / 2},${bodyY + bodyHeight}
                 Z`}
              fill={UI_ACCENT_CRITICAL}
              stroke={UI_STROKE_PRIMARY}
              strokeWidth={STROKE_WIDTH}
            />
          </g>
        );
    } else if (isRPGTypeProjectile) {
        projShape = (
            <rect
                x={0} // Centered by the group's transform
                y={0} // Centered by the group's transform
                width={width} // This is the length (e.g., 16)
                height={height} // This is the thickness (e.g., 5)
                fill={projectileColor}
                rx={height / 3} // Rounded ends for the line
                ry={height / 3}
            />
        );
    } else if (width === FLAMER_PROJECTILE_SIZE.width) { // Flamer projectile
      const flameColors = [UI_ACCENT_WARNING, UI_ACCENT_CRITICAL, '#FFA500']; // Orange, Red, Darker Orange
      const numFlames = 3 + Math.floor(Math.random() * 3); // 3 to 5 flame licks
      projShape = (
        <g opacity={(gameObject.distanceTraveled !== undefined && gameObject.maxTravelDistance !== undefined) ? (1 - (gameObject.distanceTraveled / gameObject.maxTravelDistance)) : 1}>
          {Array.from({ length: numFlames }).map((_, i) => {
            const angle = (i / numFlames) * Math.PI * 2 + (Math.random() - 0.5) * 0.5; // Add some randomness
            const length = width * (0.3 + Math.random() * 0.4);
            const x2 = projCx + Math.cos(angle) * length;
            const y2 = projCy + Math.sin(angle) * length;
            const controlX = projCx + Math.cos(angle + Math.PI / 2) * length * 0.3 * (Math.random() > 0.5 ? 1 : -1); // Wiggle control point
            const controlY = projCy + Math.sin(angle + Math.PI / 2) * length * 0.3 * (Math.random() > 0.5 ? 1 : -1);
            return (
              <path
                key={i}
                d={`M ${projCx} ${projCy} Q ${controlX} ${controlY} ${x2} ${y2}`}
                stroke={flameColors[i % flameColors.length]}
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
            );
          })}
        </g>
      );
    } else { // Default or other projectiles
        const baseRadius = Math.min(width,height)/2 * (width === RPG_PROJECTILE_SIZE.width ? 0.6 : 0.8);
        projShape = <circle cx={projCx} cy={projCy} r={baseRadius} fill={projectileColor} />;
        if (gameObject.playerChainLightningLevel && gameObject.playerChainLightningLevel > 0 && gameObject.isPlayerProjectile) {
            const lightningColor = UI_ACCENT_LIGHTNING + 'AA'; // Semi-transparent
            projShape = (
                <g>
                    <circle cx={projCx} cy={projCy} r={baseRadius} fill={projectileColor} />
                    <circle cx={projCx} cy={projCy} r={baseRadius * 1.5} fill="none" stroke={lightningColor} strokeWidth="1px" strokeDasharray="2 2">
                         <animate attributeName="stroke-dashoffset" values="0;8" dur="0.5s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={projCx} cy={projCy} r={baseRadius * 0.8} fill="none" stroke={lightningColor} strokeWidth="0.5px" />
                </g>
            );
        }
    }
     let projRotation = 0;
     if (velocity && (velocity.x !==0 || velocity.y !==0)) {
         projRotation = Math.atan2(velocity.y, velocity.x) * 180 / Math.PI;
         if (gameObject.isAirstrike) projRotation = 180;
     }

    return (
      <svg style={svgStyle} viewBox={`0 0 ${width} ${height}`}>
        <g transform={`rotate(${projRotation} ${projCx} ${projCy})`}>
          {projShape}
        </g>
      </svg>
    );
  } else if (entityType === 'goldPile') {
    const goldCx = width / 2;
    const goldCy = height / 2;
    const goldRadius = Math.min(width, height) / 2 * 0.8;
    return (
      <svg style={svgStyle} viewBox={`0 0 ${width} ${height}`}>
        <circle
          cx={goldCx}
          cy={goldCy}
          r={goldRadius}
          fill="none"
          stroke={gameObjectColor || UI_ACCENT_WARNING}
          strokeWidth={STROKE_WIDTH}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  } else if (entityType === 'shieldZone' && gameObject.radius !== undefined) {
    return (
        <svg style={svgStyle} viewBox={`0 0 ${width} ${height}`}>
            <circle
                cx={width / 2}
                cy={height / 2}
                r={gameObject.radius}
                fill={`${UI_ACCENT_SHIELD}1A`} // Very transparent fill
                stroke={UI_ACCENT_SHIELD}
                strokeWidth={STROKE_WIDTH_THICK}
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
  } else if (entityType === 'chainLightningEffect' && gameObject.startX !== undefined) {
      const { startX, startY, endX, endY, color } = gameObject as unknown as ChainLightningEffect;
      const screenStartX = startX - camera.x;
      const screenStartY = startY - camera.y;
      const screenEndX = endX - camera.x;
      const screenEndY = endY - camera.y;

      const dx = screenEndX - screenStartX;
      const dy = screenEndY - screenStartY;
      const numSegments = 5;
      const segmentLengthX = dx / numSegments;
      const segmentLengthY = dy / numSegments;
      const randomOffset = Math.min(Math.abs(dx), Math.abs(dy)) * 0.2 + 5; // Max offset for jaggedness

      let pathData = `M ${screenStartX} ${screenStartY}`;
      for (let i = 1; i < numSegments; i++) {
          const midX = screenStartX + segmentLengthX * i + (Math.random() - 0.5) * randomOffset;
          const midY = screenStartY + segmentLengthY * i + (Math.random() - 0.5) * randomOffset;
          pathData += ` L ${midX} ${midY}`;
      }
      pathData += ` L ${screenEndX} ${screenEndY}`;

      return (
          <svg style={{ position: 'absolute', top: 0, left: 0, width: viewport.width, height: viewport.height, zIndex: 6, pointerEvents: 'none', opacity: finalOpacity }}>
              <path d={pathData} stroke={color || UI_ACCENT_LIGHTNING} strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d={pathData} stroke={UI_BACKGROUND_NEUTRAL + 'AA'} strokeWidth="0.7" fill="none" strokeLinecap="round" />
          </svg>
      );
  }


  return null; // Should not happen if entityType is defined and handled
};

export default GameObjectView;
