/**
 * PixiRenderer — Pixi.js v8 imperative renderer.
 *
 * Replaces the SVG/DOM-based GameObjectView component.
 * Render loop is driven externally (by a Zustand subscription in GameCanvas),
 * so Pixi's built-in ticker is stopped.
 *
 * Layer order (back → front):
 *   projLayer → goldLayer → shieldLayer → entityLayer → chainLayer
 *   → effectLayer → hudLayer → textLayer
 */
import { Application, Container, Graphics, Text } from 'pixi.js';
import type {
  GameState, Player, Ally, Enemy, Projectile, GoldPile,
  CollectibleAlly, ShieldZone, ChainLightningEffect,
  DamageText, MuzzleFlash, EffectParticle, Position, Size, WeaponDrop,
} from '../types';
import { EnemyType, AllyType, WeaponType } from '../types';
import {
  PLAYER_SIZE,
  PROJECTILE_SIZE, RPG_PROJECTILE_SIZE, FLAMER_PROJECTILE_SIZE,
  PLAYER_HIT_FLASH_DURATION_TICKS, WEAPON_CONFIGS,
} from '../constants/player';
import { ALLY_SIZE, COLLECTIBLE_ALLY_SIZE } from '../constants/ally';
import { ENEMY_BOSS_WARN_TICKS } from '../constants/enemy';
import { GAME_OVER_PENDING_DURATION_TICKS } from '../systems/WaveSystem';

// ── Color palette — Dark Neon Edition ──────────────────────────────────────────────────────────────
const C = {
  BG:          0x080A14,   // Deep dark navy
  WORLD_GRID:  0x0E1A2E,   // Subtle dot grid on world floor
  STROKE:      0xE2E8F0,   // Near-white (used for general elements)
  SECONDARY:   0x64748B,   // Muted slate
  SUBTLE:      0x1C2A42,   // Dark health-bar background
  CRITICAL:    0xFF2055,   // Neon pink-red
  HEALTH:      0x00FF88,   // Neon green
  WARNING:     0xFF9500,   // Neon amber
  SHIELD:      0x00AAFF,   // Neon blue
  LIGHTNING:   0x00E5FF,   // Electric cyan
  GOLD:        0xFFD700,   // Gold
  // Squad
  PLAYER:      0x00FFCC,   // Player neon cyan
  ALLY:        0x80FF44,   // Ally neon chartreuse
  // Enemy per type
  E_GRUNT:     0xFF4444,
  E_RANGED:    0xFF8C44,
  E_TANK:      0xFF22AA,
  E_STALKER:   0xE8FF00,
  E_DRONE:     0x00CCFF,
  E_SNIPER:    0xCC44FF,
  E_BOSS:      0xFF0080,
} as const;

const SW  = 1.5;   // STROKE_WIDTH
const SWT = 2.5;   // STROKE_WIDTH_THICK

// ── Pool entry for characters (player/ally/enemy) ─────────────────────────────
interface EntityEntry {
  body: Graphics;   // shape, sits in entityLayer (sorted by zIndex)
  hud:  Graphics;   // health bar, sits in hudLayer (always on top)
}

// ── PixiRenderer ───────────────────────────────────────────────────────────────
export class PixiRenderer {
  private app!: Application;
  private world!: Container;          // translated by camera
  private worldBg!: Graphics;         // dot-grid world floor (drawn once)
  private trailLayer!: Container;     // snake trails (below everything)
  private projLayer!: Container;
  private goldLayer!: Container;
  private shieldLayer!: Container;
  private entityLayer!: Container;    // sortableChildren = true
  private chainLayer!: Container;
  private effectLayer!: Container;
  private hudLayer!: Container;
  private textLayer!: Container;

  // Object pools
  private projPool    = new Map<string, Graphics>();
  private goldPool    = new Map<string, Graphics>();
  private dropPool    = new Map<string, Graphics>();
  private shieldPool  = new Map<string, Graphics>();
  private entityPool  = new Map<string, EntityEntry>();
  private chainPool   = new Map<string, Graphics>();
  private particlePool = new Map<string, Graphics>();
  private muzzlePool  = new Map<string, Graphics>();
  private textPool    = new Map<string, Text>();
  private trailPool   = new Map<string, Graphics>();

  // Active-entity tracking (to hide stale pool entries)
  private activeIds      = new Set<string>();
  private activeTextIds  = new Set<string>();
  private activeTrailIds = new Set<string>();

  // World background drawn once per resize
  private worldBgDrawn = false;

  // Camera viewport — updated at start of each render() for culling helpers
  private _camX = 0;
  private _camY = 0;
  private _vpW  = 0;
  private _vpH  = 0;

