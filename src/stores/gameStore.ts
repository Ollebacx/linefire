/**
 * gameStore — Zustand
 *
 * Single source of truth for all game state.
 * Systems are pure functions called here; the store dispatches side effects
 * and updates state immutably.
 */
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { GameState, Player, Ally, Size, Position, Upgrade, ShieldZone } from '../types';
import { AllyType, EnemyType, UpgradeType, WeaponType } from '../types';

// Import constants
import { WORLD_AREA, PLAYER_WORLD_EDGE_MARGIN } from '../constants/world';
import {
  PLAYER_INITIAL_GOLD, PLAYER_INITIAL_HEALTH, PLAYER_SIZE,
  GUN_GUY_CLIP_SIZE, GUN_GUY_SHOT_INTERVAL, GUN_GUY_RELOAD_TIME,
  PLAYER_INITIAL_DAMAGE, PLAYER_INITIAL_RANGE,
  SHIELD_ZONE_DEFAULT_DURATION, SHIELD_ZONE_DEFAULT_RADIUS, SHIELD_ZONE_ABILITY_BASE_COOLDOWN,
  SHIELD_ZONE_OPACITY_PULSE_MIN,
  CHAIN_LIGHTNING_BASE_TARGETS, CHAIN_LIGHTNING_BASE_RANGE, CHAIN_LIGHTNING_BASE_DAMAGE_MULTIPLIER,
  AIRSTRIKE_MISSILE_COUNT,
} from '../constants/player';
import { ALLY_SPAWN_INTERVAL } from '../constants/ally';
import { WEAPON_DROP_SPAWN_TIMER } from '../constants/player';
import { ROUND_BASE_ENEMY_COUNT, INITIAL_SPECIAL_ENEMY_SPAWN_STATE, WAVE_TITLE_STAY_DURATION_TICKS, WAVE_TITLE_FADE_OUT_DURATION_TICKS } from '../constants/enemy';
import { UI_STROKE_PRIMARY } from '../constants/ui';
import {
  TUTORIAL_MESSAGES, INITIAL_TUTORIAL_ENTITIES,
} from '../constants/tutorial';
import { INITIAL_PLAYER_STATE, INITIAL_UPGRADES, INITIAL_LOG_DEFINITIONS } from '../constants';

// Systems
import { createEnemy, createCollectibleAlly, determineNextEnemyType } from '../systems/SpawnSystem';
import { addAllyToPlayer as addAllyFactory } from '../entities/createAlly';
import { GAME_OVER_PENDING_DURATION_TICKS, totalEnemiesForRound, INITIAL_SPAWN_INTERVAL_TICKS } from '../systems/WaveSystem';
import { AudioSystem } from '../systems/AudioSystem';

// ─── Store interface ──────────────────────────────────────────────────────────
export interface GameStore extends GameState {
  // ── Input
  joystickDirection: Position;

  // ── Actions
  updateGameAreaSize: (size: Size) => void;
  setJoystickDirection: (dir: Position) => void;

  startGame: () => void;
  confirmChampionSelection: (id: AllyType | 'GUN_GUY') => void;
  purchaseUpgrade: (upgrade: Upgrade) => void;
  playNewRunFromShop: () => void;
  restartFromGameOver: () => void;
  goToMenu: () => void;
  togglePause: () => void;
  activateAirstrike: () => void;
  deployShieldZone: () => void;

  startTutorialMode: () => void;
  advanceTutorialStep: () => void;
  endTutorialMode: () => void;

  startNewRound: (player: Player, round: number) => void;

  // Game tick entry points (called by GameLoop)
  applyTickResult: (partial: Partial<GameState>) => void;

  // Keyboard / mouse
  setKeyDown: (key: string) => void;
  setKeyUp: (key: string) => void;
  setMousePosition: (pos: Position | null) => void;

  setControlScheme: (scheme: 'keyboard' | 'mouse') => void;

  // Dev helper
  maxOutAllUpgrades: () => void;
  clearMetaProgress: () => void;
}

// ─── Meta-progress persistence ──────────────────────────────────────────────
const META_KEY = 'linefire_meta';
const META_VERSION = 1;

interface MetaProgress {
  version: number;
  upgradeLevels: Record<string, number>;
  unlockedAllyTypes: AllyType[];
}

// In-memory cache — avoids repeated JSON.parse on every buildInitialState call
let _metaCache: MetaProgress | null | undefined = undefined; // undefined = not yet loaded

function loadMeta(): MetaProgress | null {
  if (_metaCache !== undefined) return _metaCache;
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) { _metaCache = null; return null; }
    const parsed = JSON.parse(raw) as MetaProgress;
    // Invalidate cache if saved with an older schema version
    _metaCache = (parsed.version === META_VERSION) ? parsed : null;
    return _metaCache;
  } catch {
    _metaCache = null;
    return null;
  }
}

let _saveMetaTimer: ReturnType<typeof setTimeout> | null = null;

