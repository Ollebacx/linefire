import type React from 'react';
import type { Player } from './player';
import type { GameState } from './game';

export enum UpgradeType {
  PLAYER_MAX_HEALTH       = 'PLAYER_MAX_HEALTH',
  PLAYER_SPEED            = 'PLAYER_SPEED',
  GOLD_MAGNET             = 'GOLD_MAGNET',
  SQUAD_SPACING           = 'SQUAD_SPACING',
  INITIAL_ALLY_BOOST      = 'INITIAL_ALLY_BOOST',

  UNLOCK_SNIPER_ALLY      = 'UNLOCK_SNIPER_ALLY',
  UNLOCK_RPG_ALLY         = 'UNLOCK_RPG_ALLY',
  UNLOCK_FLAMER_ALLY      = 'UNLOCK_FLAMER_ALLY',
  UNLOCK_MINIGUNNER_ALLY  = 'UNLOCK_MINIGUNNER_ALLY',

  GLOBAL_DAMAGE_BOOST     = 'GLOBAL_DAMAGE_BOOST',
  GLOBAL_FIRE_RATE_BOOST  = 'GLOBAL_FIRE_RATE_BOOST',

  AIRSTRIKE_MISSILE_COUNT = 'AIRSTRIKE_MISSILE_COUNT',
  AIRSTRIKE_DAMAGE        = 'AIRSTRIKE_DAMAGE',
  AIRSTRIKE_AOE           = 'AIRSTRIKE_AOE',

  PLAYER_PROJECTILE_SPEED = 'PLAYER_PROJECTILE_SPEED',
  PLAYER_PIERCING_ROUNDS  = 'PLAYER_PIERCING_ROUNDS',

  UNLOCK_SHIELD_ABILITY   = 'UNLOCK_SHIELD_ABILITY',
  SHIELD_DURATION         = 'SHIELD_DURATION',
  SHIELD_RADIUS           = 'SHIELD_RADIUS',
  SHIELD_COOLDOWN_REDUCTION = 'SHIELD_COOLDOWN_REDUCTION',

  CHAIN_LIGHTNING_CHANCE  = 'CHAIN_LIGHTNING_CHANCE',
  CHAIN_LIGHTNING_LEVEL   = 'CHAIN_LIGHTNING_LEVEL',

  // Ally survivability
  ALLY_HEALTH_BOOST       = 'ALLY_HEALTH_BOOST',

  // Player weapon tier
  WEAPON_TIER             = 'WEAPON_TIER',
}

export type SvgIconComponent = React.ForwardRefExoticComponent<
  Omit<React.SVGProps<SVGSVGElement>, 'ref'> &
  { title?: string; titleId?: string } &
  React.RefAttributes<SVGSVGElement>
>;

export interface Upgrade {
  id: UpgradeType;
  name: string;
  description: string;
  cost: number;
  currentLevel: number;
  maxLevel: number;
  baseCost: number;
  costScalingFactor: number;
  apply: (
    player: Player,
    currentCost: number,
    gameState?: GameState
  ) => { player: Player; updatedGameState?: Partial<GameState> };
  icon?: SvgIconComponent;
}