  /** True if world-space rect is fully outside the current viewport + margin. */
  private _offscreen(x: number, y: number, w: number, h: number, margin = 80): boolean {
    return (
      x + w < this._camX - margin ||
      x     > this._camX + this._vpW + margin ||
      y + h < this._camY - margin ||
      y     > this._camY + this._vpH + margin
    );
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  initialized = false;

  async init(canvas: HTMLCanvasElement, w: number, h: number): Promise<void> {
    this.app = new Application();
    await this.app.init({
      canvas,
      width: w,
      height: h,
      antialias: true,
      background: C.BG,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    // Render is driven externally — stop the built-in ticker
    this.app.ticker.stop();

    this.world      = new Container();
    this.worldBg    = new Graphics();
    this.trailLayer = new Container();
    this.projLayer   = new Container();
    this.goldLayer   = new Container();
    this.shieldLayer = new Container();
    this.entityLayer = new Container();
    this.chainLayer  = new Container();
    this.effectLayer = new Container();
    this.hudLayer    = new Container();
    this.textLayer   = new Container();

    // Sorting by zIndex is expensive every frame at high entity counts.
    // We rely on draw-order (entityLayer addChild order) for overlap instead.
    // this.entityLayer.sortableChildren = true;

    this.world.addChild(
      this.worldBg,
      this.trailLayer,
      this.projLayer, this.goldLayer, this.shieldLayer,
      this.entityLayer, this.chainLayer, this.effectLayer,
      this.hudLayer, this.textLayer,
    );
    this.app.stage.addChild(this.world);
    this.initialized = true;
  }

  resize(w: number, h: number): void {
    if (!this.initialized) return;
    this.app.renderer.resize(w, h);
    this.worldBgDrawn = false; // force re-draw dot grid on next frame
  }

  destroy(): void {
    if (!this.initialized) return;
    this.initialized = false;

    // Explicitly destroy all pooled objects — releases GPU geometry buffers
    // and breaks reference cycles so the GC can collect the renderer immediately.
    const clearPool = (pool: Map<string, Graphics>) => {
      pool.forEach(g => { try { g.destroy(); } catch { /**/ } });
      pool.clear();
    };
    clearPool(this.projPool);
    clearPool(this.goldPool);
    clearPool(this.dropPool);
    clearPool(this.shieldPool);
    clearPool(this.chainPool);
    clearPool(this.particlePool);
    clearPool(this.muzzlePool);
    clearPool(this.trailPool);
    this.entityPool.forEach(e => { try { e.body.destroy(); e.hud.destroy(); } catch { /**/ } });
    this.entityPool.clear();
    this.textPool.forEach(t => { try { t.destroy(); } catch { /**/ } });
    this.textPool.clear();
    try { this.worldBg.destroy(); } catch { /**/ }

    this.app.destroy(false);
  }

  // ── Main render entry ─────────────────────────────────────────────────────────
  render(state: GameState): void {
    if (!this.initialized) return;
    const { camera, cameraShake, gameStatus } = state;

    // Update viewport cache for off-screen culling
    this._camX = camera.x;
    this._camY = camera.y;
    this._vpW  = state.gameArea.width;
    this._vpH  = state.gameArea.height;

    this.activeIds.clear();
    this.activeTextIds.clear();
    this.activeTrailIds.clear();

    // Draw world background dot-grid once (or after resize)
    if (!this.worldBgDrawn) this._drawWorldBackground(state.worldArea);

    // Camera transform + shake
    const shake = cameraShake && cameraShake.timer > 0
      ? { x: (Math.random() - 0.5) * cameraShake.intensity * 2, y: (Math.random() - 0.5) * cameraShake.intensity * 2 }
      : { x: 0, y: 0 };
    this.world.x = -camera.x + shake.x;
    this.world.y = -camera.y + shake.y;

    // ── Snake trails (rendered behind everything) ─────────────────────────────
    const playerR = Math.min(PLAYER_SIZE.width, PLAYER_SIZE.height) / 2 * 0.8;
    const allyR   = Math.min(ALLY_SIZE.width,  ALLY_SIZE.height)  / 2 * 0.8;
    this._trail(state.player.id, state.player.pathHistory, C.PLAYER, playerR);
    state.player.allies.forEach(a => this._trail(a.id, a.pathHistory ?? [], C.ALLY, allyR));

    // ── Draw layers in order ──────────────────────────────────────────────────
    state.projectiles.forEach(p => this._proj(p));
    state.goldPiles.forEach(g => this._gold(g));
    state.shieldZones.forEach(s => this._shield(s));
    state.collectibleAllies.forEach(ca => this._collectibleAlly(ca));
    state.weaponDrops?.forEach(wd => this._weaponDrop(wd));
    state.enemies.forEach(e => this._enemy(e));
    this._player(state.player, gameStatus, state.gameOverPendingTimer);
    state.player.allies.forEach(a => this._ally(a));
    state.chainLightningEffects.forEach(cl => this._chain(cl));
    state.muzzleFlashes.forEach(mf => this._muzzle(mf));
    state.effectParticles.forEach(ep => this._particle(ep));
    state.damageTexts.forEach(dt => this._damageText(dt));

    // ── Prune stale pool entries (destroy Graphics to free GPU memory) ─────────
    this._prunePool(this.trailPool,    this.trailLayer,   this.activeTrailIds);
    this._prunePool(this.projPool,     this.projLayer,    this.activeIds);
    this._prunePool(this.goldPool,     this.goldLayer,    this.activeIds);
    this._prunePool(this.dropPool,     this.goldLayer,    this.activeIds);
    this._prunePool(this.shieldPool,   this.shieldLayer,  this.activeIds);
    this._prunePool(this.chainPool,    this.chainLayer,   this.activeIds);
    this._prunePool(this.particlePool, this.effectLayer,  this.activeIds);
    this._prunePool(this.muzzlePool,   this.effectLayer,  this.activeIds);
    this._pruneEntityPool();
    this._pruneTextPool();

    // Drive the renderer manually
    this.app.renderer.render(this.app.stage);
  }

  // ── Pool helpers ─────────────────────────────────────────────────────────────
  /** Destroy and remove all stale Graphics entries from a pool. */
  private _prunePool(pool: Map<string, Graphics>, layer: Container, activeSet: Set<string>): void {
    if (pool.size === 0) return;
    const dead: string[] = [];
    pool.forEach((_, id) => { if (!activeSet.has(id)) dead.push(id); });
    for (const id of dead) {
      const g = pool.get(id)!;
      layer.removeChild(g);
      g.destroy();
      pool.delete(id);
    }
  }

  private _pruneEntityPool(): void {
    if (this.entityPool.size === 0) return;
    const dead: string[] = [];
    this.entityPool.forEach((_, id) => { if (!this.activeIds.has(id)) dead.push(id); });
    for (const id of dead) {
      const e = this.entityPool.get(id)!;
      this.entityLayer.removeChild(e.body);
      this.hudLayer.removeChild(e.hud);
      e.body.destroy();
      e.hud.destroy();
      this.entityPool.delete(id);
    }
  }

  private _pruneTextPool(): void {
    if (this.textPool.size === 0) return;
    const dead: string[] = [];
    this.textPool.forEach((_, id) => { if (!this.activeTextIds.has(id)) dead.push(id); });
    for (const id of dead) {
      const t = this.textPool.get(id)!;
      this.textLayer.removeChild(t);
      t.destroy();
      this.textPool.delete(id);
    }
  }

  private _gfx(id: string, pool: Map<string, Graphics>, layer: Container): Graphics {
    let g = pool.get(id);
    if (!g) { g = new Graphics(); layer.addChild(g); pool.set(id, g); }
    g.visible = true;
    this.activeIds.add(id);
    return g;
  }

  private _entity(id: string): EntityEntry {
    let e = this.entityPool.get(id);
    if (!e) {
      e = { body: new Graphics(), hud: new Graphics() };
      this.entityLayer.addChild(e.body);
      this.hudLayer.addChild(e.hud);
      this.entityPool.set(id, e);
    }
    e.body.visible = true;
    e.hud.visible  = true;
    this.activeIds.add(id);
    return e;
  }

  private _txt(id: string): Text {
    let t = this.textPool.get(id);
    if (!t) {
      t = new Text({ text: '', style: { fontSize: 14, fill: C.STROKE, fontWeight: 'bold', fontFamily: 'Inter, sans-serif' } });
      this.textLayer.addChild(t);
      this.textPool.set(id, t);
    }
    t.visible = true;
    this.activeTextIds.add(id);
    return t;
  }

  // ── Player ───────────────────────────────────────────────────────────────────
  private _player(player: Player, gameStatus: string, gameOverPendingTimer?: number): void {
    const { body, hud } = this._entity(player.id);
    body.zIndex = player.y + player.height;
    hud.zIndex  = body.zIndex;

    let alpha = 1;
    if (gameStatus === 'GAME_OVER') {
      alpha = 0;
    } else if (gameStatus === 'GAME_OVER_PENDING' && gameOverPendingTimer !== undefined) {
      alpha = Math.max(0, gameOverPendingTimer / GAME_OVER_PENDING_DURATION_TICKS);
    }

    const isHit   = player.playerHitTimer > 0;
    const baseCol = isHit ? C.CRITICAL : C.PLAYER;
    const cx = player.x + PLAYER_SIZE.width  / 2;
    const cy = player.y + PLAYER_SIZE.height / 2;
    const r  = Math.min(PLAYER_SIZE.width, PLAYER_SIZE.height) / 2 * 0.8;

    body.clear();
    body.alpha  = alpha;
    body.x      = cx;
    body.y      = cy;
    const aimDir = (player.lastShootingDirection?.x || player.lastShootingDirection?.y)
      ? player.lastShootingDirection
      : player.velocity;
    body.rotation = aimDir && (aimDir.x !== 0 || aimDir.y !== 0)
      ? Math.atan2(aimDir.y, aimDir.x)
      : body.rotation;

    // OVERCLOCK aura — below 30% HP
    const isOverclock = player.health > 0 && player.maxHealth > 0 && player.health / player.maxHealth < 0.30;
    if (isOverclock) {
      const pulse = 0.4 + 0.6 * Math.abs(Math.sin(Date.now() * 0.012));
      body.circle(0, 0, r * 2.9).stroke({ color: C.CRITICAL, alpha: 0.12 * pulse, width: 10 });
      body.circle(0, 0, r * 1.85).stroke({ color: C.CRITICAL, alpha: 0.40 * pulse, width: 2.5 });
    }

    // Outer glow halos
    body.circle(0, 0, r * 2.2).stroke({ color: baseCol, alpha: 0.07, width: 7 });
    body.circle(0, 0, r * 1.5).stroke({ color: baseCol, alpha: 0.20, width: 2 });
    // Main body
    body.circle(0, 0, r).fill({ color: C.BG }).stroke({ color: baseCol, width: SW });
    // Core dot
    body.circle(0, 0, r * 0.32).fill(baseCol);
    const bll = r * 1.3;
    this._weapon(body, 0, 0, bll, player.championType, baseCol);

    hud.clear();
    hud.alpha = alpha;
    if (player.health < player.maxHealth && gameStatus !== 'GAME_OVER_PENDING') {
      const bW = PLAYER_SIZE.width, bH = 4;
      hud.rect(player.x, player.y + PLAYER_SIZE.height + 3, bW, bH).fill(C.SUBTLE);
      hud.rect(player.x, player.y + PLAYER_SIZE.height + 3, bW * (player.health / player.maxHealth), bH).fill(C.HEALTH);
    }
  }

  // ── Ally ─────────────────────────────────────────────────────────────────────
  private _ally(ally: Ally): void {
    if (this._offscreen(ally.x, ally.y, ALLY_SIZE.width, ALLY_SIZE.height)) {
      const ae = this.entityPool.get(ally.id);
      if (ae) { ae.body.visible = false; ae.hud.visible = false; }
      return;
    }
    const { body, hud } = this._entity(ally.id);
    body.zIndex = ally.y + ally.height;

    const cx = ally.x + ALLY_SIZE.width / 2;
    const cy = ally.y + ALLY_SIZE.height / 2;
    const r  = Math.min(ALLY_SIZE.width, ALLY_SIZE.height) / 2 * 0.8;

    body.clear();
    body.x = cx; body.y = cy;
    const aimDir = (ally.lastShootingDirection?.x || ally.lastShootingDirection?.y)
      ? ally.lastShootingDirection
      : ally.velocity;
    body.rotation = aimDir && (aimDir.x !== 0 || aimDir.y !== 0)
      ? Math.atan2(aimDir.y, aimDir.x)
      : body.rotation;

    if (ally.isStranded) {
      // Stranded turret: amber colour + slow pulse to signal "recoverable"
      const pulse = 0.55 + 0.45 * Math.abs(Math.sin(Date.now() * 0.002));
      const col = 0xFF9500; // amber
      body.alpha = 0.6 + 0.4 * pulse;
      body.circle(0, 0, r * (1.7 + 0.4 * pulse)).stroke({ color: col, alpha: 0.22 * pulse, width: 1.5 });
      body.circle(0, 0, r).fill({ color: C.BG }).stroke({ color: col, width: SW });
      this._weapon(body, 0, 0, r * 1.3, ally.allyType, col);
    } else {
      body.alpha = 1;
      // Glow ring
      body.circle(0, 0, r * 1.55).stroke({ color: C.ALLY, alpha: 0.18, width: 2 });
      body.circle(0, 0, r).fill({ color: C.BG }).stroke({ color: C.ALLY, width: SW });
      this._weapon(body, 0, 0, r * 1.3, ally.allyType, C.ALLY);
    }
    hud.clear();
  }

  // ── Weapon Drop ──────────────────────────────────────────────────────────────────────────────
  private _weaponDrop(drop: WeaponDrop): void {
    this.activeIds.add(drop.id);
    let g = this.dropPool.get(drop.id);
    if (!g) {
      g = new Graphics();
      this.goldLayer.addChild(g);
      this.dropPool.set(drop.id, g);
    }
    g.visible = true;
    g.clear();

    const cx = drop.x + drop.width  / 2;
    const cy = drop.y + drop.height / 2;
    const r  = drop.width / 2 * 0.9;
    const cfg = WEAPON_CONFIGS[drop.weaponType];
    const color = cfg.rendererColor;

    // Blink fast when < 5s remaining
    const blink = drop.timeToLive < 5
      ? 0.35 + 0.65 * Math.abs(Math.sin(Date.now() * 0.008))
      : 0.8;

    g.x = cx; g.y = cy; g.alpha = blink;

    // Outer glow ring
    g.circle(0, 0, r * 1.75).stroke({ color, alpha: 0.22, width: 1.2 });
    // Diamond body
    g.poly([0, -r, r, 0, 0, r, -r, 0])
      .fill({ color, alpha: 0.18 })
      .stroke({ color, alpha: 0.92, width: 1.5 });
    // Inner cross (weapon icon)
    g.moveTo(-r * 0.48, 0).lineTo(r * 0.48, 0).stroke({ color, alpha: 0.85, width: 2 });
    g.moveTo(0, -r * 0.38).lineTo(0, r * 0.38).stroke({ color, alpha: 0.85, width: 2 });

    // TTL countdown arc (drawn along the outer ring)
    const ttlRatio = Math.max(0, drop.timeToLive / drop.maxTimeToLive);
    if (ttlRatio < 1) {
      const startAngle = -Math.PI / 2;
      const endAngle   = startAngle + ttlRatio * Math.PI * 2;
      g.arc(0, 0, r * 1.75, startAngle, endAngle).stroke({ color, alpha: 0.65, width: 2 });
    }
  }

  // ── Collectible Ally ─────────────────────────────────────────────────────────────────────────
  private _collectibleAlly(ca: CollectibleAlly): void {    const { body, hud } = this._entity(ca.id);
    body.zIndex = ca.y + ca.height;

    const cx = ca.x + COLLECTIBLE_ALLY_SIZE.width  / 2;
    const cy = ca.y + COLLECTIBLE_ALLY_SIZE.height / 2;
    const r  = Math.min(COLLECTIBLE_ALLY_SIZE.width, COLLECTIBLE_ALLY_SIZE.height) / 2 * 0.8;
    const pulse = 0.65 + 0.35 * Math.abs(Math.sin(Date.now() * 0.003));

    body.clear();
    body.x      = cx; body.y = cy;
    body.rotation = 0;
    body.alpha  = pulse;

    // Pulsating outer glow rings
    body.circle(0, 0, r * (1.9 + 0.4 * pulse)).stroke({ color: C.ALLY, alpha: 0.18 * pulse, width: 1.5 });
    body.circle(0, 0, r * 1.35).stroke({ color: C.ALLY, alpha: 0.30 * pulse, width: 1 });
    body.circle(0, 0, r).fill({ color: C.BG }).stroke({ color: C.ALLY, width: SW });
    this._weapon(body, 0, 0, r * 1.3, ca.allyType, C.ALLY);
    hud.clear();
  }

  // ── Weapon drawing helper ─────────────────────────────────────────────────────
  private _weapon(g: Graphics, cx: number, cy: number, bll: number, type: AllyType | undefined, sc: number): void {
    const sk = { color: sc, width: SW };
    const skT = { color: sc, width: SWT };
    switch (type) {
      case AllyType.RIFLEMAN:
        g.moveTo(cx, cy).lineTo(cx + bll * 1.1, cy).stroke(sk);
        break;
      case AllyType.SHOTGUN:
        g.moveTo(cx, cy).lineTo(cx + bll * 0.8, cy - bll * 0.35).stroke(sk);
        g.moveTo(cx, cy).lineTo(cx + bll * 0.9, cy).stroke(sk);
        g.moveTo(cx, cy).lineTo(cx + bll * 0.8, cy + bll * 0.35).stroke(sk);
        break;
      case AllyType.SNIPER:
        g.moveTo(cx, cy).lineTo(cx + bll * 2.2, cy).stroke(sk);
        break;
      case AllyType.MINIGUNNER: {
        const ml = bll * 1.1, cb = bll * 0.4;
        g.moveTo(cx, cy).lineTo(cx + ml, cy).stroke(sk);
        g.moveTo(cx + ml, cy - cb / 2).lineTo(cx + ml, cy + cb / 2).stroke(sk);
        break;
      }
      case AllyType.RPG_SOLDIER:
        g.moveTo(cx, cy).lineTo(cx + bll * 0.8, cy).stroke(skT);
        g.rect(cx + bll * 0.8, cy - 2.5, 5, 5).fill(C.BG).stroke(sk);
        break;
      case AllyType.FLAMER:
        for (const deg of [-30, 0, 30]) {
          const rad = deg * Math.PI / 180;
          const ex = cx + bll, ey = cy + Math.tan(rad) * bll * 0.7;
          const cpx = cx + bll * 0.6, cpy = cy + Math.tan(rad) * bll * 0.4;
          g.moveTo(cx, cy).quadraticCurveTo(cpx, cpy, ex, ey).stroke(sk);
        }
        break;
      default:  // GUN_GUY or undefined
        g.moveTo(cx, cy).lineTo(cx + bll, cy).stroke(sk);
        break;
    }
  }

  // ── Enemy ─────────────────────────────────────────────────────────────────────
  private _enemy(enemy: Enemy): void {
    if (this._offscreen(enemy.x, enemy.y, enemy.width, enemy.height)) {
      const ex = this.entityPool.get(enemy.id);
      if (ex) { ex.body.visible = false; ex.hud.visible = false; }
      return;
    }
    const { body, hud } = this._entity(enemy.id);
    body.zIndex = enemy.y + enemy.height;

    const cx  = enemy.x + enemy.width  / 2;
    const cy  = enemy.y + enemy.height / 2;
    const sz  = Math.min(enemy.width, enemy.height) * 0.8;
    const ec  = this._enemyColor(enemy.enemyType);

    body.clear();
    body.x = cx; body.y = cy;
    const vel = enemy.velocity;
    body.rotation = vel && (vel.x !== 0 || vel.y !== 0) ? Math.atan2(vel.y, vel.x) : body.rotation;

    const sk  = { color: ec, width: SW };
    const skT = { color: ec, width: SWT };

    switch (enemy.enemyType) {
      case EnemyType.MELEE_GRUNT:
        body.rect(-sz / 2, -sz / 2, sz, sz)
          .fill({ color: ec, alpha: 0.12 }).stroke(sk);
        break;
      case EnemyType.RANGED_SHOOTER:
        body.rect(-sz / 2, -sz / 2, sz, sz)
          .fill({ color: ec, alpha: 0.12 }).stroke(sk);
        body.circle(sz * 0.4, 0, sz * 0.12).fill(ec);
        break;
      case EnemyType.ROCKET_TANK:
        body.rect(-sz / 2, -sz / 2, sz, sz)
          .fill({ color: ec, alpha: 0.15 }).stroke(skT);
        body.rect(-sz * 0.3, -sz * 0.3, sz * 0.6, sz * 0.6)
          .stroke({ color: ec, alpha: 0.5, width: SW });
        body.moveTo(0, 0).lineTo(sz * 0.5, 0).stroke(skT);
        break;
      case EnemyType.AGILE_STALKER:
        body.moveTo(0, -sz / 2).lineTo(sz / 2, 0).lineTo(0, sz / 2).lineTo(-sz / 2, 0).closePath()
          .fill({ color: ec, alpha: 0.12 }).stroke(sk);
        body.moveTo(-sz * 0.1, -sz * 0.15).quadraticCurveTo(sz * 0.2, 0, -sz * 0.1, sz * 0.15)
          .stroke({ color: ec, alpha: 0.7, width: 1 });
        body.moveTo(sz * 0.1, -sz * 0.15).quadraticCurveTo(-sz * 0.2, 0, sz * 0.1, sz * 0.15)
          .stroke({ color: ec, alpha: 0.7, width: 1 });
        break;
      case EnemyType.ENEMY_SNIPER: {
        const bw = sz * 0.8, bh = sz * 0.6, bl = sz, bt = sz * 0.1;
        body.rect(-bw / 2, -bh / 2, bw, bh)
          .fill({ color: ec, alpha: 0.12 }).stroke(sk);
        body.rect(bw / 2 - bt / 2, -bt / 2, bl, bt).fill(ec);
        break;
      }
      case EnemyType.ELECTRIC_DRONE: {
        const spinAng = (Date.now() * 0.003) % (Math.PI * 2);
        body.circle(0, 0, sz / 2).stroke(sk);
        body.circle(0, 0, sz / 3).fill({ color: ec, alpha: 0.25 }).stroke({ color: ec, alpha: 0.6, width: 1 });
        for (let di = 0; di < 4; di++) {
          const a2 = spinAng + di * Math.PI / 2;
          body.moveTo(0, 0)
            .lineTo(Math.cos(a2) * (sz / 2 + sz * 0.12), Math.sin(a2) * (sz / 2 + sz * 0.12))
            .stroke({ color: ec, alpha: 0.85, width: 1 });
        }
        break;
      }
      case EnemyType.BOSS: {
        const isP2    = (enemy as any).bossPhase === 2;
        const bCol    = isP2 ? C.CRITICAL : ec;
        const spinSpd = isP2 ? 0.0028 : 0.001;
        const pulseSpd = isP2 ? 0.0055 : 0.002;
        // AoE warning ring (drawn first — sits behind body)
        const aoeT = (enemy as any).aoeTimer as number | undefined;
        const aoeRadius = (enemy as any).aoeRadius as number | undefined;
        if (aoeT != null && aoeRadius != null && aoeT < ENEMY_BOSS_WARN_TICKS) {
          const prog = 1 - aoeT / ENEMY_BOSS_WARN_TICKS;
          const warnR = aoeRadius * (0.30 + prog * 0.70);
          body.circle(0, 0, warnR).stroke({ color: 0xFF0000, alpha: 0.10 + prog * 0.40, width: 1.5 + prog * 3 });
          body.circle(0, 0, warnR * 0.88).stroke({ color: 0xFF2055, alpha: prog * 0.18, width: 1 });
        }
        // Pulsating hexagon
        const bPulse = 0.85 + 0.15 * Math.abs(Math.sin(Date.now() * pulseSpd));
        const bsz = sz * bPulse;
        // Outer aura rings
        body.circle(0, 0, bsz * 1.15).stroke({ color: bCol, alpha: isP2 ? 0.25 : 0.12, width: 9 });
        body.circle(0, 0, bsz * 0.9).stroke({ color: bCol, alpha: isP2 ? 0.52 : 0.30, width: 2.5 });
        // Hexagon
        const hexPts: { x: number; y: number }[] = [];
        for (let hi = 0; hi < 6; hi++) {
          const ha = hi * Math.PI / 3 - Math.PI / 6;
          hexPts.push({ x: Math.cos(ha) * bsz * 0.72, y: Math.sin(ha) * bsz * 0.72 });
        }
        body.poly(hexPts).fill({ color: bCol, alpha: isP2 ? 0.28 : 0.18 }).stroke({ color: bCol, width: SWT });
        // Inner cross
        body.moveTo(-bsz * 0.38, 0).lineTo(bsz * 0.38, 0).stroke({ color: bCol, alpha: 0.9, width: 2 });
        body.moveTo(0, -bsz * 0.38).lineTo(0, bsz * 0.38).stroke({ color: bCol, alpha: 0.9, width: 2 });
        // Spinning arms (faster in phase 2)
        const spinB = (Date.now() * spinSpd) % (Math.PI * 2);
        for (let bi = 0; bi < 4; bi++) {
          const ba = spinB + bi * Math.PI / 2;
          body.moveTo(Math.cos(ba) * bsz * 0.2, Math.sin(ba) * bsz * 0.2)
            .lineTo(Math.cos(ba) * bsz * 0.65, Math.sin(ba) * bsz * 0.65)
            .stroke({ color: bCol, alpha: isP2 ? 0.85 : 0.55, width: 1.5 });
        }
        // Center core
        body.circle(0, 0, bsz * 0.16).fill(bCol);
        break;
      }
      case EnemyType.TUTORIAL_DUMMY:
        body.circle(0, 0, sz / 2)
          .fill({ color: C.SUBTLE, alpha: 0.5 })
          .stroke({ color: C.SECONDARY, width: SW });
        body.moveTo(-sz / 3, -sz / 3).lineTo(sz / 3, sz / 3).stroke({ color: C.SECONDARY, width: 1 });
        body.moveTo(-sz / 3, sz / 3).lineTo(sz / 3, -sz / 3).stroke({ color: C.SECONDARY, width: 1 });
        break;
      default:
        body.rect(-sz / 2, -sz / 2, sz, sz)
          .fill({ color: ec, alpha: 0.12 }).stroke(sk);
        break;
    }

    // Hit flash — white overlay for 8 ticks when damaged
    if ((enemy.hitTimer ?? 0) > 0) {
      const flashAlpha = Math.min(0.88, ((enemy.hitTimer ?? 0) / 8) * 0.88);
      body.circle(0, 0, sz * 0.75).fill({ color: 0xFFFFFF, alpha: flashAlpha });
    }

    // Health bar (in hudLayer, world coords)
    hud.clear();
    const showHp = enemy.enemyType === EnemyType.BOSS
      ? true
      : enemy.health < enemy.maxHealth;
    if (showHp) {
      const bH = enemy.enemyType === EnemyType.BOSS ? 6 : 4;
      const bX = enemy.x, bY = enemy.y - bH - 2;
      hud.rect(bX, bY, enemy.width, bH).fill(C.SUBTLE);
      const hpCol = enemy.enemyType === EnemyType.BOSS
        ? ((enemy as any).bossPhase === 2 ? C.CRITICAL : C.E_BOSS)
        : C.HEALTH;
      hud.rect(bX, bY, enemy.width * (enemy.health / enemy.maxHealth), bH).fill(hpCol);
    }
  }

  // ── Projectile ───────────────────────────────────────────────────────────────
  private _proj(proj: Projectile): void {
    if (this._offscreen(proj.x, proj.y, proj.width, proj.height, 40)) {
      const pg = this.projPool.get(proj.id);
      if (pg) pg.visible = false;
      return;
    }
    const g   = this._gfx(proj.id, this.projPool, this.projLayer);
    const cx  = proj.x + proj.width  / 2;
    const cy  = proj.y + proj.height / 2;
    const col = this._hex(proj.color) ?? C.STROKE;

    g.clear();
    g.alpha = 1;
    g.x = cx; g.y = cy;
    const vel = proj.velocity;
    if (vel && (vel.x !== 0 || vel.y !== 0)) g.rotation = Math.atan2(vel.y, vel.x);

    if (proj.isAirstrike) {
      const W = proj.width, H = proj.height;
      const hw = W / 2;

      // Fix rotation: model-space nose points UP (-y), offset by +90° to align with velocity
      g.rotation = (vel ? Math.atan2(vel.y, vel.x) : Math.PI / 2) + Math.PI / 2;

      // ── Exhaust glow (tail = +y in model space) ──────────────────────────
      g.circle(0, H * 0.40, hw * 2.2).fill({ color: C.WARNING, alpha: 0.18 });
      g.circle(0, H * 0.40, hw * 1.0).fill({ color: 0xFF6600,  alpha: 0.50 });
      g.circle(0, H * 0.40, hw * 0.45).fill({ color: 0xFFFFFF, alpha: 0.90 });
      // Flame tongue
      g.moveTo(-hw * 0.28, H * 0.38)
       .lineTo(0,           H * 0.54)
       .lineTo( hw * 0.28,  H * 0.38)
       .closePath()
       .fill({ color: C.WARNING, alpha: 0.85 });

      // ── Swept fins (at body bottom) ───────────────────────────────────────
      g.moveTo(-hw * 0.50,  H * 0.08)
       .lineTo(-hw * 1.55,  H * 0.38)
       .lineTo(-hw * 0.50,  H * 0.38)
       .closePath()
       .fill(C.CRITICAL)
       .stroke({ color: C.STROKE, width: 0.8, alpha: 0.7 });
      g.moveTo( hw * 0.50,  H * 0.08)
       .lineTo( hw * 1.55,  H * 0.38)
       .lineTo( hw * 0.50,  H * 0.38)
       .closePath()
       .fill(C.CRITICAL)
       .stroke({ color: C.STROKE, width: 0.8, alpha: 0.7 });

      // ── Body ─────────────────────────────────────────────────────────────
      // Dark hull
      g.roundRect(-hw * 0.56, -H * 0.40, hw * 1.12, H * 0.78, 1.5)
       .fill({ color: 0x14050A })
       .stroke({ color: C.CRITICAL, width: 1.3 });
      // Warhead band (amber)
      g.rect(-hw * 0.56, -H * 0.24, hw * 1.12, H * 0.09).fill(C.WARNING);
      // Center spine
      g.moveTo(0, -H * 0.40).lineTo(0, H * 0.38)
       .stroke({ color: C.CRITICAL, alpha: 0.35, width: 0.7 });

      // ── Nose cone ────────────────────────────────────────────────────────
      g.moveTo( 0,         -H * 0.50)   // sharp tip
       .lineTo(-hw * 0.56, -H * 0.22)
       .lineTo( hw * 0.56, -H * 0.22)
       .closePath()
       .fill(C.WARNING)
       .stroke({ color: 0xFFFFFF, width: 0.9, alpha: 0.8 });
      // Tip highlight
      g.circle(0, -H * 0.46, 1.3).fill({ color: 0xFFFFFF, alpha: 0.95 });

      // ── Outer glow aura ───────────────────────────────────────────────────
      g.roundRect(-hw * 1.7, -H * 0.52, hw * 3.4, H * 1.04, 4)
       .stroke({ color: C.CRITICAL, alpha: 0.12, width: 4 });

    } else if (proj.width === FLAMER_PROJECTILE_SIZE.width) {
      g.alpha = proj.maxTravelDistance ? Math.max(0, 1 - (proj.distanceTraveled ?? 0) / proj.maxTravelDistance) : 1;
      const flameColors = [C.WARNING, C.CRITICAL, 0xFFA500];
      const n = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const len = proj.width * (0.3 + Math.random() * 0.4);
        const ex  = Math.cos(ang) * len, ey = Math.sin(ang) * len;
        const cpx = Math.cos(ang + Math.PI / 2) * len * 0.3 * (Math.random() > 0.5 ? 1 : -1);
        const cpy = Math.sin(ang + Math.PI / 2) * len * 0.3 * (Math.random() > 0.5 ? 1 : -1);
        g.moveTo(0, 0).quadraticCurveTo(cpx, cpy, ex, ey).stroke({ color: flameColors[i % 3], width: SW });
      }

    } else if (proj.width === RPG_PROJECTILE_SIZE.width && proj.height === RPG_PROJECTILE_SIZE.height) {
      const hW = proj.width / 2, hH = proj.height / 2;
      g.rect(-hW, -hH, proj.width, proj.height).fill(col);
      if ((proj.playerChainLightningLevel ?? 0) > 0) {
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.025);
        g.circle(0, 0, hW * 2).stroke({ color: C.LIGHTNING, alpha: 0.4 + 0.4 * pulse, width: 1.5 });
        g.circle(0, 0, hW * 3).stroke({ color: C.LIGHTNING, alpha: 0.2 * pulse, width: 0.8 });
      }

    } else {
      // Standard bullet — elongated neon bolt with glowing tail
      const baseR = Math.min(proj.width, proj.height) / 2 * 0.8;
      const tailLen = baseR * 3.5;
      // Outer soft glow halo
      g.circle(0, 0, baseR * 2.2).fill({ color: col, alpha: 0.12 });
      // Tail gradient (drawn as tapered rect along -x axis since rotation handles direction)
      g.moveTo(0, -baseR * 0.55)
       .lineTo(-tailLen, 0)
       .lineTo(0, baseR * 0.55)
       .closePath()
       .fill({ color: col, alpha: 0.28 });
      // Core bright capsule
      g.roundRect(-baseR * 0.6, -baseR * 0.55, baseR * 1.8, baseR * 1.1, baseR * 0.55).fill({ color: col, alpha: 1 });
      // Bright white core tip
      g.circle(baseR * 0.4, 0, baseR * 0.38).fill({ color: 0xFFFFFF, alpha: 0.75 });

      if ((proj.playerChainLightningLevel ?? 0) > 0) {
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.025);
        g.circle(0, 0, baseR * 2.2).stroke({ color: C.LIGHTNING, alpha: 0.5 + 0.3 * pulse, width: 1.5 });
        g.circle(0, 0, baseR * 3.2).stroke({ color: C.LIGHTNING, alpha: 0.2 * pulse, width: 0.8 });
        g.circle(0, 0, baseR * 0.6).fill({ color: C.LIGHTNING, alpha: 0.3 * pulse });
      }
    }
  }

