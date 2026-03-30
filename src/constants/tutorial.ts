import { AllyType } from '../types';
import type { TutorialEntities } from '../types';

export const TUTORIAL_MESSAGES: string[] = [
  "Welcome! Move with Arrow Keys (<kbd class=\"kbd-minimal\">←</kbd> <kbd class=\"kbd-minimal\">↑</kbd> <kbd class=\"kbd-minimal\">↓</kbd> <kbd class=\"kbd-minimal\">→</kbd>), or Mouse. On touch devices, use the joystick. Try moving around.",
  "Your vector auto-targets and shoots the closest hostile. Observe how it prioritizes targets.",
  "Collect units like this to add them to your squad. They'll fight with you!",
  "Destroyed hostiles drop Gold. Pick them up to spend on augments later. Engage these targets!",
  "This is your Integrity (health). If it reaches zero, the run ends. Keep an eye on it!",
  "This shows the current Wave. Hostiles become more challenging over time.",
  "This is your collected Gold. Spend this on augments between deployments.",
  "This timer shows when the next support unit can be collected.",
  "Defeat enemies quickly to build a combo. High combos earn powerful Airstrikes! Press <kbd class=\"kbd-minimal\">Q</kbd> or click anywhere on screen. Try it now!",
  "Press <kbd class=\"kbd-minimal\">E</kbd> to deploy a temporary Shield Zone. This is its cooldown timer.",
  "Tutorial complete! You're ready to survive.",
];

export const TUTORIAL_ALLY_SPAWN_ORDER: AllyType[] = [
  AllyType.RIFLEMAN,
  AllyType.SHOTGUN,
  AllyType.SNIPER,
  AllyType.MINIGUNNER,
  AllyType.RPG_SOLDIER,
  AllyType.FLAMER,
];

export const INITIAL_TUTORIAL_ENTITIES: TutorialEntities = {
  enemies: [],
  goldPiles: [],
  collectibleAllies: [],
  muzzleFlashes: [],
  effectParticles: [],
};

export const TUTORIAL_STEP_3_ENEMY_SPAWN_INTERVAL   = 120;
export const TUTORIAL_STEP_3_MAX_CONCURRENT_ENEMIES  = 3;
export const TUTORIAL_STEP_5_ENEMY_SPAWN_INTERVAL   = 90;
export const TUTORIAL_STEP_5_MAX_CONCURRENT_ENEMIES  = 4;

export const SCENERY_OBJECT_COUNT  = 0;
export const SCENERY_VISUAL_KEYS: string[] = [];
