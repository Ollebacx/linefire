import { AllyType } from '../types';
import type { TutorialEntities } from '../types';

export const TUTORIAL_MESSAGES: string[] = [
  // 0 — movement
  "Move with Arrow Keys (<kbd class='kbd-minimal'>←</kbd><kbd class='kbd-minimal'>↑</kbd><kbd class='kbd-minimal'>↓</kbd><kbd class='kbd-minimal'>→</kbd>) or Mouse. On touch devices, use the bottom-left joystick. Try moving now.",
  // 1 — auto-targeting
  "Your soldier auto-targets and fires at the nearest hostile. Two targets have been deployed — watch the auto-aim track them as you move.",
  // 2 — ally collection
  "A squadmate has appeared! Walk toward them to recruit. Each ally joins the snake, adds firepower, and restores <strong style='color:#00FF88'>+5 HP</strong> on pickup.",
  // 3 — gold
  "Destroy the targets — they drop <strong style='color:#FF9500'>Gold</strong>. Walk over the coins to collect. Gold is spent on upgrades between waves.",
  // 4 — health
  "The <strong>INTEGRITY</strong> bar (top-left) is your health. Below 30% it enters <strong style='color:#FF2055'>OVERCLOCK</strong> mode — bonus speed and damage until you're healed.",
  // 5 — wave
  "The <strong>WAVE</strong> counter (top-center) shows current wave and kill progress. Clear all enemies to advance. Each wave is harder than the last.",
  // 6 — credits
  "<strong>CREDITS</strong> (top-right) is your gold total accumulated in-run. Spend it at the upgrade shop between deployments.",
  // 7 — support timer
  "The <strong>SUPPORT</strong> slot (bottom-left) counts down to the next free squadmate. The label shows who's incoming — plan your route.",
  // 8 — airstrike
  "Kill <strong>×10 enemies</strong> without taking damage to earn an Air Strike. One is pre-loaded for you — press <kbd class='kbd-minimal'>Q</kbd> or click the screen to fire.",
  // 9 — shield
  "Press <kbd class='kbd-minimal'>E</kbd> to deploy a <strong>Shield Zone</strong> that blocks enemy projectiles. The SHIELD slot shows the cooldown timer. Try it now.",
  // 10 — done
  "Deployment authorised. The upgrade shop is ready — spend your credits and move out.",
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