  // ── Gold pile ─────────────────────────────────────────────────────────────────
  private _gold(gold: GoldPile): void {
    const g   = this._gfx(gold.id, this.goldPool, this.goldLayer);
    const cx  = gold.x + gold.width  / 2;
    const cy  = gold.y + gold.height / 2;
    const r   = Math.min(gold.width, gold.height) / 2 * 0.8;
    const col = C.GOLD;
    const pulse = 0.5 + 0.5 * Math.abs(Math.sin(Date.now() * 0.004 + cx * 0.05));
    g.clear();
    // Outer glow halos
    g.circle(cx, cy, r * 2.5).stroke({ color: col, alpha: 0.08 * pulse, width: 2 });
    g.circle(cx, cy, r * 1.7).stroke({ color: col, alpha: 0.20 * pulse, width: 1.5 });
    // Filled coin body
    g.circle(cx, cy, r).fill({ color: col, alpha: 0.80 }).stroke({ color: col, width: SW });
    // Inner shine dot
    g.circle(cx - r * 0.28, cy - r * 0.28, r * 0.28).fill({ color: 0xFFFFFF, alpha: 0.45 });
  }

  // ── Shield zone ───────────────────────────────────────────────────────────────
  private _shield(shield: ShieldZone): void {
    const g  = this._gfx(shield.id, this.shieldPool, this.shieldLayer);
    const cx = shield.x + shield.width  / 2;
    const cy = shield.y + shield.height / 2;
    g.clear();
    g.alpha = shield.opacity;
    g.circle(cx, cy, shield.radius).fill({ color: C.SHIELD, alpha: 0.1 }).stroke({ color: C.SHIELD, width: SWT });
  }

