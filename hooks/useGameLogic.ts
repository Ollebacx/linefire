
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Player, Enemy, Projectile, Coin, GameState, Position, GameObject, Upgrade, EnemyType, Ally, Character, UpgradeType, AllyType, CollectibleAlly, Size, SceneryObject, ChampionChoice, CameraShakeState, SpecialEnemySpawnState, LogEntry, LogId, TutorialEntities, TutorialHighlightTarget
} from '../types';
import {
  WORLD_AREA, // Import WORLD_AREA directly
  INITIAL_PLAYER_STATE, INITIAL_UPGRADES, PLAYER_ALLY_PROJECTILE_SPEED, ENEMY_PROJECTILE_SPEED, PROJECTILE_SIZE, RPG_PROJECTILE_SIZE,
  COIN_SIZE, COIN_VALUE,
  ENEMY_MELEE_GRUNT_HEALTH, ENEMY_MELEE_GRUNT_DAMAGE, ENEMY_MELEE_GRUNT_SPEED,
  ENEMY_MELEE_GRUNT_POINTS, ROUND_BASE_ENEMY_COUNT, ROUND_ENEMY_INCREMENT,
  ENEMY_RANGED_SHOOTER_HEALTH, ENEMY_RANGED_SHOOTER_DAMAGE, ENEMY_RANGED_SHOOTER_RANGE, ENEMY_RANGED_SHOOTER_SPEED,
  ENEMY_RANGED_SHOOTER_COOLDOWN, ENEMY_RANGED_SHOOTER_POINTS,
  ENEMY_RANGED_SHOOTER_MIN_DISTANCE, ALLY_LERP_FACTOR,
  ALLY_SIZE, ALLY_SPEED, ALLY_INITIAL_HEALTH, ALLY_TRAIL_FOLLOW_DISTANCE, ALLY_PICKUP_HEALTH_RESTORE, PATH_HISTORY_LENGTH,
  ALLY_GUN_GUY_DAMAGE, ALLY_GUN_GUY_RANGE, ALLY_GUN_GUY_COOLDOWN,
  ALLY_SHOTGUN_DAMAGE, ALLY_SHOTGUN_COOLDOWN, ALLY_SHOTGUN_RANGE, ALLY_SHOTGUN_PROJECTILE_COUNT, ALLY_SHOTGUN_SPREAD_ANGLE,
  ALLY_SNIPER_DAMAGE, ALLY_SNIPER_COOLDOWN, ALLY_SNIPER_RANGE, ALLY_SNIPER_PROJECTILE_SPEED_MULTIPLIER,
  ALLY_MINIGUNNER_DAMAGE, ALLY_MINIGUNNER_COOLDOWN, ALLY_MINIGUNNER_RANGE,
  ALLY_RPG_SOLDIER_DAMAGE, ALLY_RPG_SOLDIER_COOLDOWN, ALLY_RPG_SOLDIER_RANGE, ALLY_RPG_SOLDIER_PROJECTILE_SPEED_MULTIPLIER, RPG_IMPACT_CAMERA_SHAKE_INTENSITY, RPG_IMPACT_CAMERA_SHAKE_DURATION, RPG_AOE_RADIUS,
  ALLY_FLAMER_DAMAGE, ALLY_FLAMER_COOLDOWN, ALLY_FLAMER_RANGE, ALLY_FLAMER_PROJECTILE_COUNT, ALLY_FLAMER_SPREAD_ANGLE,
  FLAMER_PROJECTILE_SIZE, FLAMER_PROJECTILE_SPEED, FLAMER_PROJECTILE_MAX_TRAVEL_DISTANCE,
  ALLY_RIFLEMAN_DAMAGE, ALLY_RIFLEMAN_COOLDOWN, ALLY_RIFLEMAN_RANGE, ALLY_RIFLEMAN_PROJECTILE_SPEED_MULTIPLIER,
  COLLECTIBLE_ALLY_SIZE, ALLY_SPAWN_INTERVAL, PLAYER_SIZE, PLAYER_INITIAL_COINS, PLAYER_INITIAL_HEALTH,
  CAMERA_LERP_FACTOR, SCENERY_OBJECT_COUNT, SCENERY_VISUAL_KEYS, PLAYER_INITIAL_DAMAGE, PLAYER_INITIAL_RANGE, PLAYER_INITIAL_SHOOT_COOLDOWN,
  ENEMY_DEFAULT_SIZE, ENEMY_ROCKET_TANK_SIZE, ENEMY_AGILE_STALKER_SIZE, ENEMY_ELECTRIC_DRONE_SIZE, ENEMY_SNIPER_SIZE, TUTORIAL_DUMMY_SIZE,
  ENEMY_ROCKET_TANK_HEALTH, ENEMY_ROCKET_TANK_DAMAGE, ENEMY_ROCKET_TANK_RANGE, ENEMY_ROCKET_TANK_SPEED, ENEMY_ROCKET_TANK_COOLDOWN, ENEMY_ROCKET_TANK_PROJECTILE_SPEED, ENEMY_ROCKET_TANK_POINTS, ENEMY_ROCKET_TANK_AOE_RADIUS,
  ENEMY_AGILE_STALKER_HEALTH, ENEMY_AGILE_STALKER_DAMAGE, ENEMY_AGILE_STALKER_SPEED, ENEMY_AGILE_STALKER_POINTS, ENEMY_AGILE_STALKER_ATTACK_RANGE, ENEMY_AGILE_STALKER_ATTACK_COOLDOWN,
  ENEMY_ELECTRIC_DRONE_HEALTH, ENEMY_ELECTRIC_DRONE_SPEED, ENEMY_ELECTRIC_DRONE_AOE_DAMAGE, ENEMY_ELECTRIC_DRONE_AOE_RADIUS, ENEMY_ELECTRIC_DRONE_AOE_COOLDOWN, ENEMY_ELECTRIC_DRONE_POINTS,
  ENEMY_SNIPER_HEALTH, ENEMY_SNIPER_DAMAGE, ENEMY_SNIPER_RANGE, ENEMY_SNIPER_SPEED, ENEMY_SNIPER_COOLDOWN, ENEMY_SNIPER_POINTS, ENEMY_SNIPER_MIN_DISTANCE_FACTOR, ENEMY_SNIPER_MAX_DISTANCE_FACTOR,
  INITIAL_SPECIAL_ENEMY_SPAWN_STATE, ENEMY_SPAWN_PROBABILITIES, MAX_CONCURRENT_ENEMY_TYPE, SPECIAL_ENEMY_TYPES, MAX_CONCURRENT_SPECIAL_ENEMIES_ROUND_6_10, MAX_CONCURRENT_SPECIAL_ENEMIES_ROUND_11_PLUS,
  UI_STROKE_PRIMARY, GUN_GUY_CLIP_SIZE, GUN_GUY_SHOT_INTERVAL, GUN_GUY_RELOAD_TIME, UI_ACCENT_CRITICAL, UI_ACCENT_WARNING,
  COMBO_WINDOW_DURATION_TICKS, AIRSTRIKE_COMBO_THRESHOLD, AIRSTRIKE_MISSILE_COUNT, AIRSTRIKE_MISSILE_INTERVAL_TICKS,
  AIRSTRIKE_MISSILE_DAMAGE, AIRSTRIKE_MISSILE_AOE_RADIUS, AIRSTRIKE_MISSILE_SPEED, AIRSTRIKE_PROJECTILE_SIZE,
  AIRSTRIKE_IMPACT_SHAKE_INTENSITY, AIRSTRIKE_IMPACT_SHAKE_DURATION, INITIAL_LOG_DEFINITIONS, PLAYER_HIT_FLASH_DURATION_TICKS,
  WAVE_TITLE_STAY_DURATION_TICKS, WAVE_TITLE_FADE_OUT_DURATION_TICKS, TUTORIAL_MESSAGES, INITIAL_TUTORIAL_ENTITIES,
  TUTORIAL_ALLY_SPAWN_ORDER,
  TUTORIAL_STEP_3_ENEMY_SPAWN_INTERVAL, TUTORIAL_STEP_3_MAX_CONCURRENT_ENEMIES,
  TUTORIAL_STEP_5_ENEMY_SPAWN_INTERVAL, TUTORIAL_STEP_5_MAX_CONCURRENT_ENEMIES
} from '../constants';
import { distanceBetweenGameObjects, checkCollision, normalizeVector, getCenter, distanceBetweenPoints } from '../utils/geometry';

const PLAYER_WORLD_EDGE_MARGIN = 10;
const INITIAL_SPAWN_INTERVAL_TICKS = 20; // Approx 0.33s at 60FPS
const INITIAL_ENEMIES_AT_ROUND_START = 3; // Increased from 1: Number of enemies to spawn immediately when round starts
export const GAME_OVER_PENDING_DURATION_TICKS = 180; // 3 seconds at 60 FPS


// This function is defined outside the hook to be a pure utility
const getInitialGameState = (currentInitialGameArea: Size, isTouchDeviceValue: boolean): GameState => {
    const initialPlayer = { ...INITIAL_PLAYER_STATE,
        allies: [], championType: undefined, pathHistory: [], color: UI_STROKE_PRIMARY,
        lastShootingDirection: { x: 1, y: 0 }, initialAllyBonus: 0, comboCount: 0,
        currentRunKills: 0, currentRunTanksDestroyed: 0, currentRunCoinsEarned: 0, kills: 0, 
        highestComboCount: 0, maxSquadSizeAchieved: 0, playerHitTimer: 0,
        // Initialize player airstrike fields
        airstrikeAvailable: false, airstrikeActive: false, airstrikesPending: 0, airstrikeSpawnTimer: 0,
    };
    const initialCameraX = Math.max(0, Math.min(
        initialPlayer.x + initialPlayer.width / 2 - currentInitialGameArea.width / 2,
        WORLD_AREA.width - currentInitialGameArea.width
    ));
    const initialCameraY = Math.max(0, Math.min(
        initialPlayer.y + initialPlayer.height / 2 - currentInitialGameArea.height / 2,
        WORLD_AREA.height - currentInitialGameArea.height
    ));
    
    const initialLogs: LogEntry[] = INITIAL_LOG_DEFINITIONS.map(def => ({
        id: def.id,
        name: def.name,
        description: def.description,
        icon: def.icon,
        isUnlocked: false,
    }));

    return {
        player: initialPlayer,
        enemies: [],
        projectiles: [],
        coins: [],
        collectibleAllies: [],
        scenery: [],
        round: 1,
        gameStatus: 'IDLE',
        currentWaveEnemies: 0,
        totalEnemiesThisRound: ROUND_BASE_ENEMY_COUNT,
        gameArea: currentInitialGameArea, // Use the passed gameArea
        worldArea: WORLD_AREA,
        camera: { x: initialCameraX, y: initialCameraY },
        availableUpgrades: INITIAL_UPGRADES.map(u => ({ ...u, cost: u.baseCost, currentLevel: 0 })),
        keysPressed: {},
        mousePosition: null,
        nextRoundTimer: 0,
        nextAllySpawnTimer: ALLY_SPAWN_INTERVAL,
        unlockedAllyTypes: [AllyType.SHOTGUN, AllyType.RIFLEMAN, AllyType.GUN_GUY], // Gun Guy added as default unlock
        cameraShake: null,
        isTouchDevice: isTouchDeviceValue, // Use the passed isTouchDevice
        specialEnemyState: { ...INITIAL_SPECIAL_ENEMY_SPAWN_STATE },
        comboTimer: 0,
        airstrikeAvailable: false, // GameState level airstrike
        airstrikeActive: false,   // GameState level airstrike
        airstrikesPending: 0,     // GameState level airstrike
        airstrikeSpawnTimer: 0,   // GameState level airstrike
        pendingInitialSpawns: 0,
        initialSpawnTickCounter: 0,
        logs: initialLogs,
        gameOverPendingTimer: 0,
        waveTitleText: '',
        waveTitleTimer: 0,
        tutorialStep: 0,
        tutorialMessages: TUTORIAL_MESSAGES,
        tutorialEntities: { ...INITIAL_TUTORIAL_ENTITIES, tutorialHighlightTarget: null },
    };
  };


const createNewEnemy = (round: number, currentWorldArea: Size, enemyType: EnemyType): Enemy => {
  let newEnemyBase: Omit<Enemy, 'id' | 'x' | 'y' | 'targetId' | 'color'>;

  switch (enemyType) {
    case EnemyType.MELEE_GRUNT:
      newEnemyBase = {
        enemyType: EnemyType.MELEE_GRUNT,
        width: ENEMY_DEFAULT_SIZE.width, height: ENEMY_DEFAULT_SIZE.height,
        health: ENEMY_MELEE_GRUNT_HEALTH + round * 2,
        maxHealth: ENEMY_MELEE_GRUNT_HEALTH + round * 2,
        speed: ENEMY_MELEE_GRUNT_SPEED + round * 0.1,
        attackDamage: ENEMY_MELEE_GRUNT_DAMAGE + round,
        attackRange: ENEMY_DEFAULT_SIZE.width * 0.7,
        attackCooldown: 30, attackTimer: 0, points: ENEMY_MELEE_GRUNT_POINTS,
      };
      break;
    case EnemyType.RANGED_SHOOTER:
      newEnemyBase = {
        enemyType: EnemyType.RANGED_SHOOTER,
        width: ENEMY_DEFAULT_SIZE.width, height: ENEMY_DEFAULT_SIZE.height,
        health: ENEMY_RANGED_SHOOTER_HEALTH + round * 1.5,
        maxHealth: ENEMY_RANGED_SHOOTER_HEALTH + round * 1.5,
        speed: ENEMY_RANGED_SHOOTER_SPEED + round * 0.05,
        attackDamage: ENEMY_RANGED_SHOOTER_DAMAGE + round * 0.5,
        attackRange: ENEMY_RANGED_SHOOTER_RANGE,
        attackCooldown: Math.max(30, ENEMY_RANGED_SHOOTER_COOLDOWN - round * 2),
        attackTimer: 0, points: ENEMY_RANGED_SHOOTER_POINTS,
      };
      break;
    case EnemyType.ROCKET_TANK:
      newEnemyBase = {
        enemyType: EnemyType.ROCKET_TANK,
        width: ENEMY_ROCKET_TANK_SIZE.width, height: ENEMY_ROCKET_TANK_SIZE.height,
        health: ENEMY_ROCKET_TANK_HEALTH + round * 15,
        maxHealth: ENEMY_ROCKET_TANK_HEALTH + round * 15,
        speed: ENEMY_ROCKET_TANK_SPEED + round * 0.03,
        attackDamage: ENEMY_ROCKET_TANK_DAMAGE + round * 2,
        attackRange: ENEMY_ROCKET_TANK_RANGE,
        attackCooldown: ENEMY_ROCKET_TANK_COOLDOWN,
        attackTimer: 0, points: ENEMY_ROCKET_TANK_POINTS,
      };
      break;
    case EnemyType.AGILE_STALKER:
      newEnemyBase = {
        enemyType: EnemyType.AGILE_STALKER,
        width: ENEMY_AGILE_STALKER_SIZE.width, height: ENEMY_AGILE_STALKER_SIZE.height,
        health: ENEMY_AGILE_STALKER_HEALTH + round * 1.5,
        maxHealth: ENEMY_AGILE_STALKER_HEALTH + round * 1.5,
        speed: ENEMY_AGILE_STALKER_SPEED + round * 0.2,
        attackDamage: ENEMY_AGILE_STALKER_DAMAGE + round,
        attackRange: ENEMY_AGILE_STALKER_ATTACK_RANGE,
        attackCooldown: ENEMY_AGILE_STALKER_ATTACK_COOLDOWN,
        attackTimer: 0, points: ENEMY_AGILE_STALKER_POINTS,
      };
      break;
    case EnemyType.ELECTRIC_DRONE:
      newEnemyBase = {
        enemyType: EnemyType.ELECTRIC_DRONE,
        width: ENEMY_ELECTRIC_DRONE_SIZE.width, height: ENEMY_ELECTRIC_DRONE_SIZE.height,
        health: ENEMY_ELECTRIC_DRONE_HEALTH + round * 1.2,
        maxHealth: ENEMY_ELECTRIC_DRONE_HEALTH + round * 1.2,
        speed: ENEMY_ELECTRIC_DRONE_SPEED,
        attackDamage: 0, attackRange: 0, attackCooldown: 0, attackTimer: 0,
        aoeDamage: ENEMY_ELECTRIC_DRONE_AOE_DAMAGE,
        aoeRadius: ENEMY_ELECTRIC_DRONE_AOE_RADIUS,
        aoeCooldown: ENEMY_ELECTRIC_DRONE_AOE_COOLDOWN,
        aoeTimer: 0,
        points: ENEMY_ELECTRIC_DRONE_POINTS,
      };
      break;
    case EnemyType.ENEMY_SNIPER:
      newEnemyBase = {
        enemyType: EnemyType.ENEMY_SNIPER,
        width: ENEMY_SNIPER_SIZE.width, height: ENEMY_SNIPER_SIZE.height,
        health: ENEMY_SNIPER_HEALTH + round * 1.5,
        maxHealth: ENEMY_SNIPER_HEALTH + round * 1.5,
        speed: ENEMY_SNIPER_SPEED + round * 0.02,
        attackDamage: ENEMY_SNIPER_DAMAGE + round * 1.5,
        attackRange: ENEMY_SNIPER_RANGE,
        attackCooldown: Math.max(60, ENEMY_SNIPER_COOLDOWN - round * 3),
        attackTimer: 0, points: ENEMY_SNIPER_POINTS,
      };
      break;
    case EnemyType.TUTORIAL_DUMMY: // Tutorial Dummy uses Melee Grunt stats but doesn't move or attack
      newEnemyBase = {
        enemyType: EnemyType.TUTORIAL_DUMMY,
        width: TUTORIAL_DUMMY_SIZE.width, height: TUTORIAL_DUMMY_SIZE.height,
        health: 20, maxHealth: 20, // Low health
        speed: 0, // Stationary
        attackDamage: 0, // No attack
        attackRange: 0, attackCooldown: 9999, attackTimer: 0, points: 1, // Minimal points
      };
      break;
    default:
      newEnemyBase = {
        enemyType: EnemyType.MELEE_GRUNT,
        width: ENEMY_DEFAULT_SIZE.width, height: ENEMY_DEFAULT_SIZE.height,
        health: ENEMY_MELEE_GRUNT_HEALTH + round * 2,
        maxHealth: ENEMY_MELEE_GRUNT_HEALTH + round * 2,
        speed: ENEMY_MELEE_GRUNT_SPEED + round * 0.1,
        attackDamage: ENEMY_MELEE_GRUNT_DAMAGE + round,
        attackRange: ENEMY_DEFAULT_SIZE.width * 0.7,
        attackCooldown: 30, attackTimer: 0, points: ENEMY_MELEE_GRUNT_POINTS,
      };
      break;
  }

  let x, y;
  if (enemyType === EnemyType.TUTORIAL_DUMMY) { // Specific placement for dummy
    x = currentWorldArea.width / 2 + 100 - newEnemyBase.width / 2;
    y = currentWorldArea.height / 2 - newEnemyBase.height / 2;
  } else {
    const side = Math.floor(Math.random() * 4);
    const spawnMargin = 50;
    if (side === 0) { // Top
        x = Math.random() * currentWorldArea.width;
        y = -newEnemyBase.height - spawnMargin;
    } else if (side === 1) { // Right
        x = currentWorldArea.width + spawnMargin;
        y = Math.random() * currentWorldArea.height;
    } else if (side === 2) { // Bottom
        x = Math.random() * currentWorldArea.width;
        y = currentWorldArea.height + spawnMargin;
    } else { // Left
        x = -newEnemyBase.width - spawnMargin;
        y = Math.random() * currentWorldArea.height;
    }
  }


  return { ...newEnemyBase, id: uuidv4(), x, y, targetId: null, color: UI_STROKE_PRIMARY };
};

