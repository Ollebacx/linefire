# GitHub Copilot Instructions — Linefire

## Project Overview
Linefire is a 2D top-down shooter game built with React + TypeScript + PixiJS (renderer) + Vite.  
The player controls a unit, builds a squad of allies, and fights through increasingly difficult waves with a BOSS every 5 rounds.

## Architecture

```
linefire_extracted/
├── hooks/useGameLogic.ts      ← Main game loop (~2500 lines). All game state lives here.
├── src/
│   ├── systems/               ← Pure functions: CombatSystem, MovementSystem, ProjectileSystem, SpawnSystem, WaveSystem, AudioSystem, EffectsSystem, ComboSystem
│   ├── constants/             ← All numeric constants (enemy.ts, player.ts, ally.ts, world.ts, ui.ts, effects.ts, tutorial.ts)
│   ├── types/                 ← Type definitions (re-exported through src/types/index.ts)
│   └── renderer/              ← PixiJS canvas renderer (PixiRenderer.ts) + React wrapper (GameCanvas.tsx)
├── components/                ← React UI components (HUD, StartScreen, UpgradeModal, etc.)
├── types.ts                   ← ROOT types file (imported by useGameLogic). Must stay in sync with src/types/
└── constants.ts               ← ROOT constants file (imported by useGameLogic). Must stay in sync with src/constants/
```

## Critical Dual-File Rule
`useGameLogic.ts` imports from root `../types` and `../constants`, NOT from `src/types/` or `src/constants/`.  
All systems (`CombatSystem`, `SpawnSystem`, etc.) import from `src/types/` and `src/constants/`.  
**When adding a new enum value (e.g. `EnemyType.X`) or constant, add it to BOTH the root file AND the src/ file.**

## Enemy Type Roster
| Type | Behavior |
|------|----------|
| `MELEE_GRUNT` | Rushes player, melee |
| `RANGED_SHOOTER` | Keeps distance, shoots projectiles |
| `ROCKET_TANK` | AoE RPG projectiles, large |
| `AGILE_STALKER` | Fast melee |
| `ELECTRIC_DRONE` | AoE pulse damage when close |
| `ENEMY_SNIPER` | Long-range single shot, high damage |
| `BOSS` | Every 5th wave. Triple-spread magenta projectile burst + AoE ground slam with shockwave particles. `EnemyType.BOSS` must exist in both `types.ts` and `src/types/enemy.ts` |
| `TUTORIAL_DUMMY` | Static target in tutorial |

## Visual / Design Language
- **Color palette**: Dark neon. Background `#080A14`. Cyan `#00E5FF`, green `#00FF88`, magenta/red `#FF2055`, amber `#FF9500`.
- **UI**: Glassmorphism panels (`rgba(8,10,20,0.85)` + `backdrop-filter: blur`). No solid opaque boxes.
- **HUD layout**: Top bar = HP bar (left, 38%) + WAVE (center) + CREDITS + controls (right). Gradient fade, no hard border. Bottom bar = ability slots centered (SUPPORT · AIR STRIKE · SHIELD).
- **No white, no light grays** anywhere. App background is always `#080A14`.
- **Fonts**: Inter, weight 100–300 for values, 300 for labels. `letter-spacing: 0.18em` on labels.
- **Animations**: `scan-sweep`, `neon-flicker`, `combo-pop` defined in `index.html` `<style>` block.
- **Projectiles**: Player bullets = elongated neon capsule with glow tail (PixiRenderer). Boss = magenta `#FF0080` RPG-sized shots.

## Dev Server
Always use: `./dev.sh` from `linefire_extracted/` (kills zombies, starts Vite on port 4173).  
Or: `./node_modules/.bin/vite --port 4173 --host`  
Never use `npm run dev` — it doesn't kill zombie processes.

## Game Loop Pattern
All game state is immutable-style inside `useGameLogic.ts`:
```typescript
// Pattern for enemy AI additions:
if (currentEnemy.enemyType === EnemyType.X && ...) {
  // operate on currentEnemy (already shallow-copied)
  // push to newProjectilesCreatedThisTick for new projectiles
  // mutate newPlayer.health for direct damage
  // push to newEffectParticles for visual FX
}
```

## TypeScript Rules
- Zero `error TS` allowed (excluding known `types.ts` re-export conflicts).
- Run check: `./node_modules/typescript/bin/tsc --project tsconfig.json --noEmit 2>&1 | grep "error TS" | grep -v "types.ts"`
- Never use `any` casts to silence real errors.

## Adding a New Enemy
1. Add size/stats constants to `src/constants/enemy.ts` AND `constants.ts`
2. Add enum value to `src/types/enemy.ts` AND `types.ts`
3. Add `createEnemy` case in `src/systems/SpawnSystem.ts`
4. Add spawn probability in `ENEMY_SPAWN_PROBABILITIES` in `src/constants/enemy.ts`
5. Add AI behavior block in `useGameLogic.ts` enemy forEach loop (~line 1490+)
6. Add death color in `ProjectileSystem.ts` `enemyDeathColors()`
7. Add renderer case in `PixiRenderer.ts` `_enemy()` method

## Key Constants
- `WORLD_AREA`: `{ width: 3000, height: 3000 }` — the game world size
- `PLAYER_HIT_FLASH_DURATION_TICKS`: 20
- `AIRSTRIKE_COMBO_THRESHOLD`: combo count to unlock airstrike
- Boss spawns every 5th round (`round % 5 === 0`), one per wave

## State Management
- No Redux/Zustand in game loop — single large `useGameLogic` hook with `useRef` for mutable state and `useState` for render triggers.
- `gameStore.ts` and `uiStore.ts` exist but are not the primary state — `useGameLogic` is the source of truth.