  // ── Chain lightning ───────────────────────────────────────────────────────────
  private _chain(cl: ChainLightningEffect): void {
    const g   = this._gfx(cl.id, this.chainPool, this.chainLayer);
    const col = this._hex(cl.color) ?? C.LIGHTNING;
    g.clear();
    g.alpha = Math.max(0, Math.min(1, cl.timer / 8));

    const nSeg = 5;
    const dx   = cl.endX - cl.startX, dy = cl.endY - cl.startY;
    const off  = Math.min(Math.abs(dx), Math.abs(dy)) * 0.2 + 5;
    const pts: [number, number][] = [[cl.startX, cl.startY]];
    for (let i = 1; i < nSeg; i++) {
      pts.push([
        cl.startX + dx / nSeg * i + (Math.random() - 0.5) * off,
        cl.startY + dy / nSeg * i + (Math.random() - 0.5) * off,
      ]);
    }
    pts.push([cl.endX, cl.endY]);

    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.stroke({ color: col, width: 2 });
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.stroke({ color: C.BG, alpha: 0.67, width: 0.7 });
  }

  // ── Muzzle flash ──────────────────────────────────────────────────────────────
  private _muzzle(mf: MuzzleFlash): void {
    const g   = this._gfx(mf.id, this.muzzlePool, this.effectLayer);
    const col = this._hex(mf.color) ?? C.WARNING;
    g.clear();
    const life = Math.max(0, mf.timer / 3);
    g.alpha = life;
    g.x = mf.x; g.y = mf.y;
    const baseAng = mf.angle * Math.PI / 180;
    // Bright center dot
    g.circle(0, 0, mf.size * 0.22 * life).fill({ color: 0xFFFFFF, alpha: 0.9 });
    for (let i = 0; i < 5; i++) {
      const ang = baseAng + i * (Math.PI * 2 / 5) + (Math.random() - 0.5) * 0.4;
      const len = mf.size * (0.6 + Math.random() * 0.7);
      g.moveTo(0, 0).lineTo(Math.cos(ang) * len, Math.sin(ang) * len).stroke({ color: col, width: 2 });
    }
  }

