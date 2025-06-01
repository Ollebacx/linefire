
import React from 'react';
import { GameObject, AllyType, Position, Size, Player, Enemy, EnemyType, Projectile, GameState } from '../types';
import {
    PLAYER_SIZE, ALLY_SIZE, ENEMY_DEFAULT_SIZE, RPG_PROJECTILE_SIZE, FLAMER_PROJECTILE_SIZE, PROJECTILE_SIZE, COIN_SIZE, COLLECTIBLE_ALLY_SIZE,
    AIRSTRIKE_PROJECTILE_SIZE, UI_STROKE_PRIMARY, UI_BACKGROUND_NEUTRAL, UI_ACCENT_CRITICAL, UI_STROKE_SECONDARY, UI_ACCENT_WARNING
} from '../constants';
import { GAME_OVER_PENDING_DURATION_TICKS } from '../hooks/useGameLogic'; // Import for opacity calculation

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
  };
  entityType?: 'player' | 'ally' | 'enemy' | 'projectile' | 'coin' | 'collectibleAlly'; 
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
  const { x: worldX, y: worldY, width, height, health, maxHealth, velocity, color: gameObjectColor, isAirstrike, playerHitTimer } = gameObject;
  const playerChampionType = entityType === 'player' ? (gameObject as Player).championType : undefined;
  const actualAllyType = entityType === 'ally' ? gameObject.allyType : undefined;
  const collectibleAllyType = entityType === 'collectibleAlly' ? gameObject.allyType : undefined;
  const enemyType = entityType === 'enemy' ? gameObject.enemyType : undefined;

  const renderX = worldX - camera.x;
  const renderY = worldY - camera.y;

  const cullBuffer = Math.max(width, height) * 2;
  if (
    renderX + width < -cullBuffer ||
    renderX > viewport.width + cullBuffer ||
    renderY + height < -cullBuffer ||
    renderY > viewport.height + cullBuffer
  ) {
    return null;
  }

  const showHealthBar = health !== undefined && maxHealth !== undefined && (entityType === 'enemy' || (entityType === 'player' && gameStatusForPlayer !== 'GAME_OVER_PENDING'));
  const healthBarYOffset = height + 4; 

  const isPlayerEntity = entityType === 'player';
  const playerIsHit = isPlayerEntity && playerHitTimer && playerHitTimer > 0;

  let entityOpacity = 1;
  if (isPlayerEntity && gameStatusForPlayer === 'GAME_OVER_PENDING' && gameOverPendingTimerForPlayer !== undefined && GAME_OVER_PENDING_DURATION_TICKS > 0) {
    entityOpacity = Math.max(0, gameOverPendingTimerForPlayer / GAME_OVER_PENDING_DURATION_TICKS);
  }
   if (isPlayerEntity && gameStatusForPlayer === 'GAME_OVER') { // Ensure player is not visible after fade out
    entityOpacity = 0;
  }


  const svgStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${renderX}px`,
    top: `${renderY}px`,
    width: `${width}px`,
    height: `${height}px`,
    overflow: 'visible',
    zIndex: entityType === 'projectile' || entityType === 'coin' ? 5 : 10,
    opacity: entityOpacity,
    transition: entityOpacity < 1 ? 'opacity 0.05s linear' : 'none', // Smooth fade for player
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
        stroke: isPlayer ? playerStrokeColor : UI_STROKE_PRIMARY, // Ensure player uses dynamic stroke
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
    const size = Math.min(width, height) * 0.8;

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
            <circle cx={size*0.9} cy={0} r={size*0.1} transform={`translate(${cx - size*0.9}, ${cy})`} fill={UI_STROKE_PRIMARY} stroke="none" />
          </g>
        );
        break;
      case EnemyType.ROCKET_TANK:
        coreShape = (
          <g>
            <rect x={cx - size/2} y={cy - size/2} width={size} height={size} {...commonStrokeProps} strokeWidth={STROKE_WIDTH_THICK} />
            <rect x={cx - size*0.3} y={cy - size*0.3} width={size*0.6} height={size*0.6} {...commonStrokeProps} />
          </g>
        );
        break;
      case EnemyType.AGILE_STALKER:
        coreShape = (
          <g>
            <path d={`M ${cx} ${cy - size/2} L ${cx + size/2} ${cy} L ${cx} ${cy + size/2} L ${cx - size/2} ${cy} Z`} {...commonStrokeProps} />
            <path d={`M ${-size*0.1} ${-size*0.15} Q ${size*0.2} ${0} ${-size*0.1} ${size*0.15}`} transform={`translate(${cx}, ${cy})`} {...commonStrokeProps} strokeWidth="1px"/>
            <path d={`M ${size*0.1} ${-size*0.15} Q ${-size*0.2} ${0} ${size*0.1} ${size*0.15}`} transform={`translate(${cx}, ${cy})`} {...commonStrokeProps} strokeWidth="1px"/>
          </g>
        );
        break;
      case EnemyType.ELECTRIC_DRONE:
        const droneR = size / 2;
        coreShape = (
          <g>
            <circle cx={cx} cy={cy} r={droneR} {...commonStrokeProps} />
            {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
              <line key={angle}
                x1={cx + droneR * 0.8 * Math.cos(angle * Math.PI / 180)}
                y1={cy + droneR * 0.8 * Math.sin(angle * Math.PI / 180)}
                x2={cx + droneR * 1.2 * Math.cos(angle * Math.PI / 180)}
                y2={cy + droneR * 1.2 * Math.sin(angle * Math.PI / 180)}
                {...commonStrokeProps} strokeWidth="1px"
              />
            ))}
          </g>
        );
        return coreShape; 
      case EnemyType.ENEMY_SNIPER:
        coreShape = (
          <g>
            <rect x={cx - size/2} y={cy - size/2} width={size} height={size} {...commonStrokeProps} />
            <line x1={0} y1={0} x2={size * 1.3} y2={0} transform={`translate(${cx}, ${cy})`} {...commonStrokeProps} strokeWidth={STROKE_WIDTH} />
          </g>
        );
        break;
      default:
        coreShape = <rect x={cx - size/2} y={cy - size/2} width={size} height={size} {...commonStrokeProps} />;
    }
    return <g transform={`rotate(${enemyRotationAngle} ${cx} ${cy})`}>{coreShape}</g>;
  };

  const renderProjectileGFX = () => {
    const proj = gameObject as Projectile;
    const projColor = proj.isAirstrike ? UI_ACCENT_WARNING : (gameObjectColor || UI_STROKE_PRIMARY);
    const cx = width / 2;
    const cy = height / 2;
    let projectileRotationAngle = 0;
    if (proj.velocity && (proj.velocity.x !== 0 || proj.velocity.y !== 0)) {
        projectileRotationAngle = Math.atan2(proj.velocity.y, proj.velocity.x) * 180 / Math.PI;
    }

    if (proj.isAirstrike) {
        const w = AIRSTRIKE_PROJECTILE_SIZE.width;
        const h = AIRSTRIKE_PROJECTILE_SIZE.height;
        const tipY = cy + h/2 * 0.8; 
        const tailY = cy - h/2 * 0.8;
        const tailWidthFactor = 0.6;
        // The missile SVG is drawn pointing downwards (tipY > tailY), which is an effective 90-degree orientation.
        // projectileRotationAngle is the angle of the velocity vector.
        // To align the SVG with the velocity, we adjust by the SVG's inherent 90-degree drawing orientation.
        const finalRotationForAirstrike = projectileRotationAngle - 90;
        return (
             <g transform={`rotate(${finalRotationForAirstrike} ${cx} ${cy})`}>
                <polygon 
                    points={`${cx - w/2 * tailWidthFactor},${tailY} ${cx + w/2 * tailWidthFactor},${tailY} ${cx},${tipY}`} 
                    fill={projColor} 
                    stroke={UI_STROKE_PRIMARY} 
                    strokeWidth="1px" 
                />
            </g>
        );
    }

    if (proj.maxTravelDistance && proj.distanceTraveled !== undefined && !proj.isAirstrike) { // Flamer
        const progress = proj.distanceTraveled / proj.maxTravelDistance;
        const currentSize = Math.max(1, (1 - progress) * FLAMER_PROJECTILE_SIZE.width * 0.5);
        const opacity = Math.max(0, 1 - progress * 1.2);
         return (
            <g opacity={opacity} transform={`rotate(${projectileRotationAngle} ${cx} ${cy})`}>
                <circle cx={cx - currentSize*0.3} cy={cy - currentSize*0.3} r={currentSize*0.3} fill={projColor} stroke="none"/>
                <circle cx={cx + currentSize*0.2} cy={cy - currentSize*0.1} r={currentSize*0.25} fill={projColor} stroke="none"/>
                <circle cx={cx} cy={cy + currentSize*0.3} r={currentSize*0.35} fill={projColor} stroke="none"/>
            </g>
        );
    }
    if (proj.causesShake && !proj.isAirstrike) { // RPG
        return <line x1={cx - RPG_PROJECTILE_SIZE.height/2.5} y1={cy} x2={cx + RPG_PROJECTILE_SIZE.height/2.5} y2={cy} stroke={projColor} strokeWidth={STROKE_WIDTH_THICK} transform={`rotate(${projectileRotationAngle} ${cx} ${cy})`} vectorEffect="non-scaling-stroke" fill="none"/>;
    }
    if (width !== height && !proj.isAirstrike) { 
        return <line x1={cx - width/2} y1={cy} x2={cx + width/2} y2={cy} stroke={projColor} strokeWidth={height} transform={`rotate(${projectileRotationAngle} ${cx} ${cy})`} vectorEffect="non-scaling-stroke" fill="none"/>;
    }
    // Default dot projectile (if not airstrike and not other special cases)
    if (!proj.isAirstrike) {
        return <circle cx={cx} cy={cy} r={Math.min(width,height)/2} fill={projColor} stroke="none" />;
    }
    return null; // Fallback if no GFX matches (shouldn't happen for projectiles)
  };

  let content = null;
  let collectiblePulseClass = "";

  if (entityType === 'player') {
    content = renderPlayerOrAllyGFX(true);
  } else if (entityType === 'ally') {
    content = renderPlayerOrAllyGFX(false, actualAllyType);
  } else if (entityType === 'enemy') {
    content = renderEnemyGFX();
  } else if (entityType === 'projectile') {
    content = renderProjectileGFX();
  } else if (entityType === 'coin') {
    content = <circle cx={width/2} cy={height/2} r={width*0.4} {...commonStrokeProps} />;
  } else if (entityType === 'collectibleAlly') {
    content = renderPlayerOrAllyGFX(false, collectibleAllyType); 
    collectiblePulseClass = "collectible-pulse";
  }

  return (
    <div style={svgStyle} className={collectiblePulseClass} aria-label={`${entityType} ${actualAllyType || playerChampionType || enemyType || collectibleAllyType || ''}`}>
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
        {content}
      </svg>
      {showHealthBar && (
        <div
          style={{
            position: 'absolute',
            left: '0px',
            top: `${healthBarYOffset}px`,
            width: `${width}px`,
            height: '4px',
            border: `1px solid ${UI_STROKE_SECONDARY}`,
            backgroundColor: UI_BACKGROUND_NEUTRAL,
            zIndex: 15,
          }}
          role="meter"
          aria-valuenow={health}
          aria-valuemin={0}
          aria-valuemax={maxHealth}
          aria-label={`${entityType} health`}
        >
          <div
            style={{
              width: `${Math.max(0, (health! / maxHealth!) * 100)}%`,
              height: '100%',
              backgroundColor: health! < maxHealth! * 0.3 ? UI_ACCENT_CRITICAL : UI_STROKE_PRIMARY,
              transition: 'width 0.15s ease-linear',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default GameObjectView;
