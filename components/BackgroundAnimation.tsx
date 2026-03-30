import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { UI_STROKE_SECONDARY, UI_STROKE_PRIMARY, UI_ACCENT_CRITICAL, ENEMY_DEFAULT_SIZE, PROJECTILE_SIZE } from '../constants';
import GameObjectView from './GameObjectView'; // Import GameObjectView
import { EnemyType, Position, Size } from '../types'; // Import necessary types

// Define a simplified structure for background entities, compatible with GameObjectView props
interface BackgroundGameEntity {
  id: string;
  type: 'enemy' | 'projectile';
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  color: string;
  opacity: number;
  enemyType?: EnemyType; // For enemies
  shootTimer?: number;   // For enemies
  life?: number;         // For projectiles
  isPlayerProjectile?: boolean; // Always false for these background projectiles
  ownerId?: string; // Generic owner for projectiles
  velocity?: Position; // For GameObjectView orientation
}


interface BackgroundAnimationProps {
  viewportWidth: number;
  viewportHeight: number;
}

const NUM_BACKGROUND_ENEMIES_MAX = 5; 
const BACKGROUND_ENEMY_SPEED_MIN = 0.15;
const BACKGROUND_ENEMY_SPEED_MAX = 0.45;
const BACKGROUND_PROJECTILE_SIZE_VAL = PROJECTILE_SIZE.width;
const BACKGROUND_PROJECTILE_SPEED = 0.8;
const BACKGROUND_PROJECTILE_LIFE = 250; 
const ENEMY_SHOOT_INTERVAL_MIN = 180; 
const ENEMY_SHOOT_INTERVAL_MAX = 400; 
const ENTITY_BASE_OPACITY = 0.5; // Increased from 0.2 to 0.5

const AVAILABLE_ENEMY_TYPES = [EnemyType.MELEE_GRUNT, EnemyType.RANGED_SHOOTER];