  // ── Effect particle ───────────────────────────────────────────────────────────
  private _particle(ep: EffectParticle): void {
    const g   = this._gfx(ep.id, this.particlePool, this.effectLayer);
    const col = this._hex(ep.color) ?? C.STROKE;
    g.clear();
    const life = ep.timer / ep.initialTimer;
    g.alpha = life;
    if (ep.type === 'shield_pulse') {
      g.circle(ep.x, ep.y, ep.size).stroke({ color: col, width: 1.5 });
    } else {
      // Bright square + glow dot for maximum visibility on dark bg
      g.circle(ep.x, ep.y, ep.size / 2 + ep.size / 2 * life).fill(col);
    }
  }

  // ── Damage text ───────────────────────────────────────────────────────────────
  private _damageText(dt: DamageText): void {
    const t = this._txt(dt.id);
    t.text  = dt.text;
    t.x     = dt.x;
    t.y     = dt.y;
    t.alpha = Math.max(0, Math.min(1, dt.timer / 30));
    (t.style as any).fontSize   = dt.fontSize   || 14;
    (t.style as any).fill       = this._hex(dt.color) ?? C.STROKE;
    (t.style as any).fontWeight = dt.fontWeight || 'bold';
  }

  // ── World background dot grid ─────────────────────────────────────────────────
  private _drawWorldBackground(worldArea: Size): void {
    this.worldBg.clear();
    this.worldBg.rect(0, 0, worldArea.width, worldArea.height).fill(C.BG);
    const GRID = 50;
    for (let gx = 0; gx <= worldArea.width; gx += GRID) {
      for (let gy = 0; gy <= worldArea.height; gy += GRID) {
        this.worldBg.circle(gx, gy, 1.5).fill({ color: 0x1E3A5F, alpha: 1 });
      }
    }
    this.worldBgDrawn = true;
  }