const determineNextEnemyType = (round: number, currentEnemies: Enemy[], specialEnemyState: SpecialEnemySpawnState): EnemyType | null => {
    const getRoundBracket = (r: number): string => {
        if (r <= 5) return '1-5';
        if (r <= 10) return '6-10';
        if (r <= 15) return '11-15';
        if (r <= 20) return '16-20';
        return '21+';
    };

    const probabilities = ENEMY_SPAWN_PROBABILITIES[getRoundBracket(round)];
    const enemyTypesOrder = [
        EnemyType.MELEE_GRUNT, EnemyType.RANGED_SHOOTER, EnemyType.ROCKET_TANK,
        EnemyType.AGILE_STALKER, EnemyType.ELECTRIC_DRONE, EnemyType.ENEMY_SNIPER
    ];

    const randomNumber = Math.random();
    let cumulativeProbability = 0;

    for (let i = 0; i < enemyTypesOrder.length; i++) {
        cumulativeProbability += probabilities[i];
        if (randomNumber <= cumulativeProbability) {
            const potentialType = enemyTypesOrder[i];

            const maxConcurrentOfType = MAX_CONCURRENT_ENEMY_TYPE[potentialType];
            if (maxConcurrentOfType) {
                const currentCountOfType = currentEnemies.filter(e => e.enemyType === potentialType).length;
                if (currentCountOfType >= maxConcurrentOfType(round)) {
                    continue;
                }
            }

            if (round >= 6 && round <= 10 && SPECIAL_ENEMY_TYPES.includes(potentialType)) {
                const currentSpecialEnemiesCount = currentEnemies.filter(e => SPECIAL_ENEMY_TYPES.includes(e.enemyType)).length;
                if (currentSpecialEnemiesCount >= MAX_CONCURRENT_SPECIAL_ENEMIES_ROUND_6_10) {
                    continue;
                }
            }
            if (round >= 11 && SPECIAL_ENEMY_TYPES.includes(potentialType)) {
                const currentSpecialEnemiesCount = currentEnemies.filter(e => SPECIAL_ENEMY_TYPES.includes(e.enemyType)).length;
                 if (currentSpecialEnemiesCount >= MAX_CONCURRENT_SPECIAL_ENEMIES_ROUND_11_PLUS) {
                    continue;
                }
            }
            return potentialType;
        }
    }
    const gruntMax = MAX_CONCURRENT_ENEMY_TYPE[EnemyType.MELEE_GRUNT]?.(round) ?? Infinity;
    if (currentEnemies.filter(e => e.enemyType === EnemyType.MELEE_GRUNT).length < gruntMax) {
        return EnemyType.MELEE_GRUNT;
    }
    return null;
};