export function saveMeta(upgrades: { id: string; currentLevel: number }[], unlocked: AllyType[]): void {
  const meta: MetaProgress = {
    version: META_VERSION,
    upgradeLevels: Object.fromEntries(upgrades.map(u => [u.id, u.currentLevel])),
    unlockedAllyTypes: unlocked,
  };
  // Update in-memory cache immediately so subsequent reads are consistent
  _metaCache = meta;
  // Defer the actual localStorage write off the main-thread critical path
  if (_saveMetaTimer !== null) clearTimeout(_saveMetaTimer);
  _saveMetaTimer = setTimeout(() => {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
    _saveMetaTimer = null;
  }, 0);
}

export function clearMeta(): void {
  _metaCache = null;
  if (_saveMetaTimer !== null) { clearTimeout(_saveMetaTimer); _saveMetaTimer = null; }
  localStorage.removeItem(META_KEY);
}

// ─── Initial state factory ────────────────────────────────────────────────────
function buildInitialState(gameArea: Size, isTouchDevice: boolean, controlScheme?: 'keyboard' | 'mouse'): GameState {
  let player: Player = {
    ...INITIAL_PLAYER_STATE,
    allies: [],
    championType: undefined,
    pathHistory: [],
    color: UI_STROKE_PRIMARY,
    lastShootingDirection: { x: 1, y: 0 },
    initialAllyBonus: 0,
    comboCount: 0,
    currentRunKills: 0,
    currentRunTanksDestroyed: 0,
    currentRunGoldEarned: PLAYER_INITIAL_GOLD,
    kills: 0,
    highestComboCount: 0,
    maxSquadSizeAchieved: 0,
    playerHitTimer: 0,
    highestRoundAchievedThisRun: 0,
    airstrikeAvailable: false,
    airstrikeActive: false,
    airstrikesPending: 0,
    airstrikeSpawnTimer: 0,
    shieldAbilityTimer: 0,
    currentChainLevel: 0,
    allyHealthBonus: 0,
  };

  // ── Restore meta-progress (upgrades persist across sessions) ────────────────
  let upgrades = INITIAL_UPGRADES.map(u => ({ ...u, cost: u.baseCost, currentLevel: 0 }));
  let unlockedAllyTypes: AllyType[] = [AllyType.SHOTGUN, AllyType.RIFLEMAN, AllyType.GUN_GUY];
  const meta = typeof localStorage !== 'undefined' ? loadMeta() : null;
  if (meta) {
    upgrades = upgrades.map(u => {
      const savedLevel = meta.upgradeLevels[u.id as string] ?? 0;
      if (savedLevel === 0) return u;
      const def = INITIAL_UPGRADES.find(d => d.id === u.id)!;
      for (let i = 0; i < savedLevel; i++) {
        const result = def.apply(player, 0);
        player = { ...result.player, gold: player.gold };
      }
      const cost = Math.floor(u.baseCost * Math.pow(u.costScalingFactor, savedLevel));
      return { ...u, currentLevel: savedLevel, cost };
    });
    if (meta.unlockedAllyTypes.length > 0) unlockedAllyTypes = meta.unlockedAllyTypes;
  }

  const cam: Position = {
    x: Math.max(0, Math.min(player.x + player.width / 2 - gameArea.width / 2, WORLD_AREA.width - gameArea.width)),
    y: Math.max(0, Math.min(player.y + player.height / 2 - gameArea.height / 2, WORLD_AREA.height - gameArea.height)),
  };

  return {
    player,
    enemies: [],
    projectiles: [],
    goldPiles: [],
    collectibleAllies: [],
    scenery: [],
    damageTexts: [],
    muzzleFlashes: [],
    effectParticles: [],
    shieldZones: [],
    chainLightningEffects: [],
    round: 1,
    gameStatus: 'IDLE',
    currentWaveEnemies: 0,
    totalEnemiesThisRound: ROUND_BASE_ENEMY_COUNT,
    gameArea,
    worldArea: WORLD_AREA,
    camera: cam,
    availableUpgrades: upgrades,
    keysPressed: {},
    mousePosition: null,
    nextRoundTimer: 0,
    nextAllySpawnTimer: ALLY_SPAWN_INTERVAL,
    nextAllyType: null,
    unlockedAllyTypes,
    cameraShake: null,
    isTouchDevice,
    controlScheme: controlScheme ?? 'keyboard',
    specialEnemyState: { ...INITIAL_SPECIAL_ENEMY_SPAWN_STATE },
    comboTimer: 0,
    airstrikeAvailable: false,
    airstrikeActive: false,
    airstrikesPending: 0,
    airstrikeSpawnTimer: 0,
    pendingInitialSpawns: 0,
    initialSpawnTickCounter: 0,
    logs: INITIAL_LOG_DEFINITIONS.map(d => ({ id: d.id, name: d.name, description: d.description, icon: d.icon, isUnlocked: false })),
    gameOverPendingTimer: 0,
    waveTitleText: '',
    waveTitleTimer: 0,
    weaponDrops: [],
    weaponDropSpawnTimer: WEAPON_DROP_SPAWN_TIMER,
    tutorialStep: 0,
    tutorialMessages: TUTORIAL_MESSAGES,
    tutorialEntities: { ...INITIAL_TUTORIAL_ENTITIES, tutorialHighlightTarget: null, muzzleFlashes: [], effectParticles: [] },
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useGameStore = create<GameStore>((set, get) => ({
  ...buildInitialState(
    { width: window.innerWidth, height: window.innerHeight },
    typeof window !== 'undefined' && (('ontouchstart' in window) || navigator.maxTouchPoints > 0),
    typeof localStorage !== 'undefined' ? (localStorage.getItem('linefire_control_scheme') as 'keyboard' | 'mouse' | null) ?? 'keyboard' : 'keyboard',
  ),
  joystickDirection: { x: 0, y: 0 },

  // ── Layout
  updateGameAreaSize: (size) => set(s => ({
    gameArea: { width: Math.floor(size.width), height: Math.floor(size.height) },
    isTouchDevice: s.isTouchDevice ?? (typeof window !== 'undefined' && (('ontouchstart' in window) || navigator.maxTouchPoints > 0)),
    camera: {
      x: Math.max(0, Math.min(s.camera.x, WORLD_AREA.width - Math.floor(size.width))),
      y: Math.max(0, Math.min(s.camera.y, WORLD_AREA.height - Math.floor(size.height))),
    },
  })),

  // ── Input
  setJoystickDirection: (dir) => set({ joystickDirection: dir }),
  setKeyDown: (key) => set(s => ({ keysPressed: { ...s.keysPressed, [key]: true } })),
  setKeyUp:   (key) => set(s => ({ keysPressed: { ...s.keysPressed, [key]: false } })),
  setMousePosition: (pos) => set({ mousePosition: pos }),

  // ── Tick result patch (called by GameLoop after systems run)
  applyTickResult: (partial) => set(s => {
    let extraGold = 0;
    if (partial.logs) {
      partial.logs.forEach((newLog, i) => {
        const oldLog = s.logs[i];
        if (newLog.isUnlocked && !oldLog?.isUnlocked) {
          const def = INITIAL_LOG_DEFINITIONS.find(d => d.id === newLog.id);
          if (def?.rewardGold) extraGold += def.rewardGold;
        }
      });
    }
    if (extraGold > 0 && partial.player) {
      partial = {
        ...partial,
        player: {
          ...partial.player,
          gold: (partial.player.gold ?? s.player.gold) + extraGold,
          currentRunGoldEarned: (partial.player.currentRunGoldEarned ?? s.player.currentRunGoldEarned) + extraGold,
        },
      };
    }
    return { ...s, ...partial };
  }),

  // ── Start new round ────────────────────────────────────────────────────────
  startNewRound: (player, roundNumber) => set(s => {
    const total = totalEnemiesForRound(roundNumber);
    const initial = 5;
    const freshSpecialState = { ...INITIAL_SPECIAL_ENEMY_SPAWN_STATE }; // reset BEFORE spawning
    const isBossRound = roundNumber >= 5 && roundNumber % 5 === 0;
    const initialEnemies = [];
    for (let i = 0; i < initial; i++) {
      const type = determineNextEnemyType(roundNumber, initialEnemies, freshSpecialState);
      if (type) initialEnemies.push(createEnemy(roundNumber, s.worldArea, type));
    }
    const gradual = Math.max(0, total - initial);
    return {
      ...s,
      gameStatus: 'PLAYING',
      player: { ...player, playerHitTimer: 0, pathHistory: [] },
      round: roundNumber,
      enemies: initialEnemies,
      projectiles: [],
      muzzleFlashes: [],
      effectParticles: [],
      shieldZones: [],
      chainLightningEffects: [],
      currentWaveEnemies: 0,
      totalEnemiesThisRound: total,
      nextRoundTimer: 0,
      cameraShake: null,
      specialEnemyState: freshSpecialState,
      airstrikeActive: false,
      airstrikesPending: 0,
      pendingInitialSpawns: gradual,
      initialSpawnTickCounter: gradual > 0 ? INITIAL_SPAWN_INTERVAL_TICKS : 0,
      waveTitleText: isBossRound ? `!! BOSS WAVE — Round ${roundNumber} !!` : `Wave ${roundNumber}`,
      waveTitleTimer: WAVE_TITLE_STAY_DURATION_TICKS + WAVE_TITLE_FADE_OUT_DURATION_TICKS,
      damageTexts: [],
      nextAllyType: s.unlockedAllyTypes.length > 0
        ? s.unlockedAllyTypes[Math.floor(Math.random() * s.unlockedAllyTypes.length)]
        : null,
    };
  }),

  // ── Start game (→ SHOP) ───────────────────────────────────────────────────
  startGame: () => get().confirmChampionSelection('GUN_GUY'),

  confirmChampionSelection: (choiceId) => set(s => {
    const base = INITIAL_PLAYER_STATE;
    const newPlayer: Player = {
      ...base,
      globalDamageModifier:     s.player.globalDamageModifier,
      globalFireRateModifier:   s.player.globalFireRateModifier,
      airstrikeMissileCountBonus: s.player.airstrikeMissileCountBonus,
      airstrikeDamageModifier:  s.player.airstrikeDamageModifier,
      airstrikeAoeModifier:     s.player.airstrikeAoeModifier,
      projectileSpeedModifier:  s.player.projectileSpeedModifier,
      piercingRoundsLevel:      s.player.piercingRoundsLevel,
      shieldAbilityUnlocked:    s.player.shieldAbilityUnlocked,
      shieldAbilityCooldown:    s.player.shieldAbilityCooldown,
      shieldZoneBaseDuration:   s.player.shieldZoneBaseDuration,
      shieldZoneBaseRadius:     s.player.shieldZoneBaseRadius,
      chainLightningChance:     s.player.chainLightningChance,
      maxChainTargets:          s.player.maxChainTargets,
      chainRange:               s.player.chainRange,
      chainDamageMultiplier:    s.player.chainDamageMultiplier,
      currentChainLevel:        s.player.currentChainLevel,
      allyHealthBonus:          s.player.allyHealthBonus,
      gold:                     s.player.gold,
      kills:                    s.player.kills,
      maxHealth:                s.player.maxHealth,
      health:                   s.player.maxHealth,
      speed:                    s.player.speed,
      coinMagnetRange:          s.player.coinMagnetRange,
      squadSpacingMultiplier:   s.player.squadSpacingMultiplier,
      initialAllyBonus:         s.player.initialAllyBonus,
      currentRunGoldEarned:     PLAYER_INITIAL_GOLD,
      allies: [], pathHistory: [], color: UI_STROKE_PRIMARY, lastShootingDirection: { x: 1, y: 0 },
      comboCount: 0, playerHitTimer: 0,
      currentRunKills: 0, currentRunTanksDestroyed: 0,
      highestComboCount: 0, maxSquadSizeAchieved: 0, highestRoundAchievedThisRun: 0,
      airstrikeAvailable: false, airstrikeActive: false, airstrikesPending: 0, airstrikeSpawnTimer: 0,
      shieldAbilityTimer: 0, championType: undefined,
      clipSize: base.clipSize, ammoLeftInClip: base.clipSize, reloadDuration: base.reloadDuration,
      currentReloadTimer: 0, shootCooldown: base.shootCooldown, damage: base.damage, range: base.range,
      x: Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(base.x, WORLD_AREA.width - base.width - PLAYER_WORLD_EDGE_MARGIN)),
      y: Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(base.y, WORLD_AREA.height - base.height - PLAYER_WORLD_EDGE_MARGIN)),
    };
    const camX = Math.max(0, Math.min(newPlayer.x + newPlayer.width / 2 - s.gameArea.width / 2, WORLD_AREA.width - s.gameArea.width));
    const camY = Math.max(0, Math.min(newPlayer.y + newPlayer.height / 2 - s.gameArea.height / 2, WORLD_AREA.height - s.gameArea.height));
    return {
      ...s, player: newPlayer, gameStatus: 'SHOP', round: 1,
      camera: { x: camX, y: camY },
      enemies: [], projectiles: [], goldPiles: [], collectibleAllies: [],
      shieldZones: [], chainLightningEffects: [],
      currentWaveEnemies: 0, totalEnemiesThisRound: ROUND_BASE_ENEMY_COUNT,
      nextAllySpawnTimer: ALLY_SPAWN_INTERVAL, cameraShake: null,
      specialEnemyState: { ...INITIAL_SPECIAL_ENEMY_SPAWN_STATE },
      comboTimer: 0, airstrikeAvailable: false, airstrikeActive: false, airstrikesPending: 0, airstrikeSpawnTimer: 0,
      pendingInitialSpawns: 0, initialSpawnTickCounter: 0,
      logs: s.logs.map(l => ({ ...l, isUnlocked: false })),
      gameOverPendingTimer: 0, waveTitleText: '', waveTitleTimer: 0,
      weaponDrops: [], weaponDropSpawnTimer: WEAPON_DROP_SPAWN_TIMER,
      damageTexts: [], muzzleFlashes: [], effectParticles: [],
    };
  }),

  // ── Purchase upgrade ──────────────────────────────────────────────────────
  purchaseUpgrade: (upgrade) => set(s => {
    if (s.player.gold < upgrade.cost || upgrade.currentLevel >= upgrade.maxLevel) return s;
    const shieldSubs = [UpgradeType.SHIELD_DURATION, UpgradeType.SHIELD_RADIUS, UpgradeType.SHIELD_COOLDOWN_REDUCTION];
    if (shieldSubs.includes(upgrade.id) && !s.player.shieldAbilityUnlocked) return s;

    const { player: newPlayer, updatedGameState } = upgrade.apply(s.player, upgrade.cost, s);
    let newUnlocked = [...s.unlockedAllyTypes];
    if (upgrade.id === UpgradeType.UNLOCK_SNIPER_ALLY   && !newUnlocked.includes(AllyType.SNIPER))      newUnlocked.push(AllyType.SNIPER);
    if (upgrade.id === UpgradeType.UNLOCK_RPG_ALLY      && !newUnlocked.includes(AllyType.RPG_SOLDIER)) newUnlocked.push(AllyType.RPG_SOLDIER);
    if (upgrade.id === UpgradeType.UNLOCK_FLAMER_ALLY   && !newUnlocked.includes(AllyType.FLAMER))      newUnlocked.push(AllyType.FLAMER);
    if (upgrade.id === UpgradeType.UNLOCK_MINIGUNNER_ALLY && !newUnlocked.includes(AllyType.MINIGUNNER))  newUnlocked.push(AllyType.MINIGUNNER);

    const newUpgrades = s.availableUpgrades.map(u =>
      u.id === upgrade.id
        ? { ...u, currentLevel: u.currentLevel + 1, cost: Math.floor(u.baseCost * Math.pow(u.costScalingFactor, u.currentLevel + 1)) }
        : u,
    );
    saveMeta(newUpgrades, newUnlocked);
    return { ...s, player: newPlayer, availableUpgrades: newUpgrades, unlockedAllyTypes: newUnlocked, ...(updatedGameState ?? {}) };
  }),

  // ── Play new run from shop ────────────────────────────────────────────────
  playNewRunFromShop: () => set(s => {
    const p = s.player;
    const runPlayer: Player = {
      ...p,
      health: p.maxHealth,
      x: Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(WORLD_AREA.width / 2 - PLAYER_SIZE.width / 2, WORLD_AREA.width - PLAYER_SIZE.width - PLAYER_WORLD_EDGE_MARGIN)),
      y: Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(WORLD_AREA.height / 2 - PLAYER_SIZE.height / 2, WORLD_AREA.height - PLAYER_SIZE.height - PLAYER_WORLD_EDGE_MARGIN)),
      allies: [], pathHistory: [], shootTimer: 0,
      currentRunKills: 0, currentRunTanksDestroyed: 0, currentRunGoldEarned: PLAYER_INITIAL_GOLD,
      highestComboCount: 0, maxSquadSizeAchieved: 1,
      highestRoundAchievedThisRun: 0, comboCount: 0, playerHitTimer: 0,
      lastShootingDirection: { x: 1, y: 0 },
      airstrikeAvailable: false, airstrikeActive: false, airstrikesPending: 0, airstrikeSpawnTimer: 0,
      shieldAbilityTimer: 0, championType: undefined,
      equippedWeapon: WeaponType.PISTOL, weaponTimer: 0, weaponBaseSnapshot: undefined,
      clipSize: p.clipSize || GUN_GUY_CLIP_SIZE,
      ammoLeftInClip: p.clipSize || GUN_GUY_CLIP_SIZE,
      reloadDuration: p.reloadDuration || GUN_GUY_RELOAD_TIME,
      currentReloadTimer: 0,
    };
    if (runPlayer.initialAllyBonus) {
      for (let i = 0; i < runPlayer.initialAllyBonus; i++) {
        addAllyFactory(runPlayer, AllyType.RIFLEMAN, 0);
      }
      runPlayer.maxSquadSizeAchieved = Math.max(1, runPlayer.allies.length + 1);
    }
    let initialCollectibles: typeof s.collectibleAllies = [];
    const available = s.unlockedAllyTypes.filter(t => t !== AllyType.GUN_GUY || s.unlockedAllyTypes.length === 1);
    if (available.length > 0) {
      const type = available[Math.floor(Math.random() * available.length)];
      const col = createCollectibleAlly(type, runPlayer, [], s.worldArea);
      if (col) initialCollectibles.push(col);
    }
    const newLogs = s.logs.map(l => ({ ...l, isUnlocked: false }));
    return {
      ...s, gameStatus: 'INIT_NEW_RUN', player: runPlayer, round: 1,
      enemies: [], projectiles: [], goldPiles: [], collectibleAllies: initialCollectibles,
      nextAllySpawnTimer: ALLY_SPAWN_INTERVAL, cameraShake: null,
      shieldZones: [], chainLightningEffects: [],
      specialEnemyState: { ...INITIAL_SPECIAL_ENEMY_SPAWN_STATE },
      comboTimer: 0, airstrikeAvailable: false, airstrikeActive: false, airstrikesPending: 0, airstrikeSpawnTimer: 0,
      pendingInitialSpawns: 0, initialSpawnTickCounter: 0, logs: newLogs,
      gameOverPendingTimer: 0, waveTitleText: '', waveTitleTimer: 0,
      weaponDrops: [], weaponDropSpawnTimer: WEAPON_DROP_SPAWN_TIMER,
      damageTexts: [], muzzleFlashes: [], effectParticles: [],
      keysPressed: {}, joystickDirection: { x: 0, y: 0 }, mousePosition: null,
    };
  }),

  // ── Restart from game over ────────────────────────────────────────────────
  restartFromGameOver: () => set(s => {
    const p = s.player;
    return {
      ...s, gameStatus: 'SHOP',
      player: {
        ...p, health: p.maxHealth, allies: [], pathHistory: [], comboCount: 0, playerHitTimer: 0,
        x: Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(WORLD_AREA.width / 2 - PLAYER_SIZE.width / 2, WORLD_AREA.width - PLAYER_SIZE.width - PLAYER_WORLD_EDGE_MARGIN)),
        y: Math.max(PLAYER_WORLD_EDGE_MARGIN, Math.min(WORLD_AREA.height / 2 - PLAYER_SIZE.height / 2, WORLD_AREA.height - PLAYER_SIZE.height - PLAYER_WORLD_EDGE_MARGIN)),
        lastShootingDirection: { x: 1, y: 0 },
        airstrikeAvailable: false, airstrikeActive: false, airstrikesPending: 0, airstrikeSpawnTimer: 0,
        shieldAbilityTimer: 0, championType: undefined,
        equippedWeapon: WeaponType.PISTOL, weaponTimer: 0, weaponBaseSnapshot: undefined,
        clipSize: p.clipSize || GUN_GUY_CLIP_SIZE, ammoLeftInClip: p.clipSize || GUN_GUY_CLIP_SIZE,
        reloadDuration: p.reloadDuration || GUN_GUY_RELOAD_TIME, currentReloadTimer: 0,
      },
      enemies: [], projectiles: [], goldPiles: [], currentWaveEnemies: 0, cameraShake: null,
      shieldZones: [], chainLightningEffects: [],
      specialEnemyState: { ...INITIAL_SPECIAL_ENEMY_SPAWN_STATE },
      comboTimer: 0, pendingInitialSpawns: 0, initialSpawnTickCounter: 0,
      gameOverPendingTimer: 0, waveTitleText: '', waveTitleTimer: 0,
      damageTexts: [], muzzleFlashes: [], effectParticles: [],
      keysPressed: {}, joystickDirection: { x: 0, y: 0 }, mousePosition: null,
    };
  }),

  // ── Go to main menu ───────────────────────────────────────────────────────
  goToMenu: () => set(s => ({
    ...buildInitialState(s.gameArea, s.isTouchDevice ?? false, s.controlScheme),
    joystickDirection: { x: 0, y: 0 },
  })),

  // ── Pause / resume ────────────────────────────────────────────────────────
  togglePause: () => set(s => ({
    gameStatus: s.gameStatus === 'PLAYING' ? 'PAUSED' : s.gameStatus === 'PAUSED' ? 'PLAYING' : s.gameStatus,
  })),

  // ── Airstrike ─────────────────────────────────────────────────────────────
  activateAirstrike: () => set(s => {
    const count = AIRSTRIKE_MISSILE_COUNT + s.player.airstrikeMissileCountBonus;
    if (s.gameStatus === 'PLAYING' && s.airstrikeAvailable && !s.airstrikeActive) {
      return { ...s, player: { ...s.player, comboCount: 0 }, airstrikeAvailable: false, airstrikeActive: true, airstrikesPending: count, airstrikeSpawnTimer: 0 };
    }
    if (s.gameStatus === 'TUTORIAL_ACTIVE' && s.tutorialStep === 8 && s.player.airstrikeAvailable && !s.airstrikeActive) {
      return { ...s,
        player: { ...s.player, comboCount: 0, airstrikeAvailable: false },
        airstrikeAvailable: false, airstrikeActive: true, airstrikesPending: count, airstrikeSpawnTimer: 0,
      };
    }
    return s;
  }),

  // ── Shield zone ───────────────────────────────────────────────────────────
  deployShieldZone: () => set(s => {
    const p = s.player;
    if ((s.gameStatus !== 'PLAYING' && s.gameStatus !== 'TUTORIAL_ACTIVE') || !p.shieldAbilityUnlocked || p.shieldAbilityTimer > 0) return s;
    const shield: ShieldZone = {
      id: uuidv4(),
      x: p.x + p.width / 2 - p.shieldZoneBaseRadius,
      y: p.y + p.height / 2 - p.shieldZoneBaseRadius,
      width: p.shieldZoneBaseRadius * 2, height: p.shieldZoneBaseRadius * 2,
      radius: p.shieldZoneBaseRadius, duration: p.shieldZoneBaseDuration,
      timer: p.shieldZoneBaseDuration, opacity: SHIELD_ZONE_OPACITY_PULSE_MIN,
    };
    AudioSystem.play('shield_activate');
    return { ...s, player: { ...p, shieldAbilityTimer: p.shieldAbilityCooldown }, shieldZones: [...s.shieldZones, shield] };
  }),

  // ── Tutorial ──────────────────────────────────────────────────────────────
  startTutorialMode: () => set(s => {
    const tp: Player = {
      ...INITIAL_PLAYER_STATE,
      x: WORLD_AREA.width / 2 - PLAYER_SIZE.width / 2,
      y: WORLD_AREA.height / 2 - PLAYER_SIZE.height / 2,
      health: PLAYER_INITIAL_HEALTH, maxHealth: PLAYER_INITIAL_HEALTH,
      championType: undefined, allies: [], gold: 0,
      shootCooldown: GUN_GUY_SHOT_INTERVAL, clipSize: GUN_GUY_CLIP_SIZE,
      ammoLeftInClip: GUN_GUY_CLIP_SIZE, reloadDuration: GUN_GUY_RELOAD_TIME, currentReloadTimer: 0,
      airstrikeAvailable: false, airstrikeActive: false, airstrikesPending: 0, airstrikeSpawnTimer: 0,
      shieldAbilityUnlocked: true, shieldAbilityTimer: 0,
      shieldAbilityCooldown: SHIELD_ZONE_ABILITY_BASE_COOLDOWN,
      shieldZoneBaseDuration: SHIELD_ZONE_DEFAULT_DURATION, shieldZoneBaseRadius: SHIELD_ZONE_DEFAULT_RADIUS,
      highestRoundAchievedThisRun: 0, globalDamageModifier: 0, globalFireRateModifier: 1.0,
      airstrikeMissileCountBonus: 0, airstrikeDamageModifier: 0, airstrikeAoeModifier: 0,
      projectileSpeedModifier: 0, piercingRoundsLevel: 0,
      chainLightningChance: 0, maxChainTargets: CHAIN_LIGHTNING_BASE_TARGETS,
      chainRange: CHAIN_LIGHTNING_BASE_RANGE, chainDamageMultiplier: CHAIN_LIGHTNING_BASE_DAMAGE_MULTIPLIER, currentChainLevel: 0,
      pathHistory: [], color: UI_STROKE_PRIMARY, lastShootingDirection: { x: 1, y: 0 },
      comboCount: 0, playerHitTimer: 0, currentRunKills: 0, currentRunTanksDestroyed: 0,
      currentRunGoldEarned: 0, highestComboCount: 0, maxSquadSizeAchieved: 0, kills: 0,
      coinMagnetRange: 40, squadSpacingMultiplier: 1, initialAllyBonus: 0,
      allyHealthBonus: 0,
      equippedWeapon: WeaponType.PISTOL, weaponTimer: 0,
    };
    const camX = Math.max(0, Math.min(tp.x + tp.width / 2 - s.gameArea.width / 2, WORLD_AREA.width - s.gameArea.width));
    const camY = Math.max(0, Math.min(tp.y + tp.height / 2 - s.gameArea.height / 2, WORLD_AREA.height - s.gameArea.height));
    return {
      ...buildInitialState(s.gameArea, s.isTouchDevice ?? false, s.controlScheme),
      gameStatus: 'TUTORIAL_ACTIVE',
      player: tp, camera: { x: camX, y: camY },
      tutorialStep: 0, tutorialMessages: TUTORIAL_MESSAGES,
      tutorialEntities: { ...INITIAL_TUTORIAL_ENTITIES, step2AllySpawnIndex: 0, step3SpawnTimer: 0, step5SpawnTimer: 0, tutorialHighlightTarget: null, muzzleFlashes: [], effectParticles: [] },
      enemies: [], goldPiles: [], collectibleAllies: [], projectiles: [], shieldZones: [], chainLightningEffects: [],
      round: 0, nextAllySpawnTimer: 99999,
      damageTexts: [], muzzleFlashes: [], effectParticles: [],
      availableUpgrades: INITIAL_UPGRADES.map(u => ({ ...u, cost: u.baseCost, currentLevel: 0 })),
      logs: INITIAL_LOG_DEFINITIONS.map(d => ({ id: d.id, name: d.name, description: d.description, icon: d.icon, isUnlocked: false })),
      joystickDirection: { x: 0, y: 0 },
    };
  }),

  advanceTutorialStep: () => set(s => {
    if (s.gameStatus !== 'TUTORIAL_ACTIVE') return s;
    const next = s.tutorialStep + 1;

    // Tutorial finished — open upgrade shop directly
    if (next >= s.tutorialMessages.length) {
      return {
        ...buildInitialState(s.gameArea, s.isTouchDevice ?? false, s.controlScheme),
        gameStatus: 'SHOP' as const,
        joystickDirection: { x: 0, y: 0 },
      };
    }

    // Typed-empty helpers (preserves array element types for TS)
    const clearBase = {
      ...s,
      tutorialStep: next,
      projectiles:       s.projectiles.slice(0, 0),
      shieldZones:       s.shieldZones.slice(0, 0),
      enemies:           s.enemies.slice(0, 0),
      collectibleAllies: s.collectibleAllies.slice(0, 0),
      goldPiles:         s.goldPiles.slice(0, 0),
      damageTexts:       s.damageTexts.slice(0, 0),
      effectParticles:   s.effectParticles.slice(0, 0),
      muzzleFlashes:     s.muzzleFlashes.slice(0, 0),
      comboTimer:        0,
      airstrikeAvailable: false,
      airstrikeActive:    false,
      airstrikesPending:  0,
    };

    const px = s.player.x + s.player.width  / 2;
    const py = s.player.y + s.player.height / 2;
    const W  = s.worldArea.width, H = s.worldArea.height;
    /** Spawn a TUTORIAL_DUMMY offset from the current player position, clamped to world bounds */
    const dummy = (dx: number, dy: number) => {
      const e = createEnemy(0, s.worldArea, EnemyType.TUTORIAL_DUMMY);
      return { ...e,
        x: Math.max(0, Math.min(px + dx - e.width  / 2, W - e.width)),
        y: Math.max(0, Math.min(py + dy - e.height / 2, H - e.height)),
      };
    };

    switch (next) {
      case 1: // Auto-targeting: two stationary dummies
        return { ...clearBase,
          enemies: [dummy(200, -80), dummy(-180, 80)],
          tutorialEntities: { ...s.tutorialEntities, tutorialHighlightTarget: null },
        };

      case 2: { // Ally pickup: spawn a collectible near the player
        const ca = createCollectibleAlly(AllyType.RIFLEMAN, s.player, [], s.worldArea, true);
        return { ...clearBase,
          collectibleAllies: ca ? [ca] : s.collectibleAllies.slice(0, 0),
          tutorialEntities: { ...s.tutorialEntities, tutorialHighlightTarget: 'allyTimer' },
        };
      }

      case 3: // Gold: five killable dummies
        return { ...clearBase,
          enemies: [dummy(210, -100), dummy(-190, -80), dummy(150, 130), dummy(-130, 160), dummy(60, -210)],
          tutorialEntities: { ...s.tutorialEntities, tutorialHighlightTarget: 'gold' },
        };

      case 4: return { ...clearBase, tutorialEntities: { ...s.tutorialEntities, tutorialHighlightTarget: 'health' } };
      case 5: return { ...clearBase, tutorialEntities: { ...s.tutorialEntities, tutorialHighlightTarget: 'wave' } };
      case 6: return { ...clearBase, tutorialEntities: { ...s.tutorialEntities, tutorialHighlightTarget: 'gold' } };
      case 7: return { ...clearBase, tutorialEntities: { ...s.tutorialEntities, tutorialHighlightTarget: 'allyTimer' } };

      case 8: { // Airstrike: pre-grant it and spawn live targets
        return { ...clearBase,
          enemies: [dummy(220, -60), dummy(-180, 90), dummy(110, 210), dummy(-110, -200), dummy(260, 150)],
          player: { ...s.player, airstrikeAvailable: true },
          tutorialEntities: { ...s.tutorialEntities, tutorialHighlightTarget: 'airstrike' },
        };
      }

      case 9: // Shield: clear field, highlight slot
        return { ...clearBase, tutorialEntities: { ...s.tutorialEntities, tutorialHighlightTarget: 'shieldAbility' } };

      default:
        return { ...clearBase, tutorialEntities: { ...s.tutorialEntities, tutorialHighlightTarget: null } };
    }
  }),

  endTutorialMode: () => set(s => ({ ...buildInitialState(s.gameArea, s.isTouchDevice ?? false, s.controlScheme), joystickDirection: { x: 0, y: 0 } })),

  // ── Dev: max upgrades ────────────────────────────────────────────────────
  setControlScheme: (scheme) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem('linefire_control_scheme', scheme);
    set({ controlScheme: scheme });
  },

  clearMetaProgress: () => {
    clearMeta();
    set(s => buildInitialState(s.gameArea, s.isTouchDevice ?? false, s.controlScheme));
  },

  maxOutAllUpgrades: () => set(s => {
    let p: Player = { ...s.player };
    const upgrades = s.availableUpgrades.map(u => {
      const max = INITIAL_UPGRADES.find(i => i.id === u.id)!.maxLevel;
      return { ...u, currentLevel: max, cost: Math.floor(u.baseCost * Math.pow(u.costScalingFactor, max)) };
    });
    // Apply all upgrades at max level
    INITIAL_UPGRADES.forEach(def => {
      for (let i = 0; i < def.maxLevel; i++) {
        const result = def.apply(p, 0);
        p = { ...result.player, gold: p.gold }; // keep gold
      }
    });
    p.health = p.maxHealth;
    const allAllies = Object.values(AllyType) as AllyType[];
    return { ...s, player: p, availableUpgrades: upgrades, unlockedAllyTypes: allAllies };
  }),
}));