const BackgroundAnimation: React.FC<BackgroundAnimationProps> = ({ viewportWidth, viewportHeight }) => {
  const [entities, setEntities] = useState<BackgroundGameEntity[]>([]);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    const createBackgroundEnemy = (): BackgroundGameEntity => {
      const enemyType = AVAILABLE_ENEMY_TYPES[Math.floor(Math.random() * AVAILABLE_ENEMY_TYPES.length)];
      const size = ENEMY_DEFAULT_SIZE.width * (0.8 + Math.random() * 0.4); 

      let x, y, vx, vy;
      const side = Math.floor(Math.random() * 4);
      const speed = BACKGROUND_ENEMY_SPEED_MIN + Math.random() * (BACKGROUND_ENEMY_SPEED_MAX - BACKGROUND_ENEMY_SPEED_MIN);

      if (side === 0) { // Top
        x = Math.random() * viewportWidth; y = -size;
        vx = (Math.random() - 0.5) * speed; vy = speed;
      } else if (side === 1) { // Right
        x = viewportWidth + size; y = Math.random() * viewportHeight;
        vx = -speed; vy = (Math.random() - 0.5) * speed;
      } else if (side === 2) { // Bottom
        x = Math.random() * viewportWidth; y = viewportHeight + size;
        vx = (Math.random() - 0.5) * speed; vy = -speed;
      } else { // Left
        x = -size; y = Math.random() * viewportHeight;
        vx = speed; vy = (Math.random() - 0.5) * speed;
      }

      return {
        id: uuidv4(),
        type: 'enemy',
        x, y, width: size, height: size,
        vx, vy,
        color: UI_STROKE_PRIMARY, 
        opacity: ENTITY_BASE_OPACITY,
        enemyType,
        shootTimer: ENEMY_SHOOT_INTERVAL_MIN + Math.random() * (ENEMY_SHOOT_INTERVAL_MAX - ENEMY_SHOOT_INTERVAL_MIN),
        velocity: {x:vx, y:vy}
      };
    };

    const gameTick = () => {
      setEntities(prevEntities => {
        const newEntities: BackgroundGameEntity[] = [];
        let enemyCount = 0;

        for (const entity of prevEntities) {
          if (entity.type === 'enemy') enemyCount++;
          let newEntity = { ...entity };
          newEntity.x += newEntity.vx;
          newEntity.y += newEntity.vy;
          newEntity.velocity = {x: newEntity.vx, y: newEntity.vy};


          if (newEntity.type === 'enemy') {
            newEntity.shootTimer = (newEntity.shootTimer || 0) - 1;
            if (newEntity.shootTimer <= 0) {
              const angle = Math.atan2(newEntity.vy, newEntity.vx) + (Math.random() - 0.5) * 0.5; 
              newEntities.push({
                id: uuidv4(),
                type: 'projectile',
                x: newEntity.x + newEntity.width / 2 - BACKGROUND_PROJECTILE_SIZE_VAL / 2,
                y: newEntity.y + newEntity.height / 2 - BACKGROUND_PROJECTILE_SIZE_VAL / 2,
                width: BACKGROUND_PROJECTILE_SIZE_VAL,
                height: BACKGROUND_PROJECTILE_SIZE_VAL,
                vx: Math.cos(angle) * BACKGROUND_PROJECTILE_SPEED,
                vy: Math.sin(angle) * BACKGROUND_PROJECTILE_SPEED,
                color: UI_ACCENT_CRITICAL, 
                opacity: ENTITY_BASE_OPACITY * 1.2, // Projectiles slightly more opaque
                life: BACKGROUND_PROJECTILE_LIFE,
                isPlayerProjectile: false,
                ownerId: 'background_enemy',
                velocity: { x: Math.cos(angle) * BACKGROUND_PROJECTILE_SPEED, y: Math.sin(angle) * BACKGROUND_PROJECTILE_SPEED}
              });
              newEntity.shootTimer = ENEMY_SHOOT_INTERVAL_MIN + Math.random() * (ENEMY_SHOOT_INTERVAL_MAX - ENEMY_SHOOT_INTERVAL_MIN);
            }
            if (newEntity.x < -newEntity.width * 3 || newEntity.x > viewportWidth + newEntity.width * 2 ||
                newEntity.y < -newEntity.height * 3 || newEntity.y > viewportHeight + newEntity.height * 2) {
              continue;
            }
             if (Math.random() < 0.003) { 
                const angle = Math.random() * Math.PI * 2;
                const speed = BACKGROUND_ENEMY_SPEED_MIN + Math.random() * (BACKGROUND_ENEMY_SPEED_MAX - BACKGROUND_ENEMY_SPEED_MIN);
                newEntity.vx = Math.cos(angle) * speed;
                newEntity.vy = Math.sin(angle) * speed;
            }
          } else if (newEntity.type === 'projectile') {
            newEntity.life = (newEntity.life || 0) - 1;
            if (newEntity.life <= 0 || 
                newEntity.x < -newEntity.width || newEntity.x > viewportWidth ||
                newEntity.y < -newEntity.height || newEntity.y > viewportHeight) {
              continue; 
            }
          }
          newEntities.push(newEntity);
        }

        while (newEntities.filter(e => e.type === 'enemy').length < NUM_BACKGROUND_ENEMIES_MAX && viewportWidth > 0 && viewportHeight > 0) {
          newEntities.push(createBackgroundEnemy());
        }
        return newEntities;
      });
      animationFrameId.current = requestAnimationFrame(gameTick);
    };

    if (viewportWidth > 0 && viewportHeight > 0) {
        animationFrameId.current = requestAnimationFrame(gameTick);
    }
    
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [viewportWidth, viewportHeight]);

  if (!viewportWidth || !viewportHeight) return null;

  const staticCamera: Position = { x: 0, y: 0 };
  const fullViewport: Size = { width: viewportWidth, height: viewportHeight };

  return (
    <div
      style={{
        position: 'fixed', 
        inset: 0, 
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        zIndex: 0, 
        pointerEvents: 'none',
        backgroundColor: '#FFFFFF', 
      }}
      aria-hidden="true"
    >
      {entities.map(entity => (
        <GameObjectView
          key={entity.id}
          gameObject={entity as any} 
          entityType={entity.type as ('enemy' | 'projectile')}
          camera={staticCamera}
          viewport={fullViewport}
        />
      ))}
    </div>
  );
};

export default React.memo(BackgroundAnimation);