  // ── Snake trail ───────────────────────────────────────────────────────────────
  private _gfxTrail(id: string): Graphics {
    let g = this.trailPool.get(id);
    if (!g) { g = new Graphics(); this.trailLayer.addChild(g); this.trailPool.set(id, g); }
    g.visible = true;
    this.activeTrailIds.add(id);
    return g;
  }

  private _trail(entityId: string, history: Position[], color: number, bodyRadius: number): void {
    if (!history || history.length < 2) return;
    const g = this._gfxTrail(entityId + '_trail');
    g.clear();
    const MAX_PTS = 35;
    const MAX_SEG = 120; // skip segments where player teleported
    const pts = history.slice(0, Math.min(history.length, MAX_PTS));
    for (let i = 0; i < pts.length - 1; i++) {
      const dx = pts[i + 1].x - pts[i].x;
      const dy = pts[i + 1].y - pts[i].y;
      if (dx * dx + dy * dy > MAX_SEG * MAX_SEG) continue; // teleport gap — skip
      const t = 1 - i / (pts.length - 1);
      const w = Math.max(0.8, bodyRadius * 1.8 * t);
      g.moveTo(pts[i].x, pts[i].y)
       .lineTo(pts[i + 1].x, pts[i + 1].y)
       .stroke({ color, alpha: t * 0.55, width: w });
    }
  }

  // ── Enemy color by type ───────────────────────────────────────────────────────
  private _enemyColor(type: EnemyType): number {
    switch (type) {
      case EnemyType.MELEE_GRUNT:    return C.E_GRUNT;
      case EnemyType.RANGED_SHOOTER: return C.E_RANGED;
      case EnemyType.ROCKET_TANK:    return C.E_TANK;
      case EnemyType.AGILE_STALKER:  return C.E_STALKER;
      case EnemyType.ELECTRIC_DRONE: return C.E_DRONE;
      case EnemyType.ENEMY_SNIPER:   return C.E_SNIPER;
      case EnemyType.BOSS:           return C.E_BOSS;
      default:                       return C.E_GRUNT;
    }
  }

  // ── Hex string → Pixi number ──────────────────────────────────────────────────
  private _hex(hex: string): number | null {
    if (!hex || hex.length < 4) return null;
    const n = parseInt(hex.replace('#', ''), 16);
    return isNaN(n) ? null : n;
  }
}