export const useGameLogic = (
    initialGameArea: Size,
    isInitiallyTouchDevice: boolean
  ) => {

  const [gameState, setGameState] = useState<GameState>(() => getInitialGameState(initialGameArea, isInitiallyTouchDevice));
  const gameLoopRef = useRef<number | null>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const lastTickTimeRef = useRef<number>(performance.now());
  const joystickDirectionRef = useRef<Position>({ x: 0, y: 0 });

  const updateGameAreaSize = useCallback((newSize: Size) => {
    setGameState(prev => {
        const flooredNewWidth = Math.floor(newSize.width);
        const flooredNewHeight = Math.floor(newSize.height);

        const newCameraX = Math.max(0, Math.min(
            prev.camera.x,
            WORLD_AREA.width - flooredNewWidth
        ));
        const newCameraY = Math.max(0, Math.min(
            prev.camera.y,
            WORLD_AREA.height - flooredNewHeight
        ));
        return {
            ...prev,
            gameArea: { width: flooredNewWidth, height: flooredNewHeight },
            camera: { x: newCameraX, y: newCameraY }
        };
    });
  }, []);


  const handleJoystickMove = useCallback((direction: Position) => {
    joystickDirectionRef.current = direction;
  }, []);

  const handleJoystickRelease = useCallback(() => {
    joystickDirectionRef.current = { x: 0, y: 0 };
  }, []);


  const isGameObjectOnScreen = useCallback((obj: GameObject, camera: Position, viewport: Size): boolean => {
    return (
        obj.x < camera.x + viewport.width &&
        obj.x + obj.width > camera.x &&
        obj.y < camera.y + viewport.height &&
        obj.y + obj.height > camera.y
    );
  }, []);

  const startNewRound = useCallback((playerStateForNewRound: Player, currentRoundNumber: number, currentGameState: GameState) => {
    setGameState(prev => {
      const currentTotalEnemiesThisRound = ROUND_BASE_ENEMY_COUNT + (currentRoundNumber - 1) * ROUND_ENEMY_INCREMENT;
      const initialEnemiesToSpawnImmediately = INITIAL_ENEMIES_AT_ROUND_START;
      const newInitialEnemies: Enemy[] = [];
      
      for (let i = 0; i < initialEnemiesToSpawnImmediately; i++) {
          const typeToSpawn = determineNextEnemyType(currentRoundNumber, newInitialEnemies, prev.specialEnemyState);
          if (typeToSpawn) {
            newInitialEnemies.push(createNewEnemy(currentRoundNumber, prev.worldArea, typeToSpawn));
          }
      }

      const enemiesToSpawnGraduallyAtStart = Math.max(0, Math.min(currentTotalEnemiesThisRound, ROUND_BASE_ENEMY_COUNT) - initialEnemiesToSpawnImmediately);

      return {
        ...prev,
        gameStatus: 'PLAYING',
        player: {...playerStateForNewRound, playerHitTimer: 0},
        round: currentRoundNumber,
        enemies: newInitialEnemies,
        projectiles: [],
        currentWaveEnemies: 0,
        totalEnemiesThisRound: currentTotalEnemiesThisRound,
        nextRoundTimer: 0,
        cameraShake: null,
        specialEnemyState: { ...INITIAL_SPECIAL_ENEMY_SPAWN_STATE },
        airstrikeActive: false, 
        airstrikesPending: 0,
        pendingInitialSpawns: enemiesToSpawnGraduallyAtStart,
        initialSpawnTickCounter: enemiesToSpawnGraduallyAtStart > 0 ? INITIAL_SPAWN_INTERVAL_TICKS : 0,
        waveTitleText: `Wave ${currentRoundNumber}`,
        waveTitleTimer: WAVE_TITLE_STAY_DURATION_TICKS + WAVE_TITLE_FADE_OUT_DURATION_TICKS,
      };
    });
  }, []);


  const activateAirstrike = useCallback(() => {
    setGameState(prev => {
        if (prev.gameStatus === 'PLAYING') {
            if (prev.airstrikeAvailable && !prev.airstrikeActive) {
                return {
                    ...prev,
                    player: { ...prev.player, comboCount: 0 },
                    airstrikeAvailable: false,
                    airstrikeActive: true,
                    airstrikesPending: AIRSTRIKE_MISSILE_COUNT,
                    airstrikeSpawnTimer: 0,
                };
            }
        } else if (prev.gameStatus === 'TUTORIAL_ACTIVE' && prev.tutorialStep === 8) { // Updated to step 8
            // For tutorial step 8, use player's airstrike fields
            if (prev.player.airstrikeAvailable && !prev.player.airstrikeActive) {
                return {
                    ...prev,
                    player: {
                        ...prev.player,
                        comboCount: 0, // Reset combo for tutorial airstrike too
                        airstrikeAvailable: false,
                        airstrikeActive: true,
                        airstrikesPending: AIRSTRIKE_MISSILE_COUNT,
                        airstrikeSpawnTimer: 0,
                    },
                };
            }
        }
        return prev;
    });
  }, []);

  const gameTickTutorial = useCallback(() => {
    setGameState(prev => {
        let { player, keysPressed, mousePosition, gameArea, camera: prevCamera, isTouchDevice, tutorialStep, tutorialEntities, projectiles: existingTutorialProjectiles, worldArea } = prev;
        let newPlayer = { ...player, allies: player.allies.map(a => ({...a, pathHistory: a.pathHistory ? [...a.pathHistory] : []})), pathHistory: [...player.pathHistory] };
        let newProjectilesCreatedThisTick: Projectile[] = [];
        let newCamera = { ...prevCamera };
        let newTutorialEntities = { 
            enemies: tutorialEntities.enemies.map(e => ({...e})),
            coins: tutorialEntities.coins.map(c => ({...c})),
            collectibleAllies: tutorialEntities.collectibleAllies.map(ca => ({...ca})),
            step2AllySpawnIndex: tutorialEntities.step2AllySpawnIndex,
            step3SpawnTimer: tutorialEntities.step3SpawnTimer,
            step5SpawnTimer: tutorialEntities.step5SpawnTimer, // Note: This is for step 8 (airstrike)
            tutorialHighlightTarget: tutorialEntities.tutorialHighlightTarget,
        };

        // Player Movement (always enabled in tutorial for now)
        let dx = 0; let dy = 0;
        if (isTouchDevice && (joystickDirectionRef.current.x !== 0 || joystickDirectionRef.current.y !== 0)) {
            dx = joystickDirectionRef.current.x * newPlayer.speed; dy = joystickDirectionRef.current.y * newPlayer.speed;
        } else if (!isTouchDevice && mousePosition) {
            const playerCenterWorld = getCenter(newPlayer);
            const worldInputX = mousePosition.x + newCamera.x; const worldInputY = mousePosition.y + newCamera.y;
            const vecX = worldInputX - playerCenterWorld.x; const vecY = worldInputY - playerCenterWorld.y;
            const distanceToInput = Math.sqrt(vecX * vecX + vecY * vecY);
            if (distanceToInput > 1.0) {
                const normalizedDx = vecX / distanceToInput; const normalizedDy = vecY / distanceToInput;
                dx = normalizedDx * newPlayer.speed; dy = normalizedDy * newPlayer.speed;
            }
        } else {
            let keyDx = 0; let keyDy = 0;
            if (keysPressed['w'] || keysPressed['arrowup']) keyDy -= newPlayer.speed;
            if (keysPressed['s'] || keysPressed['arrowdown']) keyDy += newPlayer.speed;
            if (keysPressed['a'] || keysPressed['arrowleft']) keyDx -= newPlayer.speed;
            if (keysPressed['d'] || keysPressed['arrowright']) keyDx += newPlayer.speed;
            if (keyDx !== 0 && keyDy !== 0) { const length = Math.sqrt(keyDx*keyDx + keyDy*keyDy); dx = (keyDx/length)*newPlayer.speed; dy = (keyDy/length)*newPlayer.speed; }
            else { dx = keyDx; dy = keyDy; }
        }
        if (dx !== 0 || dy !== 0) {
            newPlayer.x = Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(newPlayer.x + dx, worldArea.width - newPlayer.width - PLAYER_WORLD_EDGE_MARGIN));
            newPlayer.y = Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(newPlayer.y + dy, worldArea.height - newPlayer.height - PLAYER_WORLD_EDGE_MARGIN));
        }
        newPlayer.pathHistory = [getCenter(newPlayer), ...newPlayer.pathHistory].slice(0, PATH_HISTORY_LENGTH);

        // Camera follow player
        const idealCameraX = newPlayer.x + newPlayer.width / 2 - gameArea.width / 2;
        const idealCameraY = newPlayer.y + newPlayer.height / 2 - gameArea.height / 2;
        newCamera.x += (idealCameraX - newCamera.x) * CAMERA_LERP_FACTOR;
        newCamera.y += (idealCameraY - newCamera.y) * CAMERA_LERP_FACTOR;
        newCamera.x = Math.max(0, Math.min(newCamera.x, worldArea.width - gameArea.width));
        newCamera.y = Math.max(0, Math.min(newCamera.y, worldArea.height - gameArea.height));

        // Player Shooting Logic (active steps only)
        const isShootingAllowedStep = tutorialStep >= 1 && ![4, 5, 6, 7].includes(tutorialStep); // Disabled during HUD explanation steps
        if (isShootingAllowedStep) { 
            newPlayer.shootTimer = Math.max(0, newPlayer.shootTimer - 1);
            let playerShootingDirectionForGFX: Position | undefined = undefined;
            if (newTutorialEntities.enemies.length > 0) {
                let closestEnemyToPlayer: Enemy | null = null;
                let minDistToPlayer = Infinity;
                newTutorialEntities.enemies.forEach(enemy => {
                    const dist = distanceBetweenGameObjects(newPlayer, enemy);
                    if (dist < minDistToPlayer) {
                        minDistToPlayer = dist;
                        closestEnemyToPlayer = enemy;
                    }
                });
                
                if (closestEnemyToPlayer && minDistToPlayer <= newPlayer.range) {
                    playerShootingDirectionForGFX = normalizeVector({ x: getCenter(closestEnemyToPlayer).x - getCenter(newPlayer).x, y: getCenter(closestEnemyToPlayer).y - getCenter(newPlayer).y });
                }
            }
            newPlayer.velocity = playerShootingDirectionForGFX || newPlayer.lastShootingDirection || { x: 1, y: 0 };

            if (newPlayer.shootTimer === 0 && playerShootingDirectionForGFX) {
                 const playerCenterForShot = getCenter(newPlayer);
                 if (newPlayer.currentReloadTimer === 0 && newPlayer.ammoLeftInClip && newPlayer.ammoLeftInClip > 0) { // Assuming Gun Guy for tutorial
                    newProjectilesCreatedThisTick.push({
                        id: uuidv4(), x: playerCenterForShot.x - PROJECTILE_SIZE.width / 2, y: playerCenterForShot.y - PROJECTILE_SIZE.height / 2,
                        width: PROJECTILE_SIZE.width, height: PROJECTILE_SIZE.height,
                        velocity: { x: playerShootingDirectionForGFX.x * PLAYER_ALLY_PROJECTILE_SPEED, y: playerShootingDirectionForGFX.y * PLAYER_ALLY_PROJECTILE_SPEED },
                        damage: newPlayer.damage, ownerId: newPlayer.id, isPlayerProjectile: true, color: UI_STROKE_PRIMARY, causesShake: false,
                    });
                    newPlayer.ammoLeftInClip--;
                    newPlayer.shootTimer = newPlayer.shootCooldown; 
                    newPlayer.lastShootingDirection = { ...playerShootingDirectionForGFX };

                    if (newPlayer.ammoLeftInClip === 0 && newPlayer.reloadDuration) { 
                        newPlayer.currentReloadTimer = newPlayer.reloadDuration;
                    }
                 }
            }
             if (newPlayer.currentReloadTimer && newPlayer.currentReloadTimer > 0) {
                newPlayer.currentReloadTimer = Math.max(0, newPlayer.currentReloadTimer - 1);
                if (newPlayer.currentReloadTimer === 0 && newPlayer.clipSize) {
                    newPlayer.ammoLeftInClip = newPlayer.clipSize; 
                }
            }
        } else { // If shooting is not allowed (e.g., HUD steps or step 0)
            newPlayer.velocity = newPlayer.lastShootingDirection || { x: 1, y: 0 }; 
        }
        if (newPlayer.playerHitTimer > 0) newPlayer.playerHitTimer = Math.max(0, newPlayer.playerHitTimer -1);


        // Ally Logic
        const tempAllies: Ally[] = [];
        const leaderEntities: (Player | Ally)[] = [newPlayer, ...newPlayer.allies];
        newPlayer.allies.forEach((ally) => {
            let currentAlly = {...ally, pathHistory: ally.pathHistory ? [...ally.pathHistory] : []};
            const leader = leaderEntities.find(l => l.id === currentAlly.leaderId);
            if (leader) { /* ... ally movement logic ... */ } // Condensed for brevity, assumed correct from previous
             // Ally Movement (Simplified for brevity - assuming previous logic is mostly sound)
            if (leader) {
                const leaderPath = leader.pathHistory;
                const effectiveTrailFollowDistance = ALLY_TRAIL_FOLLOW_DISTANCE * newPlayer.squadSpacingMultiplier;
                let targetPointForAllyCenter = getCenter(leader);
                if (leaderPath && leaderPath.length > 1) {
                    let accumulatedPathDistance = 0; let pointFound = false;
                    for (let i = 0; i < leaderPath.length - 1; i++) {
                        const pCurrent = leaderPath[i]; const pNext = leaderPath[i + 1];
                        const segmentDistance = distanceBetweenPoints(pCurrent, pNext); if (segmentDistance === 0) continue;
                        if (accumulatedPathDistance + segmentDistance >= effectiveTrailFollowDistance) {
                            const neededDistInSegment = effectiveTrailFollowDistance - accumulatedPathDistance;
                            const ratio = neededDistInSegment / segmentDistance;
                            targetPointForAllyCenter = { x: pCurrent.x + (pNext.x - pCurrent.x) * ratio, y: pCurrent.y + (pNext.y - pCurrent.y) * ratio };
                            pointFound = true; break;
                        }
                        accumulatedPathDistance += segmentDistance;
                    }
                    if (!pointFound && leaderPath.length > 0) targetPointForAllyCenter = leaderPath[leaderPath.length - 1];
                }
                const allyCurrentCenterBeforeMove = getCenter(currentAlly);
                const distToDesiredPathPoint = distanceBetweenPoints(allyCurrentCenterBeforeMove, targetPointForAllyCenter);
                if (distToDesiredPathPoint > 0.5) {
                    const desiredAllyTopLeftX = targetPointForAllyCenter.x - currentAlly.width / 2;
                    const desiredAllyTopLeftY = targetPointForAllyCenter.y - currentAlly.height / 2;
                    const moveDx = (desiredAllyTopLeftX - currentAlly.x) * ALLY_LERP_FACTOR;
                    const moveDy = (desiredAllyTopLeftY - currentAlly.y) * ALLY_LERP_FACTOR;
                    currentAlly.x += moveDx; currentAlly.y += moveDy;
                }
                const leaderActualCenter = getCenter(leader);
                let tentativeAllyCenter = getCenter(currentAlly);
                const distToLeaderCenter = distanceBetweenPoints(tentativeAllyCenter, leaderActualCenter);
                const minSeparationDistance = (leader.width / 2) + (currentAlly.width / 2) + 5; 
                if (distToLeaderCenter < minSeparationDistance && distToLeaderCenter > 0.01) {
                    const vecFromLeaderToAllyX = tentativeAllyCenter.x - leaderActualCenter.x; const vecFromLeaderToAllyY = tentativeAllyCenter.y - leaderActualCenter.y;
                    const scaledVecX = (vecFromLeaderToAllyX / distToLeaderCenter) * minSeparationDistance; const scaledVecY = (vecFromLeaderToAllyY / distToLeaderCenter) * minSeparationDistance;
                    const finalAllyCenterX = leaderActualCenter.x + scaledVecX; const finalAllyCenterY = leaderActualCenter.y + scaledVecY;
                    currentAlly.x = finalAllyCenterX - currentAlly.width / 2; currentAlly.y = finalAllyCenterY - currentAlly.height / 2;
                }
            }
            currentAlly.x = Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(currentAlly.x, worldArea.width - currentAlly.width - PLAYER_WORLD_EDGE_MARGIN));
            currentAlly.y = Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(currentAlly.y, worldArea.height - currentAlly.height - PLAYER_WORLD_EDGE_MARGIN));
            
            let allyShootingDirectionForGFX: Position | undefined = undefined;
             if (newTutorialEntities.enemies.length > 0 && isShootingAllowedStep) { // Allies also respect shooting rules
                let closestEnemyToAlly: Enemy | null = null;
                let minDistToAllyTarget = Infinity;
                newTutorialEntities.enemies.forEach(enemy => {
                    const dist = distanceBetweenGameObjects(currentAlly, enemy);
                    if (dist < minDistToAllyTarget) { minDistToAllyTarget = dist; closestEnemyToAlly = enemy; }
                });
                if (closestEnemyToAlly && minDistToAllyTarget <= currentAlly.range) {
                    allyShootingDirectionForGFX = normalizeVector({ x: getCenter(closestEnemyToAlly).x - getCenter(currentAlly).x, y: getCenter(closestEnemyToAlly).y - getCenter(currentAlly).y });
                }
            }

            currentAlly.shootTimer = Math.max(0, currentAlly.shootTimer - 1);
            if (currentAlly.shootTimer === 0 && allyShootingDirectionForGFX) {
                const allyCenterForShot = getCenter(currentAlly);
                const isAllyGunGuy = currentAlly.allyType === AllyType.GUN_GUY;
                 if (isAllyGunGuy) { 
                    if (currentAlly.currentReloadTimer === 0 && currentAlly.ammoLeftInClip && currentAlly.ammoLeftInClip > 0) {
                         newProjectilesCreatedThisTick.push({ id: uuidv4(), x: allyCenterForShot.x - PROJECTILE_SIZE.width / 2, y: allyCenterForShot.y - PROJECTILE_SIZE.height / 2, width: PROJECTILE_SIZE.width, height: PROJECTILE_SIZE.height, velocity: { x: allyShootingDirectionForGFX.x * PLAYER_ALLY_PROJECTILE_SPEED, y: allyShootingDirectionForGFX.y * PLAYER_ALLY_PROJECTILE_SPEED }, damage: currentAlly.damage, ownerId: currentAlly.id, isPlayerProjectile: true, color: UI_STROKE_PRIMARY, causesShake: false });
                        currentAlly.ammoLeftInClip--; currentAlly.shootTimer = currentAlly.shootCooldown; currentAlly.lastShootingDirection = { ...allyShootingDirectionForGFX };
                        if (currentAlly.ammoLeftInClip === 0 && currentAlly.reloadDuration) currentAlly.currentReloadTimer = currentAlly.reloadDuration;
                    }
                } else { 
                    newProjectilesCreatedThisTick.push({ id: uuidv4(), x: allyCenterForShot.x - PROJECTILE_SIZE.width / 2, y: allyCenterForShot.y - PROJECTILE_SIZE.height / 2, width: PROJECTILE_SIZE.width, height: PROJECTILE_SIZE.height, velocity: { x: allyShootingDirectionForGFX.x * (currentAlly.projectileSpeed || PLAYER_ALLY_PROJECTILE_SPEED), y: allyShootingDirectionForGFX.y * (currentAlly.projectileSpeed || PLAYER_ALLY_PROJECTILE_SPEED) }, damage: currentAlly.damage, ownerId: currentAlly.id, isPlayerProjectile: true, color: UI_STROKE_PRIMARY, causesShake: false, });
                    currentAlly.shootTimer = currentAlly.shootCooldown; currentAlly.lastShootingDirection = { ...allyShootingDirectionForGFX };
                }
            }
             if (currentAlly.currentReloadTimer && currentAlly.currentReloadTimer > 0) {
                currentAlly.currentReloadTimer = Math.max(0, currentAlly.currentReloadTimer - 1);
                if (currentAlly.currentReloadTimer === 0 && currentAlly.clipSize) currentAlly.ammoLeftInClip = currentAlly.clipSize;
            }
            currentAlly.velocity = allyShootingDirectionForGFX || currentAlly.lastShootingDirection || { x: 1, y: 0 };
            currentAlly.pathHistory = [getCenter(currentAlly), ...currentAlly.pathHistory].slice(0, PATH_HISTORY_LENGTH);
            tempAllies.push(currentAlly);
        });
        newPlayer.allies = tempAllies;
        if (newPlayer.allies.length > 0) {
            newPlayer.allies[0].leaderId = newPlayer.id;
            for (let i = 1; i < newPlayer.allies.length; i++) newPlayer.allies[i].leaderId = newPlayer.allies[i-1].id;
        }

        // TUTORIAL STEP 3: SPAWN COIN ENEMIES
        if (tutorialStep === 3) {
            if (newTutorialEntities.step3SpawnTimer === undefined) newTutorialEntities.step3SpawnTimer = 0;
            newTutorialEntities.step3SpawnTimer = Math.max(0, newTutorialEntities.step3SpawnTimer - 1);
            if (newTutorialEntities.step3SpawnTimer === 0 && newTutorialEntities.enemies.length < TUTORIAL_STEP_3_MAX_CONCURRENT_ENEMIES) {
                const gruntForCoins = createNewEnemy(0, worldArea, EnemyType.MELEE_GRUNT);
                gruntForCoins.health = 15; gruntForCoins.maxHealth = 15; gruntForCoins.points = COIN_VALUE;
                gruntForCoins.speed = ENEMY_MELEE_GRUNT_SPEED * 0.7; gruntForCoins.attackDamage = 5; gruntForCoins.attackCooldown = 60;
                const angle = Math.random() * Math.PI * 2; const spawnDist = Math.min(gameArea.width, gameArea.height) * 0.55;
                gruntForCoins.x = player.x + player.width/2 + Math.cos(angle) * spawnDist - gruntForCoins.width/2;
                gruntForCoins.y = player.y + player.height/2 + Math.sin(angle) * spawnDist - gruntForCoins.height/2;
                gruntForCoins.x = Math.max(0, Math.min(gruntForCoins.x, worldArea.width - gruntForCoins.width));
                gruntForCoins.y = Math.max(0, Math.min(gruntForCoins.y, worldArea.height - gruntForCoins.height));
                newTutorialEntities.enemies.push(gruntForCoins);
                newTutorialEntities.step3SpawnTimer = TUTORIAL_STEP_3_ENEMY_SPAWN_INTERVAL;
            }
        } else if (newTutorialEntities.step3SpawnTimer !== undefined && newTutorialEntities.step3SpawnTimer > 0) {
            newTutorialEntities.step3SpawnTimer = 0;
        }

        // TUTORIAL STEP 8 (Airstrike): SPAWN TARGETS & HANDLE AIRSTRIKE
        if (tutorialStep === 8) {
            if (newTutorialEntities.step5SpawnTimer === undefined) newTutorialEntities.step5SpawnTimer = 0; // Uses step5 constants
            newTutorialEntities.step5SpawnTimer = Math.max(0, newTutorialEntities.step5SpawnTimer - 1);
            if (newTutorialEntities.step5SpawnTimer === 0 && newTutorialEntities.enemies.length < TUTORIAL_STEP_5_MAX_CONCURRENT_ENEMIES) {
                const airstrikeTarget = createNewEnemy(0, worldArea, EnemyType.MELEE_GRUNT);
                airstrikeTarget.health = 15; airstrikeTarget.maxHealth = 15; airstrikeTarget.points = 0;
                airstrikeTarget.speed = ENEMY_MELEE_GRUNT_SPEED * 0.8; airstrikeTarget.attackDamage = 5; airstrikeTarget.attackCooldown = 45;
                const angle = Math.random() * Math.PI * 2; const spawnDist = Math.min(gameArea.width, gameArea.height) * 0.6;
                airstrikeTarget.x = player.x + player.width/2 + Math.cos(angle) * spawnDist - airstrikeTarget.width/2;
                airstrikeTarget.y = player.y + player.height/2 + Math.sin(angle) * spawnDist - airstrikeTarget.height/2;
                airstrikeTarget.x = Math.max(0, Math.min(airstrikeTarget.x, worldArea.width - airstrikeTarget.width));
                airstrikeTarget.y = Math.max(0, Math.min(airstrikeTarget.y, worldArea.height - airstrikeTarget.height));
                newTutorialEntities.enemies.push(airstrikeTarget);
                newTutorialEntities.step5SpawnTimer = TUTORIAL_STEP_5_ENEMY_SPAWN_INTERVAL;
            }

            if (newPlayer.airstrikeActive) {
                newPlayer.airstrikeSpawnTimer = Math.max(0, (newPlayer.airstrikeSpawnTimer || 0) - 1);
                if (newPlayer.airstrikeSpawnTimer === 0 && newPlayer.airstrikesPending && newPlayer.airstrikesPending > 0) {
                    const spawnX = newCamera.x + Math.random() * gameArea.width;
                    const targetY = newCamera.y + gameArea.height * (0.8 + Math.random() * 0.3);
                    const spawnY = newCamera.y - AIRSTRIKE_PROJECTILE_SIZE.height;
                    const travelDistanceToTarget = targetY - spawnY;
                    newProjectilesCreatedThisTick.push({
                        id: uuidv4(), x: spawnX - AIRSTRIKE_PROJECTILE_SIZE.width / 2, y: spawnY,
                        width: AIRSTRIKE_PROJECTILE_SIZE.width, height: AIRSTRIKE_PROJECTILE_SIZE.height,
                        velocity: { x: 0, y: AIRSTRIKE_MISSILE_SPEED }, damage: AIRSTRIKE_MISSILE_DAMAGE,
                        ownerId: 'tutorial_airstrike', isPlayerProjectile: true, color: UI_ACCENT_WARNING,
                        causesShake: true, aoeRadius: AIRSTRIKE_MISSILE_AOE_RADIUS, isAirstrike: true,
                        maxTravelDistance: travelDistanceToTarget > 0 ? travelDistanceToTarget : AIRSTRIKE_PROJECTILE_SIZE.height,
                        distanceTraveled: 0, targetY: targetY,
                    });
                    newPlayer.airstrikesPending--;
                    newPlayer.airstrikeSpawnTimer = AIRSTRIKE_MISSILE_INTERVAL_TICKS;
                } else if (newPlayer.airstrikesPending === 0) {
                    newPlayer.airstrikeActive = false;
                    newPlayer.airstrikeAvailable = true;
                }
            }
        } else if (newTutorialEntities.step5SpawnTimer !== undefined && newTutorialEntities.step5SpawnTimer > 0) {
            newTutorialEntities.step5SpawnTimer = 0;
        }


        // TUTORIAL ENEMY UPDATE LOOP (Movement & Attack)
        let tutorialEnemiesAfterAI: Enemy[] = [];
        newTutorialEntities.enemies.forEach(enemyConfig => {
            let currentEnemy = {...enemyConfig};
            currentEnemy.attackTimer = Math.max(0, currentEnemy.attackTimer - 1);
            const targetCharacter: Character = newPlayer; 
            const targetCenter = getCenter(targetCharacter); const enemyCenter = getCenter(currentEnemy);
            const directionToTarget = normalizeVector({ x: targetCenter.x - enemyCenter.x, y: targetCenter.y - enemyCenter.y });
            const distToTarget = distanceBetweenGameObjects(currentEnemy, targetCharacter);
            currentEnemy.velocity = { x: directionToTarget.x * currentEnemy.speed, y: directionToTarget.y * currentEnemy.speed };
            if (currentEnemy.enemyType !== EnemyType.TUTORIAL_DUMMY || currentEnemy.speed > 0) {
                currentEnemy.x += directionToTarget.x * currentEnemy.speed; currentEnemy.y += directionToTarget.y * currentEnemy.speed;
                currentEnemy.x = Math.max(0, Math.min(currentEnemy.x, worldArea.width - currentEnemy.width));
                currentEnemy.y = Math.max(0, Math.min(currentEnemy.y, worldArea.height - currentEnemy.height));
            }
            if (currentEnemy.attackDamage > 0 && currentEnemy.attackTimer === 0 && distToTarget <= currentEnemy.attackRange) {
                if (targetCharacter.id === newPlayer.id && newPlayer.health > 0) { 
                    newPlayer.health -= currentEnemy.attackDamage;
                    if (newPlayer.health > 0) newPlayer.playerHitTimer = PLAYER_HIT_FLASH_DURATION_TICKS;
                }
                currentEnemy.attackTimer = currentEnemy.attackCooldown;
            }
            tutorialEnemiesAfterAI.push(currentEnemy);
        });
        newTutorialEntities.enemies = tutorialEnemiesAfterAI;
        
        // --- TUTORIAL PROJECTILE, ENEMY DAMAGE, AND COLLECTIBLE/COIN LOGIC ---
        let currentListOfProjectiles = [...existingTutorialProjectiles, ...newProjectilesCreatedThisTick];
        const remainingProjectiles: Projectile[] = [];
        let tempCameraShake: CameraShakeState | null = null;
        let tutorialEnemiesAfterDamageAndCoinSpawn = [...newTutorialEntities.enemies];

        currentListOfProjectiles.forEach(proj => {
            let currentProj = {...proj};
            currentProj.x += currentProj.velocity.x;
            currentProj.y += currentProj.velocity.y;
            let projectileRemovedThisTick = false;
            let directHitOccurredOnEnemy = false;

            if (currentProj.maxTravelDistance !== undefined && currentProj.distanceTraveled !== undefined) {
                const distanceMovedThisTick = Math.sqrt(currentProj.velocity.x ** 2 + currentProj.velocity.y ** 2);
                currentProj.distanceTraveled += distanceMovedThisTick;
                if (currentProj.distanceTraveled >= currentProj.maxTravelDistance) {
                    projectileRemovedThisTick = true;
                }
            }

            if (!projectileRemovedThisTick && (currentProj.x + currentProj.width < -50 || currentProj.x > WORLD_AREA.width + 50 || currentProj.y + currentProj.height < -50 || currentProj.y > WORLD_AREA.height + 50)) {
                projectileRemovedThisTick = true;
            }

            if (currentProj.isPlayerProjectile && !projectileRemovedThisTick) {
                for (let i = 0; i < tutorialEnemiesAfterDamageAndCoinSpawn.length; i++) {
                    let enemy = tutorialEnemiesAfterDamageAndCoinSpawn[i];
                    if (checkCollision(currentProj, enemy)) {
                        enemy.health -= currentProj.damage;
                        directHitOccurredOnEnemy = true;
                        if (!currentProj.aoeRadius) projectileRemovedThisTick = true;
                        if (currentProj.causesShake) {
                             tempCameraShake = { intensity: currentProj.isAirstrike ? AIRSTRIKE_IMPACT_SHAKE_INTENSITY : RPG_IMPACT_CAMERA_SHAKE_INTENSITY, duration: currentProj.isAirstrike ? AIRSTRIKE_IMPACT_SHAKE_DURATION: RPG_IMPACT_CAMERA_SHAKE_DURATION, timer: currentProj.isAirstrike ? AIRSTRIKE_IMPACT_SHAKE_DURATION : RPG_IMPACT_CAMERA_SHAKE_DURATION };
                        }
                        break; 
                    }
                }
            }
            
            if (currentProj.aoeRadius && (projectileRemovedThisTick || (directHitOccurredOnEnemy && currentProj.isPlayerProjectile))) {
                const impactCenter = currentProj.isAirstrike && currentProj.targetY ? { x: currentProj.x + currentProj.width/2, y: currentProj.targetY } : getCenter(currentProj);
                tutorialEnemiesAfterDamageAndCoinSpawn.forEach(enemy => {
                    if (checkCollision(enemy, { ...impactCenter, width: currentProj.aoeRadius!*2, height: currentProj.aoeRadius!*2, x: impactCenter.x - currentProj.aoeRadius!, y: impactCenter.y - currentProj.aoeRadius!, id:'aoe_explosion'})) {
                         enemy.health -= currentProj.damage;
                    }
                });
                if (currentProj.causesShake) {
                    tempCameraShake = { intensity: currentProj.isAirstrike ? AIRSTRIKE_IMPACT_SHAKE_INTENSITY : RPG_IMPACT_CAMERA_SHAKE_INTENSITY, duration: currentProj.isAirstrike ? AIRSTRIKE_IMPACT_SHAKE_DURATION: RPG_IMPACT_CAMERA_SHAKE_DURATION, timer: currentProj.isAirstrike ? AIRSTRIKE_IMPACT_SHAKE_DURATION : RPG_IMPACT_CAMERA_SHAKE_DURATION };
                }
                projectileRemovedThisTick = true; // Ensure AoE projectiles are removed
            }

            if (!projectileRemovedThisTick) {
                remainingProjectiles.push(currentProj);
            }
        });
        
        newTutorialEntities.enemies = tutorialEnemiesAfterDamageAndCoinSpawn.filter(enemy => {
            if (enemy.health <= 0) {
                if (tutorialStep === 3 && enemy.points === COIN_VALUE) {
                    newTutorialEntities.coins.push({ id: uuidv4(), x: getCenter(enemy).x - COIN_SIZE.width / 2, y: getCenter(enemy).y - COIN_SIZE.height / 2, width: COIN_SIZE.width, height: COIN_SIZE.height, value: COIN_VALUE, color: UI_STROKE_PRIMARY });
                }
                return false; 
            }
            return true; 
        });
        
        let collectedAllyThisTick: CollectibleAlly | null = null;
        if (tutorialStep === 2) {
            const remainingTutorialCollectibleAllies: CollectibleAlly[] = [];
            for (const ca of newTutorialEntities.collectibleAllies) {
                if (checkCollision(newPlayer, ca)) {
                    addAllyToPlayer(newPlayer, ca.allyType, 0);
                    collectedAllyThisTick = ca; 
                } else {
                    remainingTutorialCollectibleAllies.push(ca);
                }
            }
            newTutorialEntities.collectibleAllies = remainingTutorialCollectibleAllies;

            if (collectedAllyThisTick) {
                newTutorialEntities.step2AllySpawnIndex = (newTutorialEntities.step2AllySpawnIndex || 0) + 1;
                if (newTutorialEntities.step2AllySpawnIndex < TUTORIAL_ALLY_SPAWN_ORDER.length) {
                    const nextAllyTypeToSpawn = TUTORIAL_ALLY_SPAWN_ORDER[newTutorialEntities.step2AllySpawnIndex];
                    const nextCollectible = createCollectibleAlly(nextAllyTypeToSpawn, newPlayer, newTutorialEntities.collectibleAllies, worldArea, true);
                    if (nextCollectible) newTutorialEntities.collectibleAllies.push(nextCollectible);
                }
            }
        }

        newTutorialEntities.coins = newTutorialEntities.coins.filter(coin => {
            if (tutorialStep === 3 && checkCollision(newPlayer, coin)) { newPlayer.coins += coin.value; return false; }
            return true;
        });

        let finalCameraPosForTutorial = { ...newCamera };
        if (tempCameraShake) {
            const shakeOffsetX = (Math.random() - 0.5) * 2 * tempCameraShake.intensity;
            const shakeOffsetY = (Math.random() - 0.5) * 2 * tempCameraShake.intensity;
            finalCameraPosForTutorial.x += shakeOffsetX; finalCameraPosForTutorial.y += shakeOffsetY;
            finalCameraPosForTutorial.x = Math.max(0, Math.min(finalCameraPosForTutorial.x, WORLD_AREA.width - gameArea.width)); 
            finalCameraPosForTutorial.y = Math.max(0, Math.min(finalCameraPosForTutorial.y, WORLD_AREA.height - gameArea.height)); 
        }

        return {
            ...prev, player: newPlayer, projectiles: remainingProjectiles, camera: finalCameraPosForTutorial, cameraShake: tempCameraShake,
            tutorialEntities: newTutorialEntities, enemies: [], coins: [], collectibleAllies: [],
        };
    });
  }, []);


  const gameTick = useCallback(() => {
    setGameState(prev => {
      if (prev.gameStatus === 'PAUSED') {
        return prev;
      }
      if (prev.gameStatus === 'TUTORIAL_ACTIVE') {
         return prev; 
      }


      const now = performance.now();
      const deltaTimeSeconds = (now - lastTickTimeRef.current) / 1000;
      lastTickTimeRef.current = now;

      let { // Destructure all mutable parts of gameState
        player, enemies, projectiles: existingProjectiles, coins, collectibleAllies, round,
        currentWaveEnemies: prevKilledEnemies,
        totalEnemiesThisRound: prevTotalEnemies,
        keysPressed, gameArea, mousePosition,
        gameStatus, nextRoundTimer: prevNextRoundTimer, nextAllySpawnTimer: prevNextAllySpawnTimer,
        unlockedAllyTypes, camera: prevCamera, cameraShake: prevCameraShake, isTouchDevice, 
        specialEnemyState: prevSpecialEnemyState,
        comboTimer: prevComboTimer, airstrikeAvailable: prevAirstrikeAvailable, 
        airstrikeActive: prevAirstrikeActive, airstrikesPending: prevAirstrikesPending, 
        airstrikeSpawnTimer: prevAirstrikeSpawnTimer,
        pendingInitialSpawns: prevPendingInitialSpawns, initialSpawnTickCounter: prevInitialSpawnTickCounter,
        logs: prevLogs,
        gameOverPendingTimer: prevGameOverPendingTimer,
        waveTitleText: prevWaveTitleText, waveTitleTimer: prevWaveTitleTimer,
        tutorialEntities: prevTutorialEntities, // Ensure this is here, though not used in normal game tick
      } = prev;

      let newPlayer = { ...player, allies: player.allies.map(a => ({...a, pathHistory: a.pathHistory ? [...a.pathHistory] : []})), pathHistory: [...player.pathHistory] };
      let currentEnemies = enemies.map(e => ({...e}));
      let currentCoins = [...coins];
      let currentCollectibleAllies = [...collectibleAllies];
      let newProjectilesCreatedThisTick: Projectile[] = [];
      let updatedKilledEnemiesThisRound = prevKilledEnemies;
      let newNextAllySpawnTimer = prevNextAllySpawnTimer;
      let newGameStatus = gameStatus;
      let newNextRoundTimer = prevNextRoundTimer;
      let newBaseCamera = { ...prevCamera };
      let activeCameraShake = prevCameraShake;
      let newSpecialEnemyState = { ...prevSpecialEnemyState };
      let newComboTimer = prevComboTimer;
      let newAirstrikeAvailable = prevAirstrikeAvailable;
      let newAirstrikeActive = prevAirstrikeActive;
      let newAirstrikesPending = prevAirstrikesPending;
      let newAirstrikeSpawnTimer = prevAirstrikeSpawnTimer;
      let newPendingInitialSpawns = prevPendingInitialSpawns;
      let newInitialSpawnTickCounter = prevInitialSpawnTickCounter;
      let newLogs = prevLogs.map(l => ({...l})); 
      let newGameOverPendingTimer = prevGameOverPendingTimer || 0;
      let newWaveTitleTimer = prevWaveTitleTimer;


      if (newWaveTitleTimer > 0) {
        newWaveTitleTimer = Math.max(0, newWaveTitleTimer - 1);
      }

      if (activeCameraShake) {
        const updatedTimer = activeCameraShake.timer - 1;
        if (updatedTimer <= 0) {
          activeCameraShake = null;
        } else {
          activeCameraShake = { ...activeCameraShake, timer: updatedTimer };
        }
      }
      
      if (newPlayer.playerHitTimer > 0) {
        newPlayer.playerHitTimer = Math.max(0, newPlayer.playerHitTimer - 1);
      }

      let processedProjectilesForThisTick: Projectile[] = [];
      const COIN_ATTRACTION_STRENGTH_FACTOR = 0.05;
      const COIN_MAX_ATTRACTION_SPEED = 8;
      const COIN_MIN_ATTRACTION_DIST_FOR_MOVEMENT = 2;

      let isCountingDownForNextWave = prevNextRoundTimer > 0 &&
                                   prevKilledEnemies >= prevTotalEnemies &&
                                   prev.enemies.length === 0;


      if (gameStatus === 'PLAYING' || gameStatus === 'GAME_OVER_PENDING') {
        let isPlayerInteractive = gameStatus === 'PLAYING' && newPlayer.health > 0;

        if (gameStatus === 'PLAYING' && newPlayer.health <= 0) {
          newGameStatus = 'GAME_OVER_PENDING';
          newGameOverPendingTimer = GAME_OVER_PENDING_DURATION_TICKS;
          isPlayerInteractive = false;
        } else if (gameStatus === 'GAME_OVER_PENDING') {
          newGameOverPendingTimer = Math.max(0, newGameOverPendingTimer - 1);
          if (newGameOverPendingTimer === 0) {
            newGameStatus = 'GAME_OVER';
          }
          isPlayerInteractive = false;
        }
        
        // Combo Timer Update (only if player is alive and playing)
        if (isPlayerInteractive && newComboTimer > 0) {
          newComboTimer = Math.max(0, newComboTimer - 1);
          if (newComboTimer === 0) {
            newPlayer.comboCount = 0;
            if (!newAirstrikeActive) newAirstrikeAvailable = false;
          }
        } else if (isPlayerInteractive && newComboTimer === 0) {
            newPlayer.comboCount = 0;
        }
        
        // Airstrike Logic (only if player is alive and playing)
        if (isPlayerInteractive && newAirstrikeActive) {
          if (newAirstrikeSpawnTimer > 0) {
            newAirstrikeSpawnTimer = Math.max(0, newAirstrikeSpawnTimer - 1);
          }
          if (newAirstrikeSpawnTimer === 0 && newAirstrikesPending > 0) {
            const spawnX = newBaseCamera.x + Math.random() * gameArea.width;
            const targetY = newBaseCamera.y + gameArea.height * (0.8 + Math.random() * 0.3); 
            const spawnY = newBaseCamera.y - AIRSTRIKE_PROJECTILE_SIZE.height; 
            const travelDistanceToTarget = targetY - spawnY;

            newProjectilesCreatedThisTick.push({
              id: uuidv4(),
              x: spawnX - AIRSTRIKE_PROJECTILE_SIZE.width / 2, y: spawnY,
              width: AIRSTRIKE_PROJECTILE_SIZE.width, height: AIRSTRIKE_PROJECTILE_SIZE.height,
              velocity: { x: 0, y: AIRSTRIKE_MISSILE_SPEED }, damage: AIRSTRIKE_MISSILE_DAMAGE,
              ownerId: 'airstrike_system', isPlayerProjectile: true, color: UI_ACCENT_WARNING,
              causesShake: true, aoeRadius: AIRSTRIKE_MISSILE_AOE_RADIUS, isAirstrike: true,
              maxTravelDistance: travelDistanceToTarget > 0 ? travelDistanceToTarget : AIRSTRIKE_PROJECTILE_SIZE.height,
              distanceTraveled: 0, targetY: targetY,
            });
            newAirstrikesPending--;
            newAirstrikeSpawnTimer = AIRSTRIKE_MISSILE_INTERVAL_TICKS;
          } else if (newAirstrikesPending === 0) {
            newAirstrikeActive = false;
          }
        }


        let dx = 0;
        let dy = 0;
        if (isPlayerInteractive) {
            if (isTouchDevice && (joystickDirectionRef.current.x !== 0 || joystickDirectionRef.current.y !== 0)) {
                dx = joystickDirectionRef.current.x * newPlayer.speed;
                dy = joystickDirectionRef.current.y * newPlayer.speed;
            } else if (!isTouchDevice && mousePosition) {
                const playerCenterWorld = getCenter(newPlayer);
                const worldInputX = mousePosition.x + newBaseCamera.x;
                const worldInputY = mousePosition.y + newBaseCamera.y;
                const vecX = worldInputX - playerCenterWorld.x;
                const vecY = worldInputY - playerCenterWorld.y;
                const distanceToInput = Math.sqrt(vecX * vecX + vecY * vecY);
                const DEAD_ZONE_RADIUS = 1.0;
                if (distanceToInput > DEAD_ZONE_RADIUS) {
                    const normalizedDx = vecX / distanceToInput;
                    const normalizedDy = vecY / distanceToInput;
                    dx = normalizedDx * newPlayer.speed;
                    dy = normalizedDy * newPlayer.speed;
                }
            } else {
                let keyDx = 0;
                let keyDy = 0;
                if (keysPressed['w'] || keysPressed['arrowup']) keyDy -= newPlayer.speed;
                if (keysPressed['s'] || keysPressed['arrowdown']) keyDy += newPlayer.speed;
                if (keysPressed['a'] || keysPressed['arrowleft']) keyDx -= newPlayer.speed;
                if (keysPressed['d'] || keysPressed['arrowright']) keyDx += newPlayer.speed;
                if (keyDx !== 0 && keyDy !== 0) {
                    const length = Math.sqrt(keyDx * keyDx + keyDy * keyDy);
                    dx = (keyDx / length) * newPlayer.speed;
                    dy = (keyDy / length) * newPlayer.speed;
                } else { dx = keyDx; dy = keyDy; }
            }
        }
        
        // Player GFX direction (even if not interactive, for consistent facing)
        let playerShootingDirectionForGFX: Position | undefined = undefined;
        if (currentEnemies.length > 0) {
            let closestVisibleEnemyToPlayer: Enemy | null = null;
            let distToClosestVisiblePlayerTarget = Infinity;
            currentEnemies.forEach(enemy => {
                if (isGameObjectOnScreen(enemy, newBaseCamera, gameArea)) {
                    const dist = distanceBetweenGameObjects(newPlayer, enemy);
                    if (dist < distToClosestVisiblePlayerTarget) {
                        distToClosestVisiblePlayerTarget = dist;
                        closestVisibleEnemyToPlayer = enemy;
                    }
                }
            });
            if (closestVisibleEnemyToPlayer && distToClosestVisiblePlayerTarget <= newPlayer.range) {
                const playerCenter = getCenter(newPlayer);
                const targetCenter = getCenter(closestVisibleEnemyToPlayer);
                playerShootingDirectionForGFX = normalizeVector({ x: targetCenter.x - playerCenter.x, y: targetCenter.y - playerCenter.y });
            }
        }

        // Player Timers Update (reload, shoot cooldown)
        if (!isCountingDownForNextWave) {
            const isPlayerGunGuy = newPlayer.championType === undefined;
            if (isPlayerGunGuy && newPlayer.currentReloadTimer && newPlayer.currentReloadTimer > 0) {
                newPlayer.currentReloadTimer = Math.max(0, newPlayer.currentReloadTimer - 1);
                if (newPlayer.currentReloadTimer === 0 && newPlayer.clipSize) {
                    newPlayer.ammoLeftInClip = newPlayer.clipSize; 
                }
            }
            newPlayer.shootTimer = Math.max(0, newPlayer.shootTimer - 1);

            // Player Shooting Action
            if (isPlayerInteractive && newPlayer.shootTimer === 0 && playerShootingDirectionForGFX) {
                const playerCenterForShot = getCenter(newPlayer);
                if (isPlayerGunGuy) {
                    if (newPlayer.currentReloadTimer === 0 && newPlayer.ammoLeftInClip && newPlayer.ammoLeftInClip > 0) {
                        newProjectilesCreatedThisTick.push({
                            id: uuidv4(), x: playerCenterForShot.x - PROJECTILE_SIZE.width / 2, y: playerCenterForShot.y - PROJECTILE_SIZE.height / 2,
                            width: PROJECTILE_SIZE.width, height: PROJECTILE_SIZE.height,
                            velocity: { x: playerShootingDirectionForGFX.x * PLAYER_ALLY_PROJECTILE_SPEED, y: playerShootingDirectionForGFX.y * PLAYER_ALLY_PROJECTILE_SPEED },
                            damage: newPlayer.damage, ownerId: newPlayer.id, isPlayerProjectile: true,
                            color: UI_STROKE_PRIMARY, causesShake: false,
                        });
                        newPlayer.ammoLeftInClip--;
                        newPlayer.shootTimer = newPlayer.shootCooldown; 
                        newPlayer.lastShootingDirection = { ...playerShootingDirectionForGFX };

                        if (newPlayer.ammoLeftInClip === 0 && newPlayer.reloadDuration) { 
                            newPlayer.currentReloadTimer = newPlayer.reloadDuration;
                        }
                    }
                } else { 
                    const championType = newPlayer.championType;
                    let projectileCount = 1; let projectileSpread = 0; let projectileSpeedMultiplier = 1.0;
                    let projectileWidth = PROJECTILE_SIZE.width; let projectileHeight = PROJECTILE_SIZE.height;
                    let customProjectileSpeed: number | undefined = undefined; let customMaxTravel: number | undefined = undefined;
                    let causesShake = false; let projectileAoeRadius: number | undefined = undefined;

                    if (championType === AllyType.SHOTGUN) { projectileCount = ALLY_SHOTGUN_PROJECTILE_COUNT; projectileSpread = ALLY_SHOTGUN_SPREAD_ANGLE; }
                    else if (championType === AllyType.SNIPER) { projectileSpeedMultiplier = ALLY_SNIPER_PROJECTILE_SPEED_MULTIPLIER; }
                    else if (championType === AllyType.RPG_SOLDIER) { projectileSpeedMultiplier = ALLY_RPG_SOLDIER_PROJECTILE_SPEED_MULTIPLIER; projectileWidth = RPG_PROJECTILE_SIZE.width; projectileHeight = RPG_PROJECTILE_SIZE.height; causesShake = true; projectileAoeRadius = RPG_AOE_RADIUS; }
                    else if (championType === AllyType.FLAMER) { projectileCount = ALLY_FLAMER_PROJECTILE_COUNT; projectileSpread = ALLY_FLAMER_SPREAD_ANGLE; projectileWidth = FLAMER_PROJECTILE_SIZE.width; projectileHeight = FLAMER_PROJECTILE_SIZE.height; customProjectileSpeed = FLAMER_PROJECTILE_SPEED; customMaxTravel = FLAMER_PROJECTILE_MAX_TRAVEL_DISTANCE; }
                    else if (championType === AllyType.RIFLEMAN) { projectileSpeedMultiplier = ALLY_RIFLEMAN_PROJECTILE_SPEED_MULTIPLIER; }

                    const finalProjectileSpeed = customProjectileSpeed ?? (PLAYER_ALLY_PROJECTILE_SPEED * projectileSpeedMultiplier);
                    const angleStep = projectileCount > 1 ? projectileSpread / (projectileCount - 1) : 0;

                    for (let i = 0; i < projectileCount; i++) {
                        const angleOffset = (i - (projectileCount - 1) / 2) * angleStep;
                        const radOffset = angleOffset * (Math.PI / 180);
                        const dirX = playerShootingDirectionForGFX.x * Math.cos(radOffset) - playerShootingDirectionForGFX.y * Math.sin(radOffset);
                        const dirY = playerShootingDirectionForGFX.x * Math.sin(radOffset) + playerShootingDirectionForGFX.y * Math.cos(radOffset);
                        newProjectilesCreatedThisTick.push({
                            id: uuidv4(), x: playerCenterForShot.x - projectileWidth / 2, y: playerCenterForShot.y - projectileHeight / 2,
                            width: projectileWidth, height: projectileHeight,
                            velocity: { x: dirX * finalProjectileSpeed, y: dirY * finalProjectileSpeed },
                            damage: newPlayer.damage, ownerId: newPlayer.id, isPlayerProjectile: true,
                            color: UI_STROKE_PRIMARY, maxTravelDistance: customMaxTravel, distanceTraveled: customMaxTravel ? 0 : undefined, causesShake, aoeRadius: projectileAoeRadius,
                        });
                    }
                    newPlayer.shootTimer = newPlayer.shootCooldown;
                    newPlayer.lastShootingDirection = { ...playerShootingDirectionForGFX };
                }
            }
        }


        if (playerShootingDirectionForGFX) {
            newPlayer.velocity = { ...playerShootingDirectionForGFX };
        } else if (newPlayer.lastShootingDirection) {
            newPlayer.velocity = { ...newPlayer.lastShootingDirection };
        } else {
            newPlayer.velocity = { x: 1, y: 0 };
        }
        if (!newPlayer.velocity || (newPlayer.velocity.x === 0 && newPlayer.velocity.y === 0)) {
            newPlayer.velocity = { x: 1, y: 0 };
        }


        if (isPlayerInteractive && (dx !== 0 || dy !== 0)) {
            newPlayer.x = Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(newPlayer.x + dx, WORLD_AREA.width - newPlayer.width - PLAYER_WORLD_EDGE_MARGIN));
            newPlayer.y = Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(newPlayer.y + dy, WORLD_AREA.height - newPlayer.height - PLAYER_WORLD_EDGE_MARGIN));
        }

        const playerCurrentCenterPath = getCenter(newPlayer); // Use a different variable for path history center
        newPlayer.pathHistory = [playerCurrentCenterPath, ...newPlayer.pathHistory].slice(0, PATH_HISTORY_LENGTH);

        const idealCameraX = newPlayer.x + newPlayer.width / 2 - gameArea.width / 2;
        const idealCameraY = newPlayer.y + newPlayer.height / 2 - gameArea.height / 2;
        newBaseCamera.x += (idealCameraX - newBaseCamera.x) * CAMERA_LERP_FACTOR;
        newBaseCamera.y += (idealCameraY - newBaseCamera.y) * CAMERA_LERP_FACTOR;
        newBaseCamera.x = Math.max(0, Math.min(newBaseCamera.x, WORLD_AREA.width - gameArea.width)); 
        newBaseCamera.y = Math.max(0, Math.min(newBaseCamera.y, WORLD_AREA.height - gameArea.height)); 

        const remainingCoins: Coin[] = [];
        const playerCenterForCoins = getCenter(newPlayer);
        currentCoins.forEach(coin => {
          let collected = false;
          const coinCenter = getCenter(coin);
          const distanceToCoin = distanceBetweenPoints(playerCenterForCoins, coinCenter);
          if (checkCollision(newPlayer, coin)) {
            newPlayer.coins += coin.value;
            newPlayer.currentRunCoinsEarned += coin.value; 
            collected = true;
          } else if (distanceToCoin < newPlayer.coinMagnetRange) {
            if (distanceToCoin > COIN_MIN_ATTRACTION_DIST_FOR_MOVEMENT) {
                const directionToPlayer = normalizeVector({ x: playerCenterForCoins.x - coinCenter.x, y: playerCenterForCoins.y - coinCenter.y });
                let moveSpeed = Math.min(newPlayer.coinMagnetRange * COIN_ATTRACTION_STRENGTH_FACTOR, COIN_MAX_ATTRACTION_SPEED);
                const dynamicSpeed = Math.min(moveSpeed, distanceToCoin / 1.5);
                coin.x += directionToPlayer.x * dynamicSpeed; coin.y += directionToPlayer.y * dynamicSpeed;
                if (checkCollision(newPlayer, coin)) {
                    newPlayer.coins += coin.value;
                    newPlayer.currentRunCoinsEarned += coin.value;
                    collected = true;
                }
            } else {
                newPlayer.coins += coin.value;
                newPlayer.currentRunCoinsEarned += coin.value; 
                collected = true;
            }
          }
          if (!collected) remainingCoins.push(coin);
        });
        currentCoins = remainingCoins;

        newNextAllySpawnTimer -= deltaTimeSeconds;

        const tempAllies: Ally[] = [];
        const leaderEntities: (Player | Ally)[] = [newPlayer, ...newPlayer.allies];
        newPlayer.allies.forEach((ally) => {
          let currentAlly = {...ally};
          currentAlly.pathHistory = currentAlly.pathHistory || [];
          const leader = leaderEntities.find(l => l.id === currentAlly.leaderId);

          let allyMovedX = 0; let allyMovedY = 0;
          let tentativeAllyX = currentAlly.x; let tentativeAllyY = currentAlly.y;

          if (leader) {
            const leaderPath = leader.pathHistory;
            const effectiveTrailFollowDistance = ALLY_TRAIL_FOLLOW_DISTANCE * newPlayer.squadSpacingMultiplier;
            let targetPointForAllyCenter = getCenter(leader);
            if (leaderPath && leaderPath.length > 1) {
                let accumulatedPathDistance = 0; let pointFound = false;
                for (let i = 0; i < leaderPath.length - 1; i++) {
                    const pCurrent = leaderPath[i]; const pNext = leaderPath[i + 1];
                    const segmentDistance = distanceBetweenPoints(pCurrent, pNext); if (segmentDistance === 0) continue;
                    if (accumulatedPathDistance + segmentDistance >= effectiveTrailFollowDistance) {
                        const neededDistInSegment = effectiveTrailFollowDistance - accumulatedPathDistance;
                        const ratio = neededDistInSegment / segmentDistance;
                        targetPointForAllyCenter = { x: pCurrent.x + (pNext.x - pCurrent.x) * ratio, y: pCurrent.y + (pNext.y - pCurrent.y) * ratio };
                        pointFound = true; break;
                    }
                    accumulatedPathDistance += segmentDistance;
                }
                if (!pointFound && leaderPath.length > 0) targetPointForAllyCenter = leaderPath[leaderPath.length - 1];
            }
            const allyCurrentCenterBeforeMove = getCenter(currentAlly);
            const distToDesiredPathPoint = distanceBetweenPoints(allyCurrentCenterBeforeMove, targetPointForAllyCenter);
            if (distToDesiredPathPoint > 0.5) {
                const desiredAllyTopLeftX = targetPointForAllyCenter.x - currentAlly.width / 2;
                const desiredAllyTopLeftY = targetPointForAllyCenter.y - currentAlly.height / 2;
                const moveDx = (desiredAllyTopLeftX - currentAlly.x) * ALLY_LERP_FACTOR;
                const moveDy = (desiredAllyTopLeftY - currentAlly.y) * ALLY_LERP_FACTOR;
                allyMovedX = moveDx; allyMovedY = moveDy;
                tentativeAllyX += moveDx; tentativeAllyY += moveDy;
            }
            const leaderActualCenter = getCenter(leader);
            let tentativeAllyCenter = { x: tentativeAllyX + currentAlly.width / 2, y: tentativeAllyY + currentAlly.height / 2 };
            const distToLeaderCenter = distanceBetweenPoints(tentativeAllyCenter, leaderActualCenter);
            const minSeparationDistance = (leader.width / 2) + (currentAlly.width / 2) + 5;
            if (distToLeaderCenter < minSeparationDistance && distToLeaderCenter > 0.01) {
                const vecFromLeaderToAllyX = tentativeAllyCenter.x - leaderActualCenter.x; const vecFromLeaderToAllyY = tentativeAllyCenter.y - leaderActualCenter.y;
                const scaledVecX = (vecFromLeaderToAllyX / distToLeaderCenter) * minSeparationDistance; const scaledVecY = (vecFromLeaderToAllyY / distToLeaderCenter) * minSeparationDistance;
                const finalAllyCenterX = leaderActualCenter.x + scaledVecX; const finalAllyCenterY = leaderActualCenter.y + scaledVecY;
                currentAlly.x = finalAllyCenterX - currentAlly.width / 2; currentAlly.y = finalAllyCenterY - currentAlly.height / 2;
            } else { currentAlly.x = tentativeAllyX; currentAlly.y = tentativeAllyY; }
          }
          currentAlly.x = Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(currentAlly.x, WORLD_AREA.width - currentAlly.width - PLAYER_WORLD_EDGE_MARGIN));
          currentAlly.y = Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(currentAlly.y, WORLD_AREA.height - currentAlly.height - PLAYER_WORLD_EDGE_MARGIN));

          let allyShotFiredThisTick = false;
          let allyShootingDirectionForGFX: Position | undefined = undefined;

          if (currentEnemies.length > 0) {
            let closestEnemyToAlly: Enemy | null = null; 
            let distToClosestAllyTarget = Infinity;
            currentEnemies.forEach(enemy => {
              const canAllyTarget = currentAlly.allyType === AllyType.SNIPER || isGameObjectOnScreen(enemy, newBaseCamera, gameArea);
              if (canAllyTarget) {
                  const dist = distanceBetweenPoints(getCenter(currentAlly), getCenter(enemy));
                  if (dist < distToClosestAllyTarget) { 
                    distToClosestAllyTarget = dist; 
                    closestEnemyToAlly = enemy; 
                  }
              }
            });
            if (closestEnemyToAlly && distToClosestAllyTarget <= currentAlly.range) {
              const targetCenter = getCenter(closestEnemyToAlly); const allyCenter = getCenter(currentAlly);
              allyShootingDirectionForGFX = normalizeVector({ x: targetCenter.x - allyCenter.x, y: targetCenter.y - allyCenter.y });
            }
          }

          if (!isCountingDownForNextWave) {
            const isAllyGunGuy = currentAlly.allyType === AllyType.GUN_GUY;

            if (isAllyGunGuy && currentAlly.currentReloadTimer && currentAlly.currentReloadTimer > 0) {
                currentAlly.currentReloadTimer = Math.max(0, currentAlly.currentReloadTimer - 1);
                if (currentAlly.currentReloadTimer === 0 && currentAlly.clipSize) {
                    currentAlly.ammoLeftInClip = currentAlly.clipSize;
                }
            }
            currentAlly.shootTimer = Math.max(0, currentAlly.shootTimer - 1);

            if (currentAlly.shootTimer === 0 && allyShootingDirectionForGFX) {
                const allyCenterForShot = getCenter(currentAlly);
                if (isAllyGunGuy) {
                    if (currentAlly.currentReloadTimer === 0 && currentAlly.ammoLeftInClip && currentAlly.ammoLeftInClip > 0) {
                        newProjectilesCreatedThisTick.push({
                            id: uuidv4(), x: allyCenterForShot.x - PROJECTILE_SIZE.width / 2, y: allyCenterForShot.y - PROJECTILE_SIZE.height / 2,
                            width: PROJECTILE_SIZE.width, height: PROJECTILE_SIZE.height,
                            velocity: { x: allyShootingDirectionForGFX.x * PLAYER_ALLY_PROJECTILE_SPEED, y: allyShootingDirectionForGFX.y * PLAYER_ALLY_PROJECTILE_SPEED },
                            damage: currentAlly.damage, ownerId: currentAlly.id, isPlayerProjectile: true, color: UI_STROKE_PRIMARY, causesShake: false
                        });
                        currentAlly.ammoLeftInClip--;
                        currentAlly.shootTimer = currentAlly.shootCooldown; 
                        currentAlly.lastShootingDirection = { ...allyShootingDirectionForGFX };
                        allyShotFiredThisTick = true;

                        if (currentAlly.ammoLeftInClip === 0 && currentAlly.reloadDuration) {
                            currentAlly.currentReloadTimer = currentAlly.reloadDuration;
                        }
                    }
                } else { 
                    let projectileWidth = PROJECTILE_SIZE.width; let projectileHeight = PROJECTILE_SIZE.height; let causesShake = false;
                    let projectileSpeed = currentAlly.projectileSpeed || PLAYER_ALLY_PROJECTILE_SPEED; let maxTravel: number | undefined = undefined;
                    let projectileAoeRadius: number | undefined = undefined;
                    if (currentAlly.allyType === AllyType.RPG_SOLDIER) { projectileWidth = RPG_PROJECTILE_SIZE.width; projectileHeight = RPG_PROJECTILE_SIZE.height; causesShake = true; projectileAoeRadius = RPG_AOE_RADIUS;}
                    else if (currentAlly.allyType === AllyType.FLAMER) { projectileWidth = FLAMER_PROJECTILE_SIZE.width; projectileHeight = FLAMER_PROJECTILE_SIZE.height; projectileSpeed = FLAMER_PROJECTILE_SPEED; maxTravel = FLAMER_PROJECTILE_MAX_TRAVEL_DISTANCE; }
                    const count = (currentAlly.allyType === AllyType.SHOTGUN || currentAlly.allyType === AllyType.FLAMER) ? (currentAlly.projectileCount || 1) : 1;
                    const spread = (currentAlly.allyType === AllyType.SHOTGUN) ? (currentAlly.projectileSpreadAngle || 0) : 0;
                    const angleStep = count > 1 ? spread / (count - 1) : 0;

                    for (let i = 0; i < count; i++) {
                        const angleOffset = (i - (count - 1) / 2) * angleStep; const radOffset = angleOffset * (Math.PI / 180);
                        const dirX = allyShootingDirectionForGFX.x * Math.cos(radOffset) - allyShootingDirectionForGFX.y * Math.sin(radOffset);
                        const dirY = allyShootingDirectionForGFX.x * Math.sin(radOffset) + allyShootingDirectionForGFX.y * Math.cos(radOffset);
                        newProjectilesCreatedThisTick.push({ id: uuidv4(), x: allyCenterForShot.x - projectileWidth / 2, y: allyCenterForShot.y - projectileHeight / 2, width: projectileWidth, height: projectileHeight, velocity: { x: dirX * projectileSpeed, y: dirY * projectileSpeed }, damage: currentAlly.damage, ownerId: currentAlly.id, isPlayerProjectile: true, color: UI_STROKE_PRIMARY, maxTravelDistance: maxTravel, distanceTraveled: maxTravel ? 0 : undefined, causesShake, aoeRadius: projectileAoeRadius });
                    }
                    currentAlly.shootTimer = currentAlly.shootCooldown;
                    currentAlly.lastShootingDirection = { ...allyShootingDirectionForGFX };
                    allyShotFiredThisTick = true;
                }
            }
          }

          if (allyShootingDirectionForGFX) {
            currentAlly.velocity = { ...allyShootingDirectionForGFX };
          } else if (currentAlly.lastShootingDirection) {
            currentAlly.velocity = { ...currentAlly.lastShootingDirection };
          } else {
            currentAlly.velocity = { x: 1, y: 0 };
          }
          if (!currentAlly.velocity || (currentAlly.velocity.x === 0 && currentAlly.velocity.y === 0)) {
            currentAlly.velocity = { x: 1, y: 0 };
          }

          const allyNewCenter = getCenter(currentAlly);
          currentAlly.pathHistory = [allyNewCenter, ...currentAlly.pathHistory].slice(0, PATH_HISTORY_LENGTH);
          tempAllies.push(currentAlly);
        });
        newPlayer.allies = tempAllies;
        if (isPlayerInteractive) { // Only update max squad size if player is active
            newPlayer.maxSquadSizeAchieved = Math.max(newPlayer.maxSquadSizeAchieved || 0, newPlayer.allies.length + 1);
        }


        const remainingCollectibleAllies: CollectibleAlly[] = [];
        currentCollectibleAllies.forEach(collectible => {
          if (isPlayerInteractive && checkCollision(newPlayer, collectible)) addAllyToPlayer(newPlayer, collectible.allyType, prev.round); 
          else remainingCollectibleAllies.push(collectible);
        });
        currentCollectibleAllies = remainingCollectibleAllies;

        const tempEnemies: Enemy[] = [];
        currentEnemies.forEach(enemy => {
          let currentEnemy = {...enemy};
          currentEnemy.attackTimer = Math.max(0, currentEnemy.attackTimer - 1);
          if (currentEnemy.enemyType === EnemyType.ELECTRIC_DRONE) currentEnemy.aoeTimer = Math.max(0, (currentEnemy.aoeTimer || 0) - 1);
          let target: Character | null = newPlayer; // Default target is player
          // If player is dead (health <=0), enemies might retarget or stop. For now, they still target player's last known state conceptually.
          // Allies are still valid targets.
          let minDistToTarget = distanceBetweenGameObjects(currentEnemy, newPlayer); // Distance to player (even if dead)
          
          newPlayer.allies.forEach(ally => { // Iterate through ALIVE allies
            const distToAlly = distanceBetweenGameObjects(currentEnemy, ally);
            if (distToAlly < minDistToTarget) { minDistToTarget = distToAlly; target = ally; }
          });

          if (!target) { tempEnemies.push(currentEnemy); return; } // Should not happen if player exists
          currentEnemy.targetId = target.id;

          const targetCenter = getCenter(target); const enemyCenter = getCenter(currentEnemy);
          const directionToTarget = normalizeVector({ x: targetCenter.x - enemyCenter.x, y: targetCenter.y - enemyCenter.y });
          const distToActualTarget = distanceBetweenGameObjects(currentEnemy, target);
          currentEnemy.velocity = {x: directionToTarget.x * currentEnemy.speed, y: directionToTarget.y * currentEnemy.speed};
          let shouldMove = true;
          if (currentEnemy.enemyType === EnemyType.RANGED_SHOOTER) { if (distToActualTarget < currentEnemy.attackRange * 0.8 && distToActualTarget > ENEMY_RANGED_SHOOTER_MIN_DISTANCE) shouldMove = false; else if (distToActualTarget <= ENEMY_RANGED_SHOOTER_MIN_DISTANCE) { currentEnemy.x -= directionToTarget.x * currentEnemy.speed * 0.7; currentEnemy.y -= directionToTarget.y * currentEnemy.speed * 0.7; shouldMove = false; } }
          else if (currentEnemy.enemyType === EnemyType.ENEMY_SNIPER) { if (distToActualTarget < currentEnemy.attackRange * ENEMY_SNIPER_MIN_DISTANCE_FACTOR) { currentEnemy.x -= directionToTarget.x * currentEnemy.speed * 0.8; currentEnemy.y -= directionToTarget.y * currentEnemy.speed * 0.8; shouldMove = false; } else if (distToActualTarget > currentEnemy.attackRange * ENEMY_SNIPER_MAX_DISTANCE_FACTOR) { if (distToActualTarget > currentEnemy.attackRange * 1.2) shouldMove = true; else shouldMove = false; } else shouldMove = false; }
          else if (currentEnemy.enemyType === EnemyType.ROCKET_TANK || currentEnemy.enemyType === EnemyType.ELECTRIC_DRONE) { const effectiveRange = currentEnemy.enemyType === EnemyType.ELECTRIC_DRONE ? (currentEnemy.aoeRadius || 0) : currentEnemy.attackRange; if (distToActualTarget <= effectiveRange * 0.5) shouldMove = false; }
          if (shouldMove && (distToActualTarget > currentEnemy.attackRange * 0.1 || currentEnemy.enemyType === EnemyType.MELEE_GRUNT || currentEnemy.enemyType === EnemyType.AGILE_STALKER)) { currentEnemy.x += directionToTarget.x * currentEnemy.speed; currentEnemy.y += directionToTarget.y * currentEnemy.speed; }
          currentEnemy.x = Math.max(-currentEnemy.width, Math.min(currentEnemy.x, WORLD_AREA.width));
          currentEnemy.y = Math.max(-currentEnemy.height, Math.min(currentEnemy.y, WORLD_AREA.height));
          if (currentEnemy.attackTimer === 0 && distToActualTarget <= currentEnemy.attackRange) {
            if (currentEnemy.enemyType === EnemyType.MELEE_GRUNT || currentEnemy.enemyType === EnemyType.AGILE_STALKER) { 
                if (target.id === newPlayer.id && newPlayer.health > 0) {
                    newPlayer.health -= currentEnemy.attackDamage;
                    if (newPlayer.health > 0) newPlayer.playerHitTimer = PLAYER_HIT_FLASH_DURATION_TICKS;
                }
                else if (target.id !== newPlayer.id) newPlayer.allies = newPlayer.allies.map(a => a.id === target!.id ? {...a, health: 0} : a); 
                currentEnemy.attackTimer = currentEnemy.attackCooldown; 
            }
            else if (currentEnemy.enemyType === EnemyType.RANGED_SHOOTER || currentEnemy.enemyType === EnemyType.ENEMY_SNIPER) { if (isGameObjectOnScreen(target, newBaseCamera, gameArea)) { newProjectilesCreatedThisTick.push({ id: uuidv4(), x: enemyCenter.x - PROJECTILE_SIZE.width / 2, y: enemyCenter.y - PROJECTILE_SIZE.height / 2, width: PROJECTILE_SIZE.width, height: PROJECTILE_SIZE.height, velocity: { x: directionToTarget.x * ENEMY_PROJECTILE_SPEED, y: directionToTarget.y * ENEMY_PROJECTILE_SPEED }, damage: currentEnemy.attackDamage, ownerId: currentEnemy.id, isPlayerProjectile: false, color: UI_ACCENT_CRITICAL, causesShake: false }); currentEnemy.attackTimer = currentEnemy.attackCooldown; } }
            else if (currentEnemy.enemyType === EnemyType.ROCKET_TANK) { if (isGameObjectOnScreen(target, newBaseCamera, gameArea)) { newProjectilesCreatedThisTick.push({ id: uuidv4(), x: enemyCenter.x - RPG_PROJECTILE_SIZE.width / 2, y: enemyCenter.y - RPG_PROJECTILE_SIZE.height / 2, width: RPG_PROJECTILE_SIZE.width, height: RPG_PROJECTILE_SIZE.height, velocity: { x: directionToTarget.x * ENEMY_ROCKET_TANK_PROJECTILE_SPEED, y: directionToTarget.y * ENEMY_ROCKET_TANK_PROJECTILE_SPEED }, damage: currentEnemy.attackDamage, ownerId: currentEnemy.id, isPlayerProjectile: false, color: UI_ACCENT_CRITICAL, causesShake: true, aoeRadius: ENEMY_ROCKET_TANK_AOE_RADIUS }); currentEnemy.attackTimer = currentEnemy.attackCooldown; } }
          }
          if (currentEnemy.enemyType === EnemyType.ELECTRIC_DRONE && currentEnemy.aoeTimer === 0) {
            const droneCenter = getCenter(currentEnemy); let aoeHitSomeone = false;
            if (newPlayer.health > 0 && distanceBetweenPoints(droneCenter, getCenter(newPlayer)) <= (currentEnemy.aoeRadius || 0)) {
                newPlayer.health -= (currentEnemy.aoeDamage || 0); aoeHitSomeone = true;
                if (newPlayer.health > 0) newPlayer.playerHitTimer = PLAYER_HIT_FLASH_DURATION_TICKS;
            }
            newPlayer.allies.forEach(ally => { if (distanceBetweenPoints(droneCenter, getCenter(ally)) <= (currentEnemy.aoeRadius || 0)) { ally.health = 0; aoeHitSomeone = true; } });
            newPlayer.allies = newPlayer.allies.filter(a => a.health > 0);
            if (aoeHitSomeone) currentEnemy.aoeTimer = currentEnemy.aoeCooldown; else currentEnemy.aoeTimer = Math.min(15, (currentEnemy.aoeCooldown || 60) / 4);
          }
          tempEnemies.push(currentEnemy);
        });
        currentEnemies = tempEnemies.filter(e => e.health > 0);

        let currentListOfProjectiles = [...existingProjectiles, ...newProjectilesCreatedThisTick];
        const remainingProjectiles: Projectile[] = [];
        const projectilesToExplodeAoE: { projectile: Projectile, impactCenter: Position }[] = [];

        currentListOfProjectiles.forEach(proj => {
          let currentProj = {...proj};
          currentProj.x += currentProj.velocity.x;
          currentProj.y += currentProj.velocity.y;
          let projectileRemovedThisTick = false;

          if (currentProj.maxTravelDistance !== undefined && currentProj.distanceTraveled !== undefined) {
            const distanceMovedThisTick = Math.sqrt(currentProj.velocity.x ** 2 + currentProj.velocity.y ** 2);
            currentProj.distanceTraveled += distanceMovedThisTick;
            if (currentProj.distanceTraveled >= currentProj.maxTravelDistance) {
              projectileRemovedThisTick = true; 
              if (currentProj.isAirstrike && currentProj.aoeRadius) {
                projectilesToExplodeAoE.push({ projectile: currentProj, impactCenter: getCenter(currentProj) });
                if (currentProj.causesShake) activeCameraShake = { intensity: AIRSTRIKE_IMPACT_SHAKE_INTENSITY, duration: AIRSTRIKE_IMPACT_SHAKE_DURATION, timer: AIRSTRIKE_IMPACT_SHAKE_DURATION };
              }
            }
          }
          
          if (!projectileRemovedThisTick && (currentProj.x + currentProj.width < -50 || currentProj.x > WORLD_AREA.width + 50 || currentProj.y + currentProj.height < -50 || currentProj.y > WORLD_AREA.height + 50)) {
            projectileRemovedThisTick = true; 
          }

          if (!projectileRemovedThisTick) {
            if (currentProj.isPlayerProjectile || currentProj.isAirstrike) {
              currentEnemies = currentEnemies.filter(enemy => {
                if (checkCollision(currentProj, enemy)) {
                  enemy.health -= currentProj.damage;
                  projectileRemovedThisTick = true; 
                  if (currentProj.causesShake) {
                    const shakeIntensity = currentProj.isAirstrike ? AIRSTRIKE_IMPACT_SHAKE_INTENSITY : RPG_IMPACT_CAMERA_SHAKE_INTENSITY;
                    const shakeDuration = currentProj.isAirstrike ? AIRSTRIKE_IMPACT_SHAKE_DURATION : RPG_IMPACT_CAMERA_SHAKE_DURATION;
                    activeCameraShake = { intensity: shakeIntensity, duration: shakeDuration, timer: shakeDuration };
                  }
                  if (currentProj.aoeRadius) { 
                    projectilesToExplodeAoE.push({ projectile: currentProj, impactCenter: getCenter(enemy) });
                  }
                  if (enemy.health <= 0) {
                    if (isPlayerInteractive) { // Only grant rewards if player is active
                        newPlayer.kills++; newPlayer.currentRunKills++;
                        if (enemy.enemyType === EnemyType.ROCKET_TANK) newPlayer.currentRunTanksDestroyed++;
                        updatedKilledEnemiesThisRound++;
                        newPlayer.comboCount++;
                        newPlayer.highestComboCount = Math.max(newPlayer.highestComboCount || 0, newPlayer.comboCount);
                        newComboTimer = COMBO_WINDOW_DURATION_TICKS;
                        if (newPlayer.comboCount >= AIRSTRIKE_COMBO_THRESHOLD && !newAirstrikeActive) newAirstrikeAvailable = true;
                        const baseCoins = Math.ceil(enemy.points / COIN_VALUE); const randomCoins = 1 + Math.floor(Math.random()*3);
                        for (let i=0; i < baseCoins + randomCoins; i++) { currentCoins.push({ id: uuidv4(), x: getCenter(enemy).x - COIN_SIZE.width/2 + (Math.random()-0.5)*enemy.width*1.5, y: getCenter(enemy).y - COIN_SIZE.height/2 + (Math.random()-0.5)*enemy.height*1.5, width:COIN_SIZE.width, height:COIN_SIZE.height,value:COIN_VALUE, color:UI_STROKE_PRIMARY});}
                    }
                    return false; 
                  }
                }
                return true; 
              });
            } else { 
              if (newPlayer.health > 0 && checkCollision(currentProj, newPlayer)) { // Player can only take damage if alive
                newPlayer.health -= currentProj.damage; projectileRemovedThisTick = true;
                if (newPlayer.health > 0) newPlayer.playerHitTimer = PLAYER_HIT_FLASH_DURATION_TICKS;
                if (currentProj.causesShake) activeCameraShake = { intensity: RPG_IMPACT_CAMERA_SHAKE_INTENSITY, duration: RPG_IMPACT_CAMERA_SHAKE_DURATION, timer: RPG_IMPACT_CAMERA_SHAKE_DURATION };
                if (currentProj.aoeRadius) projectilesToExplodeAoE.push({ projectile: currentProj, impactCenter: getCenter(newPlayer) });
              }
              newPlayer.allies.forEach(ally => {
                if (!projectileRemovedThisTick && checkCollision(currentProj, ally)) {
                  ally.health = 0; projectileRemovedThisTick = true; 
                  if (currentProj.causesShake) activeCameraShake = { intensity: RPG_IMPACT_CAMERA_SHAKE_INTENSITY, duration: RPG_IMPACT_CAMERA_SHAKE_DURATION, timer: RPG_IMPACT_CAMERA_SHAKE_DURATION };
                  if (currentProj.aoeRadius) projectilesToExplodeAoE.push({ projectile: currentProj, impactCenter: getCenter(ally) });
                }
              });
              newPlayer.allies = newPlayer.allies.filter(a => a.health > 0);
            }
          }
          if (!projectileRemovedThisTick) {
            remainingProjectiles.push(currentProj);
          }
        });
        
        projectilesToExplodeAoE.forEach(({ projectile: explodingProj, impactCenter }) => {
          currentEnemies = currentEnemies.filter(enemy => {
            const distToImpact = distanceBetweenPoints(getCenter(enemy), impactCenter);
            if (distToImpact <= explodingProj.aoeRadius) {
              enemy.health -= explodingProj.damage; 
              if (enemy.health <= 0) {
                 if (isPlayerInteractive) { // Only grant rewards if player is active
                    newPlayer.kills++; newPlayer.currentRunKills++;
                    if (enemy.enemyType === EnemyType.ROCKET_TANK) newPlayer.currentRunTanksDestroyed++;
                    updatedKilledEnemiesThisRound++;
                    newPlayer.comboCount++;
                    newPlayer.highestComboCount = Math.max(newPlayer.highestComboCount || 0, newPlayer.comboCount);
                    newComboTimer = COMBO_WINDOW_DURATION_TICKS;
                    if (newPlayer.comboCount >= AIRSTRIKE_COMBO_THRESHOLD && !newAirstrikeActive) newAirstrikeAvailable = true;
                    const baseCoins = Math.ceil(enemy.points / COIN_VALUE); const randomCoins = 1 + Math.floor(Math.random()*3);
                    for (let i=0; i < baseCoins + randomCoins; i++) { currentCoins.push({ id: uuidv4(), x: getCenter(enemy).x - COIN_SIZE.width/2 + (Math.random()-0.5)*enemy.width*1.5, y: getCenter(enemy).y - COIN_SIZE.height/2 + (Math.random()-0.5)*enemy.height*1.5, width:COIN_SIZE.width, height:COIN_SIZE.height,value:COIN_VALUE, color:UI_STROKE_PRIMARY});}
                 }
                return false; 
              }
            }
            return true; 
          });
        });

        processedProjectilesForThisTick = remainingProjectiles;
        newPlayer.allies = newPlayer.allies.filter(ally => ally.health > 0);

        if (newPlayer.allies.length > 0) {
            newPlayer.allies[0].leaderId = newPlayer.id;
            for (let i = 1; i < newPlayer.allies.length; i++) {
                newPlayer.allies[i].leaderId = newPlayer.allies[i-1].id;
            }
        }

        if (isPlayerInteractive) { // Only check logs if player is active
            INITIAL_LOG_DEFINITIONS.forEach(logDef => {
                const logEntry = newLogs.find(l => l.id === logDef.id);
                if (logEntry && !logEntry.isUnlocked) {
                    if (logDef.condition(newPlayer, currentEnemies)) { 
                        logEntry.isUnlocked = true;
                    }
                }
            });
        }
        
        if (!isCountingDownForNextWave && updatedKilledEnemiesThisRound >= prevTotalEnemies && currentEnemies.length === 0 && gameStatus === 'PLAYING') { // Only trigger next wave if playing
          newNextRoundTimer = 5; isCountingDownForNextWave = true; 
        }
        if (isCountingDownForNextWave) {
            newNextRoundTimer = Math.max(0, newNextRoundTimer - deltaTimeSeconds);
            if (newNextRoundTimer <= 0) { 
              const nextRoundNumber = round + 1; 
              startNewRound(newPlayer, nextRoundNumber, prev); 
              lastTickTimeRef.current = performance.now(); 
              return prev; // Return previous state to avoid processing this tick further with new round data
            }
        }

        if (!isCountingDownForNextWave && gameStatus === 'PLAYING') { // Only spawn enemies if playing
            if (newPendingInitialSpawns > 0) {
              newInitialSpawnTickCounter--;
              if (newInitialSpawnTickCounter <= 0) {
                const typeToSpawn = determineNextEnemyType(round, currentEnemies, newSpecialEnemyState);
                if (typeToSpawn) {
                  const newEnemy = createNewEnemy(round, prev.worldArea, typeToSpawn);
                  currentEnemies.push(newEnemy);
                  if (SPECIAL_ENEMY_TYPES.includes(typeToSpawn)) newSpecialEnemyState.lastSpecialTypeSpawnedThisWave = typeToSpawn;
                  newPendingInitialSpawns--;
                  if (newPendingInitialSpawns > 0) {
                     newInitialSpawnTickCounter = INITIAL_SPAWN_INTERVAL_TICKS;
                  }
                } else {
                  newInitialSpawnTickCounter = Math.min(5, INITIAL_SPAWN_INTERVAL_TICKS / 2); 
                }
              }
            }

            const enemiesToSpawnForMidRound = prevTotalEnemies - (updatedKilledEnemiesThisRound + currentEnemies.length + newPendingInitialSpawns);
            const maxConcurrentEnemies = Math.min(25, 8 + round * 2);


            if (newPendingInitialSpawns === 0 && currentEnemies.length < maxConcurrentEnemies && enemiesToSpawnForMidRound > 0) {
               if (Math.random() < 0.045) { 
                 const typeToSpawn = determineNextEnemyType(round, currentEnemies, newSpecialEnemyState);
                 if (typeToSpawn) {
                    const newEnemy = createNewEnemy(round, prev.worldArea, typeToSpawn); 
                    currentEnemies.push(newEnemy); 
                    if (SPECIAL_ENEMY_TYPES.includes(typeToSpawn)) newSpecialEnemyState.lastSpecialTypeSpawnedThisWave = typeToSpawn;
                 }
               }
            }
        }
      } else { // Not PLAYING or GAME_OVER_PENDING
        processedProjectilesForThisTick = [];
      }

      if (newNextAllySpawnTimer <= 0 && (gameStatus === 'PLAYING' || gameStatus === 'GAME_OVER_PENDING')) { // Allow ally spawn during pending
        newNextAllySpawnTimer = ALLY_SPAWN_INTERVAL;
        if (unlockedAllyTypes.length > 0) {
            const availableForSpawn = unlockedAllyTypes.filter(type => type !== AllyType.GUN_GUY || unlockedAllyTypes.length === 1);
            const typeToSpawn = availableForSpawn.length > 0 ? availableForSpawn[Math.floor(Math.random() * availableForSpawn.length)] : unlockedAllyTypes[0];
            const newCollectible = createCollectibleAlly(typeToSpawn, newPlayer, currentCollectibleAllies, prev.worldArea); 
            if (newCollectible) currentCollectibleAllies.push(newCollectible);
        }
      }

      let finalCameraPos = { ...newBaseCamera };
      if (activeCameraShake) {
        const shakeOffsetX = (Math.random() - 0.5) * 2 * activeCameraShake.intensity;
        const shakeOffsetY = (Math.random() - 0.5) * 2 * activeCameraShake.intensity;
        finalCameraPos.x += shakeOffsetX; finalCameraPos.y += shakeOffsetY;
        finalCameraPos.x = Math.max(0, Math.min(finalCameraPos.x, WORLD_AREA.width - gameArea.width)); 
        finalCameraPos.y = Math.max(0, Math.min(finalCameraPos.y, WORLD_AREA.height - gameArea.height)); 
      }

      return {
        ...prev,
        player: newPlayer,
        enemies: currentEnemies,
        projectiles: (newGameStatus === 'PLAYING' || newGameStatus === 'GAME_OVER_PENDING') ? processedProjectilesForThisTick : [],
        coins: currentCoins,
        collectibleAllies: currentCollectibleAllies,
        gameStatus: newGameStatus,
        currentWaveEnemies: updatedKilledEnemiesThisRound,
        nextRoundTimer: newNextRoundTimer,
        nextAllySpawnTimer: newNextAllySpawnTimer,
        camera: finalCameraPos,
        cameraShake: activeCameraShake,
        specialEnemyState: newSpecialEnemyState,
        comboTimer: newComboTimer,
        airstrikeAvailable: newAirstrikeAvailable,
        airstrikeActive: newAirstrikeActive,
        airstrikesPending: newAirstrikesPending,
        airstrikeSpawnTimer: newAirstrikeSpawnTimer,
        pendingInitialSpawns: newPendingInitialSpawns,
        initialSpawnTickCounter: newInitialSpawnTickCounter,
        logs: newLogs,
        gameOverPendingTimer: newGameOverPendingTimer,
        waveTitleText: prevWaveTitleText, 
        waveTitleTimer: newWaveTitleTimer,
      };
    });
  }, [isGameObjectOnScreen, startNewRound]);

  const createCollectibleAlly = (
    allyType: AllyType,
    currentPlayer: Player,
    existingCollectibles: CollectibleAlly[],
    currentWorldArea: Size,
    isTutorial: boolean = false
  ): CollectibleAlly | null => {
    let x, y; let attempts = 0;
    const minSpawnDistFromPlayer = isTutorial ? 80 : 150; // Closer for tutorial
    const minSpawnDistFromOtherCollectibles = 100;

    if (isTutorial) { // Specific placement for tutorial ally
        x = currentPlayer.x + currentPlayer.width / 2 + (Math.random() * 120 + 80) * (Math.random() < 0.5 ? 1 : -1) - COLLECTIBLE_ALLY_SIZE.width / 2;
        y = currentPlayer.y + currentPlayer.height / 2 + (Math.random() * 120 + 80) * (Math.random() < 0.5 ? 1 : -1) - COLLECTIBLE_ALLY_SIZE.height / 2;
        x = Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(x, currentWorldArea.width - COLLECTIBLE_ALLY_SIZE.width - PLAYER_WORLD_EDGE_MARGIN));
        y = Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(y, currentWorldArea.height - COLLECTIBLE_ALLY_SIZE.height - PLAYER_WORLD_EDGE_MARGIN));
    } else {
        do {
            x = Math.random() * (currentWorldArea.width - COLLECTIBLE_ALLY_SIZE.width - 2 * PLAYER_WORLD_EDGE_MARGIN) + PLAYER_WORLD_EDGE_MARGIN;
            y = Math.random() * (currentWorldArea.height - COLLECTIBLE_ALLY_SIZE.height - 2 * PLAYER_WORLD_EDGE_MARGIN) + PLAYER_WORLD_EDGE_MARGIN;
            attempts++;
            if (attempts > 50) { console.warn("Failed to place collectible ally."); return null; }
        } while (
            distanceBetweenPoints(getCenter(currentPlayer), {x: x + COLLECTIBLE_ALLY_SIZE.width/2, y: y + COLLECTIBLE_ALLY_SIZE.height/2}) < minSpawnDistFromPlayer ||
            existingCollectibles.some(ca => distanceBetweenPoints(getCenter(ca), {x: x + COLLECTIBLE_ALLY_SIZE.width/2, y: y + COLLECTIBLE_ALLY_SIZE.height/2}) < minSpawnDistFromOtherCollectibles)
        );
    }
    return {
        id: uuidv4(), allyType: allyType, x, y,
        width: COLLECTIBLE_ALLY_SIZE.width, height: COLLECTIBLE_ALLY_SIZE.height,
        color: UI_STROKE_PRIMARY,
    };
  };

  const addAllyToPlayer = (playerState: Player, allyType: AllyType, currentRound: number) => { 
    let newAllyBase: Omit<Ally, 'id' | 'x' | 'y' | 'targetId' | 'leaderId' | 'pathHistory' | 'color' | 'lastShootingDirection' | 'ammoLeftInClip' | 'clipSize' | 'reloadDuration' | 'currentReloadTimer'> & Partial<Pick<Ally, 'ammoLeftInClip' | 'clipSize' | 'reloadDuration' | 'currentReloadTimer'>> = {
        allyType: allyType,
        width: ALLY_SIZE.width, height: ALLY_SIZE.height,
        health: ALLY_INITIAL_HEALTH, maxHealth: ALLY_INITIAL_HEALTH,
        speed: ALLY_SPEED, shootTimer: 0,
        damage: 10, range: 150, shootCooldown: 50
    };
    switch (allyType) {
        case AllyType.GUN_GUY:
            newAllyBase = {
                ...newAllyBase, damage: ALLY_GUN_GUY_DAMAGE, range: ALLY_GUN_GUY_RANGE, shootCooldown: ALLY_GUN_GUY_COOLDOWN, 
                clipSize: GUN_GUY_CLIP_SIZE, ammoLeftInClip: GUN_GUY_CLIP_SIZE,
                reloadDuration: GUN_GUY_RELOAD_TIME, currentReloadTimer: 0,
            };
            break;
        case AllyType.SHOTGUN: newAllyBase = { ...newAllyBase, damage: ALLY_SHOTGUN_DAMAGE, range: ALLY_SHOTGUN_RANGE, shootCooldown: ALLY_SHOTGUN_COOLDOWN, projectileCount: ALLY_SHOTGUN_PROJECTILE_COUNT, projectileSpreadAngle: ALLY_SHOTGUN_SPREAD_ANGLE }; break;
        case AllyType.SNIPER: newAllyBase = { ...newAllyBase, damage: ALLY_SNIPER_DAMAGE, range: ALLY_SNIPER_RANGE, shootCooldown: ALLY_SNIPER_COOLDOWN, projectileSpeed: PLAYER_ALLY_PROJECTILE_SPEED * ALLY_SNIPER_PROJECTILE_SPEED_MULTIPLIER }; break;
        case AllyType.MINIGUNNER: newAllyBase = { ...newAllyBase, damage: ALLY_MINIGUNNER_DAMAGE, range: ALLY_MINIGUNNER_RANGE, shootCooldown: ALLY_MINIGUNNER_COOLDOWN }; break;
        case AllyType.RPG_SOLDIER: newAllyBase = { ...newAllyBase, damage: ALLY_RPG_SOLDIER_DAMAGE, range: ALLY_RPG_SOLDIER_RANGE, shootCooldown: ALLY_RPG_SOLDIER_COOLDOWN, projectileSpeed: PLAYER_ALLY_PROJECTILE_SPEED * ALLY_RPG_SOLDIER_PROJECTILE_SPEED_MULTIPLIER }; break;
        case AllyType.FLAMER: newAllyBase = { ...newAllyBase, damage: ALLY_FLAMER_DAMAGE, range: ALLY_FLAMER_RANGE, shootCooldown: ALLY_FLAMER_COOLDOWN, projectileCount: ALLY_FLAMER_PROJECTILE_COUNT, projectileSpreadAngle: ALLY_FLAMER_SPREAD_ANGLE }; break;
        case AllyType.RIFLEMAN: newAllyBase = { ...newAllyBase, damage: ALLY_RIFLEMAN_DAMAGE, range: ALLY_RIFLEMAN_RANGE, shootCooldown: ALLY_RIFLEMAN_COOLDOWN, projectileSpeed: PLAYER_ALLY_PROJECTILE_SPEED * ALLY_RIFLEMAN_PROJECTILE_SPEED_MULTIPLIER }; break;
    }
    const leader = playerState.allies.length > 0 ? playerState.allies[playerState.allies.length - 1] : playerState;
    const leaderCenter = getCenter(leader);
    let spawnX = leaderCenter.x - ALLY_SIZE.width / 2;
    let spawnY = leaderCenter.y - ALLY_SIZE.height / 2;
    spawnX = Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(spawnX, WORLD_AREA.width - ALLY_SIZE.width - PLAYER_WORLD_EDGE_MARGIN));
    spawnY = Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(spawnY, WORLD_AREA.height - ALLY_SIZE.height - PLAYER_WORLD_EDGE_MARGIN));
    const newAlly: Ally = {
        ...(newAllyBase as Ally), 
        id: uuidv4(), x: spawnX, y: spawnY, targetId: null,
        leaderId: leader.id, pathHistory: [], color: UI_STROKE_PRIMARY,
        lastShootingDirection: { x: 1, y: 0 },
    };
    playerState.allies.push(newAlly);
    playerState.health = Math.min(playerState.maxHealth, playerState.health + ALLY_PICKUP_HEALTH_RESTORE);
  };


  const confirmChampionSelection = useCallback((choiceId: ChampionChoice['id']) => {
    setGameState(prev => {
        let newPlayer: Player = {
            ...INITIAL_PLAYER_STATE, 
            currentRunKills: 0,
            currentRunTanksDestroyed: 0,
            currentRunCoinsEarned: 0,
            kills: 0, 
            coins: PLAYER_INITIAL_COINS, // Reset coins to initial for Champion Select -> Shop
            allies: [], pathHistory: [], color: UI_STROKE_PRIMARY, lastShootingDirection: {x:1, y:0},
            initialAllyBonus: 0, comboCount: 0, playerHitTimer: 0,
            highestComboCount: 0, // Reset for new champion/session
            maxSquadSizeAchieved: 0, // Reset for new champion/session
            x: Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(INITIAL_PLAYER_STATE.x, WORLD_AREA.width - INITIAL_PLAYER_STATE.width - PLAYER_WORLD_EDGE_MARGIN)),
            y: Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(INITIAL_PLAYER_STATE.y, WORLD_AREA.height - INITIAL_PLAYER_STATE.height - PLAYER_WORLD_EDGE_MARGIN)),
            airstrikeAvailable: false, airstrikeActive: false, airstrikesPending: 0, airstrikeSpawnTimer: 0, // Reset airstrike for new champion
        };
        let championSpecificType: AllyType | undefined = undefined;
        let currentUnlockedAllyTypes: AllyType[] = [AllyType.SHOTGUN, AllyType.RIFLEMAN, AllyType.GUN_GUY];


        if (choiceId === 'GUN_GUY') {
            newPlayer.championType = undefined; 
            newPlayer.damage = PLAYER_INITIAL_DAMAGE;
            newPlayer.range = PLAYER_INITIAL_RANGE;
            newPlayer.shootCooldown = GUN_GUY_SHOT_INTERVAL; 
            newPlayer.clipSize = GUN_GUY_CLIP_SIZE;
            newPlayer.ammoLeftInClip = GUN_GUY_CLIP_SIZE;
            newPlayer.reloadDuration = GUN_GUY_RELOAD_TIME;
            newPlayer.currentReloadTimer = 0;
        } else {
            championSpecificType = choiceId as AllyType;
            newPlayer.championType = championSpecificType;
            if (!currentUnlockedAllyTypes.includes(championSpecificType)) {
                currentUnlockedAllyTypes.push(championSpecificType);
            }

            switch (championSpecificType) {
                case AllyType.SHOTGUN: newPlayer.damage = ALLY_SHOTGUN_DAMAGE; newPlayer.range = ALLY_SHOTGUN_RANGE; newPlayer.shootCooldown = ALLY_SHOTGUN_COOLDOWN; break;
                case AllyType.SNIPER: newPlayer.damage = ALLY_SNIPER_DAMAGE; newPlayer.range = ALLY_SNIPER_RANGE; newPlayer.shootCooldown = ALLY_SNIPER_COOLDOWN; break;
                case AllyType.MINIGUNNER: newPlayer.damage = ALLY_MINIGUNNER_DAMAGE; newPlayer.range = ALLY_MINIGUNNER_RANGE; newPlayer.shootCooldown = ALLY_MINIGUNNER_COOLDOWN; break;
                case AllyType.RPG_SOLDIER: newPlayer.damage = ALLY_RPG_SOLDIER_DAMAGE; newPlayer.range = ALLY_RPG_SOLDIER_RANGE; newPlayer.shootCooldown = ALLY_RPG_SOLDIER_COOLDOWN; break;
                case AllyType.FLAMER: newPlayer.damage = ALLY_FLAMER_DAMAGE; newPlayer.range = ALLY_FLAMER_RANGE; newPlayer.shootCooldown = ALLY_FLAMER_COOLDOWN; break;
                case AllyType.RIFLEMAN: newPlayer.damage = ALLY_RIFLEMAN_DAMAGE; newPlayer.range = ALLY_RIFLEMAN_RANGE; newPlayer.shootCooldown = ALLY_RIFLEMAN_COOLDOWN; break;
            }
        }
        const filteredUpgrades = INITIAL_UPGRADES.map(u => ({...u, cost: u.baseCost, currentLevel: 0 })).filter(upgrade => {
            if (championSpecificType) { 
                if (upgrade.id === UpgradeType.UNLOCK_SNIPER_ALLY && championSpecificType === AllyType.SNIPER) return false;
                if (upgrade.id === UpgradeType.UNLOCK_MINIGUNNER_ALLY && championSpecificType === AllyType.MINIGUNNER) return false;
                if (upgrade.id === UpgradeType.UNLOCK_RPG_ALLY && championSpecificType === AllyType.RPG_SOLDIER) return false;
                if (upgrade.id === UpgradeType.UNLOCK_FLAMER_ALLY && championSpecificType === AllyType.FLAMER) return false;
            }
            return true;
        });
        const camX = Math.max(0, Math.min(newPlayer.x + newPlayer.width / 2 - prev.gameArea.width / 2, WORLD_AREA.width - prev.gameArea.width));
        const camY = Math.max(0, Math.min(newPlayer.y + newPlayer.height / 2 - prev.gameArea.height / 2, WORLD_AREA.height - prev.gameArea.height));
        
        const newLogs: LogEntry[] = INITIAL_LOG_DEFINITIONS.map(def => ({ ...def, isUnlocked: false }));

        return {
            ...prev, player: newPlayer, availableUpgrades: filteredUpgrades, unlockedAllyTypes: currentUnlockedAllyTypes,
            gameStatus: 'SHOP', round: 1, camera: {x: camX, y: camY}, enemies: [], projectiles: [], coins: [], collectibleAllies: [],
            currentWaveEnemies: 0, totalEnemiesThisRound: ROUND_BASE_ENEMY_COUNT, nextAllySpawnTimer: ALLY_SPAWN_INTERVAL,
            cameraShake: null, specialEnemyState: { ...INITIAL_SPECIAL_ENEMY_SPAWN_STATE },
            comboTimer: 0, airstrikeAvailable: false, airstrikeActive: false, airstrikesPending: 0, airstrikeSpawnTimer: 0,
            pendingInitialSpawns: 0, initialSpawnTickCounter: 0,
            logs: newLogs, 
            gameOverPendingTimer: 0, // Reset timer
            waveTitleText: '', waveTitleTimer: 0, // Reset wave title
        };
    });
  }, []);

  const startGame = useCallback(() => {
    confirmChampionSelection('GUN_GUY');
  }, [confirmChampionSelection]);


  const purchaseUpgrade = useCallback((upgrade: Upgrade) => {
    setGameState(prev => {
      if (prev.player.coins < upgrade.cost || upgrade.currentLevel >= upgrade.maxLevel) return prev;
      const newPlayer = upgrade.apply(prev.player, upgrade.cost);
      let newUnlockedAllyTypes = [...prev.unlockedAllyTypes];
      if (upgrade.id === UpgradeType.UNLOCK_SNIPER_ALLY && !newUnlockedAllyTypes.includes(AllyType.SNIPER)) newUnlockedAllyTypes.push(AllyType.SNIPER);
      if (upgrade.id === UpgradeType.UNLOCK_RPG_ALLY && !newUnlockedAllyTypes.includes(AllyType.RPG_SOLDIER)) newUnlockedAllyTypes.push(AllyType.RPG_SOLDIER);
      if (upgrade.id === UpgradeType.UNLOCK_FLAMER_ALLY && !newUnlockedAllyTypes.includes(AllyType.FLAMER)) newUnlockedAllyTypes.push(AllyType.FLAMER);
      if (upgrade.id === UpgradeType.UNLOCK_MINIGUNNER_ALLY && !newUnlockedAllyTypes.includes(AllyType.MINIGUNNER)) newUnlockedAllyTypes.push(AllyType.MINIGUNNER);
      const newUpgrades = prev.availableUpgrades.map(u =>
        u.id === upgrade.id ? { ...u, currentLevel: u.currentLevel + 1, cost: Math.floor(u.baseCost * Math.pow(u.costScalingFactor, u.currentLevel + 1)) } : u
      );
      return { ...prev, player: newPlayer, availableUpgrades: newUpgrades, unlockedAllyTypes: newUnlockedAllyTypes };
    });
  }, []);

  const playNewRunFromShop = useCallback(() => {
    setGameState(prev => {
        const newPlayerStateForRun = {
            ...prev.player, health: prev.player.maxHealth,
            x: Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(WORLD_AREA.width / 2 - PLAYER_SIZE.width / 2, WORLD_AREA.width - PLAYER_SIZE.width - PLAYER_WORLD_EDGE_MARGIN)),
            y: Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(WORLD_AREA.height / 2 - PLAYER_SIZE.height / 2, WORLD_AREA.height - PLAYER_SIZE.height - PLAYER_WORLD_EDGE_MARGIN)),
            allies: [], pathHistory: [], shootTimer: 0,
            kills: prev.player.kills, 
            currentRunKills: 0,
            currentRunTanksDestroyed: 0,
            currentRunCoinsEarned: 0,
            highestComboCount: 0, 
            maxSquadSizeAchieved: 0, 
            comboCount: 0, playerHitTimer: 0,
            lastShootingDirection: { x: 1, y: 0 },
            airstrikeAvailable: false, airstrikeActive: false, airstrikesPending: 0, airstrikeSpawnTimer: 0, // Reset airstrike for new run
        };
        newPlayerStateForRun.maxSquadSizeAchieved = 1; 

        if (newPlayerStateForRun.championType === undefined && newPlayerStateForRun.clipSize) { 
            newPlayerStateForRun.ammoLeftInClip = newPlayerStateForRun.clipSize;
            newPlayerStateForRun.currentReloadTimer = 0;
        }

        if (newPlayerStateForRun.initialAllyBonus && newPlayerStateForRun.initialAllyBonus > 0) {
            for (let i = 0; i < newPlayerStateForRun.initialAllyBonus; i++) {
                const leaderForBonusAlly = newPlayerStateForRun.allies.length > 0 ? newPlayerStateForRun.allies[newPlayerStateForRun.allies.length - 1] : newPlayerStateForRun;
                const leaderCenter = getCenter(leaderForBonusAlly);
                const spawnX = Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(leaderCenter.x - ALLY_SIZE.width / 2, WORLD_AREA.width - ALLY_SIZE.width - PLAYER_WORLD_EDGE_MARGIN));
                const spawnY = Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(leaderCenter.y - ALLY_SIZE.height / 2, WORLD_AREA.height - ALLY_SIZE.height - PLAYER_WORLD_EDGE_MARGIN));

                const bonusAlly: Ally = {
                    id: uuidv4(),
                    allyType: AllyType.RIFLEMAN,
                    x: spawnX, y: spawnY,
                    width: ALLY_SIZE.width, height: ALLY_SIZE.height,
                    health: ALLY_INITIAL_HEALTH, maxHealth: ALLY_INITIAL_HEALTH,
                    speed: ALLY_SPEED, color: UI_STROKE_PRIMARY,
                    shootCooldown: ALLY_RIFLEMAN_COOLDOWN, shootTimer: 0,
                    damage: ALLY_RIFLEMAN_DAMAGE, range: ALLY_RIFLEMAN_RANGE,
                    projectileSpeed: PLAYER_ALLY_PROJECTILE_SPEED * ALLY_RIFLEMAN_PROJECTILE_SPEED_MULTIPLIER,
                    targetId: null,
                    leaderId: leaderForBonusAlly.id,
                    pathHistory: [],
                    lastShootingDirection: { x: 1, y: 0 },
                };
                newPlayerStateForRun.allies.push(bonusAlly);
            }
             newPlayerStateForRun.maxSquadSizeAchieved = Math.max(newPlayerStateForRun.maxSquadSizeAchieved, newPlayerStateForRun.allies.length + 1);
        }

        let initialCollectibleList: CollectibleAlly[] = [];
        if (prev.unlockedAllyTypes.length > 0) {
             const availableForSpawn = prev.unlockedAllyTypes.filter(type => type !== AllyType.GUN_GUY || prev.unlockedAllyTypes.length === 1);
             const typeToSpawn = availableForSpawn.length > 0 ? availableForSpawn[Math.floor(Math.random() * availableForSpawn.length)] : prev.unlockedAllyTypes[0];
             const collectible = createCollectibleAlly(typeToSpawn, newPlayerStateForRun, [], prev.worldArea);
            if (collectible) initialCollectibleList.push(collectible);
        }
        const newLogsForRun = prev.logs.map(l => ({ ...l, isUnlocked: false }));
        INITIAL_LOG_DEFINITIONS.forEach(def => { 
            const logEntry = newLogsForRun.find(l => l.id === def.id);
            if (logEntry && !logEntry.isUnlocked && def.condition(newPlayerStateForRun, [])) {
                logEntry.isUnlocked = true;
            }
        });

        return {
            ...prev, gameStatus: 'INIT_NEW_RUN', player: newPlayerStateForRun, round: 1, enemies: [], projectiles: [], 
            collectibleAllies: initialCollectibleList, nextAllySpawnTimer: ALLY_SPAWN_INTERVAL, cameraShake: null,
            specialEnemyState: { ...INITIAL_SPECIAL_ENEMY_SPAWN_STATE },
            comboTimer: 0, airstrikeAvailable: false, airstrikeActive: false, airstrikesPending: 0, airstrikeSpawnTimer: 0, // GameState level airstrike reset
            pendingInitialSpawns: 0, initialSpawnTickCounter: 0, 
            logs: newLogsForRun, 
            gameOverPendingTimer: 0, // Reset timer
            waveTitleText: '', waveTitleTimer: 0, // Reset wave title
        };
    });
  }, []);

  useEffect(() => {
    if (gameState.gameStatus === 'INIT_NEW_RUN') {
      lastTickTimeRef.current = performance.now();
      startNewRound(gameState.player, 1, gameState);
    }
  }, [gameState.gameStatus, gameState.player, gameState, startNewRound]);


  const restartFromGameOver = useCallback(() => {
    setGameState(prev => {
        const playerStateForShop = {
            ...prev.player, 
            health: prev.player.maxHealth, 
            allies: [], 
            pathHistory: [],
            comboCount: 0, playerHitTimer: 0,
            x: Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(WORLD_AREA.width / 2 - PLAYER_SIZE.width / 2, WORLD_AREA.width - PLAYER_SIZE.width - PLAYER_WORLD_EDGE_MARGIN)),
            y: Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(WORLD_AREA.height / 2 - PLAYER_SIZE.height / 2, WORLD_AREA.height - PLAYER_SIZE.height - PLAYER_WORLD_EDGE_MARGIN)),
            lastShootingDirection: { x: 1, y: 0 },
             airstrikeAvailable: false, airstrikeActive: false, airstrikesPending: 0, airstrikeSpawnTimer: 0, // Reset airstrike for shop
        };

        if (playerStateForShop.championType === undefined && playerStateForShop.clipSize) { 
            playerStateForShop.ammoLeftInClip = playerStateForShop.clipSize;
            playerStateForShop.currentReloadTimer = 0;
        }
        return {
            ...prev, gameStatus: 'SHOP', 
            player: playerStateForShop, 
            enemies: [], projectiles: [], currentWaveEnemies: 0, cameraShake: null,
            specialEnemyState: { ...INITIAL_SPECIAL_ENEMY_SPAWN_STATE },
            comboTimer: 0, airstrikeAvailable: false, airstrikeActive: false, airstrikesPending: 0, airstrikeSpawnTimer: 0, // GameState level airstrike reset
            pendingInitialSpawns: 0, initialSpawnTickCounter: 0, 
            gameOverPendingTimer: 0, // Reset timer
            waveTitleText: '', waveTitleTimer: 0, // Reset wave title
        };
    });
  }, []);

  const goToMenu = useCallback(() => {
    setGameState(prev => {
        const touchDevice = typeof window !== 'undefined' && (('ontouchstart'in window) || navigator.maxTouchPoints > 0);
        return getInitialGameState(prev.gameArea, touchDevice);
    });
  }, []);

  const resetGameData = useCallback(() => { 
    setGameState(prev => {
        const touchDevice = typeof window !== 'undefined' && (('ontouchstart'in window) || navigator.maxTouchPoints > 0);
        return getInitialGameState(prev.gameArea, touchDevice); 
    });
  }, []);

  const togglePause = useCallback(() => {
    setGameState(prev => {
      if (prev.gameStatus === 'PLAYING') return { ...prev, gameStatus: 'PAUSED' };
      else if (prev.gameStatus === 'PAUSED') { lastTickTimeRef.current = performance.now(); return { ...prev, gameStatus: 'PLAYING' }; }
      return prev;
    });
  }, []);

  const startTutorialMode = useCallback(() => {
    setGameState(prev => {
        const tutorialPlayer: Player = {
            ...INITIAL_PLAYER_STATE,
            x: WORLD_AREA.width / 2 - PLAYER_SIZE.width / 2,
            y: WORLD_AREA.height / 2 - PLAYER_SIZE.height / 2,
            health: PLAYER_INITIAL_HEALTH,
            maxHealth: PLAYER_INITIAL_HEALTH,
            championType: undefined, // Default Gun Guy for tutorial
            shootCooldown: GUN_GUY_SHOT_INTERVAL, clipSize: GUN_GUY_CLIP_SIZE,
            ammoLeftInClip: GUN_GUY_CLIP_SIZE, reloadDuration: GUN_GUY_RELOAD_TIME, currentReloadTimer: 0,
            allies: [], coins: 0,
            airstrikeAvailable: false, airstrikeActive: false, airstrikesPending: 0, airstrikeSpawnTimer: 0, // Initialize for player
        };
        const camX = Math.max(0, Math.min(tutorialPlayer.x + tutorialPlayer.width / 2 - prev.gameArea.width / 2, WORLD_AREA.width - prev.gameArea.width));
        const camY = Math.max(0, Math.min(tutorialPlayer.y + tutorialPlayer.height / 2 - prev.gameArea.height / 2, WORLD_AREA.height - prev.gameArea.height));

        return {
            ...getInitialGameState(prev.gameArea, prev.isTouchDevice), // Reset most game state
            gameStatus: 'TUTORIAL_ACTIVE',
            player: tutorialPlayer,
            camera: { x: camX, y: camY },
            tutorialStep: 0,
            tutorialMessages: TUTORIAL_MESSAGES,
            tutorialEntities: { ...INITIAL_TUTORIAL_ENTITIES, step2AllySpawnIndex: 0, step3SpawnTimer: 0, step5SpawnTimer: 0, tutorialHighlightTarget: null },
            enemies: [], coins: [], collectibleAllies: [], projectiles: [],
            round: 0, 
            nextAllySpawnTimer: 99999, 
        };
    });
  }, []);

  const advanceTutorialStep = useCallback(() => {
    setGameState(prev => {
        if (prev.gameStatus !== 'TUTORIAL_ACTIVE') return prev;
        const nextStep = prev.tutorialStep + 1;
        if (nextStep >= prev.tutorialMessages.length) {
            const touchDevice = typeof window !== 'undefined' && (('ontouchstart'in window) || navigator.maxTouchPoints > 0);
            return getInitialGameState(prev.gameArea, touchDevice);
        }

        let newTutorialEntities: TutorialEntities = { 
            enemies: [], coins: [], collectibleAllies: [],
            step2AllySpawnIndex: prev.tutorialEntities.step2AllySpawnIndex, 
            step3SpawnTimer: 0, 
            step5SpawnTimer: 0, // For airstrike step (now step 8)
            tutorialHighlightTarget: null,
        };
        let updatedPlayer = { ...prev.player };

        if (nextStep === 1) { 
            const invulnerableHealth = 999999;
            const dummy1 = createNewEnemy(0, prev.worldArea, EnemyType.TUTORIAL_DUMMY);
            dummy1.x = prev.player.x + 120; dummy1.y = prev.player.y - 30;
            dummy1.health = invulnerableHealth; dummy1.maxHealth = invulnerableHealth;
            newTutorialEntities.enemies.push(dummy1);

            const dummy2 = createNewEnemy(0, prev.worldArea, EnemyType.TUTORIAL_DUMMY);
            dummy2.x = prev.player.x - 180; dummy2.y = prev.player.y + 60;
            dummy2.health = invulnerableHealth; dummy2.maxHealth = invulnerableHealth;
            newTutorialEntities.enemies.push(dummy2);
        } else if (nextStep === 2) { 
            newTutorialEntities.step2AllySpawnIndex = 0; 
            if (TUTORIAL_ALLY_SPAWN_ORDER.length > 0) {
                const firstAllyType = TUTORIAL_ALLY_SPAWN_ORDER[0];
                const collectible = createCollectibleAlly(firstAllyType, prev.player, [], prev.worldArea, true);
                if (collectible) newTutorialEntities.collectibleAllies.push(collectible);
            }
        } else if (nextStep === 3) { // Coin collection step
            newTutorialEntities.step3SpawnTimer = TUTORIAL_STEP_3_ENEMY_SPAWN_INTERVAL;
        } else if (nextStep === 4) { // HUD - Health
            newTutorialEntities.tutorialHighlightTarget = 'health';
        } else if (nextStep === 5) { // HUD - Wave
            newTutorialEntities.tutorialHighlightTarget = 'wave';
        } else if (nextStep === 6) { // HUD - Coins
            newTutorialEntities.tutorialHighlightTarget = 'coins';
        } else if (nextStep === 7) { // HUD - Ally Timer
            newTutorialEntities.tutorialHighlightTarget = 'allyTimer';
        } else if (nextStep === 8) { // Airstrike step (was step 5)
            updatedPlayer.allies = []; // Clear allies for airstrike step
            updatedPlayer.airstrikeAvailable = true;
            updatedPlayer.airstrikeActive = false;
            updatedPlayer.airstrikesPending = 0;
            updatedPlayer.airstrikeSpawnTimer = 0;
            newTutorialEntities.step5SpawnTimer = TUTORIAL_STEP_5_ENEMY_SPAWN_INTERVAL; // Uses step5SpawnTimer constant for step 8
        } else if (nextStep === 9) { // Last step (Tutorial Complete)
            updatedPlayer.airstrikeAvailable = false; // Ensure no "Airstrike Ready"
            updatedPlayer.airstrikeActive = false;
            newTutorialEntities.tutorialHighlightTarget = null; // Clear any HUD highlight
            // Entities are already cleared by default reset of newTutorialEntities
            newTutorialEntities.enemies = [];
            newTutorialEntities.coins = [];
            newTutorialEntities.collectibleAllies = [];
        }
        
        // Ensure highlight is cleared if not a specific HUD step and not the last step (already handled for last step)
        if (![4, 5, 6, 7].includes(nextStep) && nextStep !== 9) {
            newTutorialEntities.tutorialHighlightTarget = null;
        }


        return {
            ...prev,
            tutorialStep: nextStep,
            tutorialEntities: newTutorialEntities,
            player: updatedPlayer,
            projectiles: [], // Clear projectiles between steps
        };
    });
  }, []);

  const endTutorialMode = useCallback(() => {
     setGameState(prev => {
        const touchDevice = typeof window !== 'undefined' && (('ontouchstart'in window) || navigator.maxTouchPoints > 0);
        return getInitialGameState(prev.gameArea, touchDevice);
    });
  }, []);


  useEffect(() => {
    function actualLoop() {
      if (gameState.gameStatus === 'PLAYING' || gameState.gameStatus === 'GAME_OVER_PENDING') {
        gameTick();
      } else if (gameState.gameStatus === 'TUTORIAL_ACTIVE') {
        gameTickTutorial(); 
      }
      
      if (gameLoopRef.current && ['PLAYING', 'PAUSED', 'GAME_OVER_PENDING', 'TUTORIAL_ACTIVE'].includes(gameState.gameStatus)) {
         gameLoopRef.current = requestAnimationFrame(actualLoop);
      } else if (gameLoopRef.current) { 
        cancelAnimationFrame(gameLoopRef.current); gameLoopRef.current = null; 
      }
    }
    if (['PLAYING', 'PAUSED', 'GAME_OVER_PENDING', 'TUTORIAL_ACTIVE'].includes(gameState.gameStatus)) {
      if (!gameLoopRef.current) { lastTickTimeRef.current = performance.now(); gameLoopRef.current = requestAnimationFrame(actualLoop); }
    } else {
      if (gameLoopRef.current) { cancelAnimationFrame(gameLoopRef.current); gameLoopRef.current = null; }
    }
    return () => { if (gameLoopRef.current) { cancelAnimationFrame(gameLoopRef.current); gameLoopRef.current = null; } };
  }, [gameState.gameStatus, gameTick, gameTickTutorial]); 

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'p' && gameState.gameStatus !== 'GAME_OVER_PENDING' && gameState.gameStatus !== 'TUTORIAL_ACTIVE') { 
        e.preventDefault();
        togglePause();
      } else if (key === 'q') {
         // Allow Q to activate airstrike in playing mode OR tutorial step 8
        if ( (gameState.airstrikeAvailable && !gameState.airstrikeActive && gameState.gameStatus === 'PLAYING') ||
             (gameState.player.airstrikeAvailable && !gameState.player.airstrikeActive && gameState.gameStatus === 'TUTORIAL_ACTIVE' && gameState.tutorialStep === 8) ) { // Updated to step 8
          e.preventDefault();
          activateAirstrike();
        }
      } else {
        setGameState(prev => ({ ...prev, keysPressed: { ...prev.keysPressed, [key]: true } }));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!['p', 'q'].includes(key)) { 
        setGameState(prev => ({ ...prev, keysPressed: { ...prev.keysPressed, [key]: false } }));
      }
    };
    const updateMousePosition = (clientX: number, clientY: number) => {
        if (gameAreaRef.current) {
            const rect = gameAreaRef.current.getBoundingClientRect();
            const xInElement = clientX - rect.left; const yInElement = clientY - rect.top;
            if (xInElement >= 0 && xInElement <= rect.width && yInElement >= 0 && yInElement <= rect.height) {
                 setGameState(prev => ({ ...prev, mousePosition: { x: xInElement, y: yInElement }}));
            } else setGameState(prev => ({ ...prev, mousePosition: null }));
        }
    };
    const handleMouseMove = (e: MouseEvent) => { if (!gameState.isTouchDevice) updateMousePosition(e.clientX, e.clientY); };
    const handleMouseEnter = (e: MouseEvent) => { if (!gameState.isTouchDevice) updateMousePosition(e.clientX, e.clientY); };
    const handleMouseOut = () => { if (!gameState.isTouchDevice) setGameState(prev => ({ ...prev, mousePosition: null })); };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    const currentContentElement = gameAreaRef.current;
    if (currentContentElement && !gameState.isTouchDevice) {
        currentContentElement.addEventListener('mousemove', handleMouseMove);
        currentContentElement.addEventListener('mouseenter', handleMouseEnter);
        currentContentElement.addEventListener('mouseout', handleMouseOut);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (currentContentElement && !gameState.isTouchDevice) {
        currentContentElement.removeEventListener('mousemove', handleMouseMove);
        currentContentElement.removeEventListener('mouseenter', handleMouseEnter);
        currentContentElement.removeEventListener('mouseout', handleMouseOut);
      }
    };
  }, [gameState.gameStatus, gameState.airstrikeAvailable, gameState.airstrikeActive, gameState.player.airstrikeAvailable, gameState.player.airstrikeActive, gameState.tutorialStep, togglePause, activateAirstrike, gameState.isTouchDevice, gameState.gameArea]);

  return {
    gameState, gameAreaRef, startGame, confirmChampionSelection, purchaseUpgrade, playNewRunFromShop,
    goToMenu, resetGameData, restartFromGameOver, togglePause, handleJoystickMove, handleJoystickRelease, updateGameAreaSize,
    activateAirstrike, startTutorialMode, advanceTutorialStep, endTutorialMode, 
  };
};
