// Re-export all constants from sub-modules for convenience
export * from './world';
export * from './player';
export * from './enemy';
export * from './ally';
export * from './ui';
export * from './effects';
export * from './tutorial';

// Re-export upgrades and initial state from root constants
// (these depend on types too complex to duplicate — bridge to original file)
export {
  INITIAL_UPGRADES,
  INITIAL_PLAYER_STATE,
  CHAMPION_CHOICES,
  INITIAL_LOG_DEFINITIONS,
  ROUND_BASE_ENEMY_COUNT,
  ROUND_ENEMY_INCREMENT,
} from '../../constants';
