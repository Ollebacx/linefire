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
  DamageText, MuzzleFlash, EffectParticle,
} from '../types';
import { EnemyType, AllyType } from '../types';
import {
  PLAYER_SIZE,
  PROJECTILE_SIZE, RPG_PROJECTILE_SIZE, FLAMER_PROJECTILE_SIZE,
  PLAYER_HIT_FLASH_DURATION_TICKS,
} from '../constants/player';
import { ALLY_SIZE, COLLECTIBLE_ALLY_SIZE } from '../constants/ally';
import { GAME_OVER_PENDING_DURATION_TICKS } from '../systems/WaveSystem';

// ── Color palette (Pixi hex numbers) ──────────────────────────────────────────
const C = {
  BG:        0xF3F4F6,
  STROKE:    0x111827,
  SECONDARY: 0x4B5563,
  SUBTLE:    0xD1D5DB,
  CRITICAL:  0xEF4444,
  HEALTH:    0x22C55E,
  WARNING:   0xF97316,
  SHIELD:    0x3B82F6,
  LIGHTNING: 0x00AFFF,
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
  private shieldPool  = new Map<string, Graphics>();
  private entityPool  = new Map<string, EntityEntry>();
  private chainPool   = new Map<string, Graphics>();
  private particlePool = new Map<string, Graphics>();
  private muzzlePool  = new Map<string, Graphics>();
  private textPool    = new Map<string, Text>();

  // Active-entity tracking (to hide stale pool entries)
  private activeIds     = new Set<string>();
  private activeTextIds = new Set<string>();

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

    this.world = new Container();
    this.projLayer   = new Container();
    this.goldLayer   = new Container();
    this.shieldLayer = new Container();
    this.entityLayer = new Container();
    this.chainLayer  = new Container();
    this.effectLayer = new Container();
    this.hudLayer    = new Container();
    this.textLayer   = new Container();

    this.entityLayer.sortableChildren = true;

    this.world.addChild(
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
  }

  destroy(): void {
    if (!this.initialized) return;
    this.initialized = false;
    this.app.destroy(false);
  }

  // ── Main render entry ─────────────────────────────────────────────────────────
  render(state: GameState): void {
    if (!this.initialized) return;
    const { camera, cameraShake, gameStatus } = state;

    this.activeIds.clear();
    this.activeTextIds.clear();

    // Camera transform + shake
    const shake = cameraShake && cameraShake.timer > 0
      ? { x: (Math.random() - 0.5) * cameraShake.intensity * 2, y: (Math.random() - 0.5) * cameraShake.intensity * 2 }
      : { x: 0, y: 0 };
    this.world.x = -camera.x + shake.x;
    this.world.y = -camera.y + shake.y;

    const isTutorial = gameStatus === 'TUTORIAL_ACTIVE';
    const tut = state.tutorialEntities;
    const enemies      = isTutorial ? tut.enemies           : state.enemies;
    const goldPiles    = isTutorial ? tut.goldPiles         : state.goldPiles;
    const collectibles = isTutorial ? tut.collectibleAllies : state.collectibleAllies;
    const muzzles      = isTutorial ? (tut.muzzleFlashes   ?? state.muzzleFlashes)   : state.muzzleFlashes;
    const particles    = isTutorial ? (tut.effectParticles ?? state.effectParticles) : state.effectParticles;

    // ── Draw layers in order ──────────────────────────────────────────────────
    state.projectiles.forEach(p => this._proj(p));
    goldPiles.forEach(g => this._gold(g));
    state.shieldZones.forEach(s => this._shield(s));
    collectibles.forEach(ca => this._collectibleAlly(ca));
    enemies.forEach(e => this._enemy(e));
    this._player(state.player, gameStatus, state.gameOverPendingTimer);
    state.player.allies.forEach(a => this._ally(a));
    state.chainLightningEffects.forEach(cl => this._chain(cl));
    muzzles.forEach(mf => this._muzzle(mf));
    particles.forEach(ep => this._particle(ep));
    state.damageTexts.forEach(dt => this._damageText(dt));

    // ── Hide stale pool entries ───────────────────────────────────────────────
    this.projPool.forEach((g, id)    => { if (!this.activeIds.has(id))     g.visible = false; });
    this.goldPool.forEach((g, id)    => { if (!this.activeIds.has(id))     g.visible = false; });
    this.shieldPool.forEach((g, id)  => { if (!this.activeIds.has(id))     g.visible = false; });
    this.entityPool.forEach((e, id)  => {
      if (!this.activeIds.has(id)) { e.body.visible = false; e.hud.visible = false; }
    });
    this.chainPool.forEach((g, id)   => { if (!this.activeIds.has(id))     g.visible = false; });
    this.effectLayer.children.forEach(() => {}); // handled by particlePool
    this.particlePool.forEach((g, id) => { if (!this.activeIds.has(id))    g.visible = false; });
    this.muzzlePool.forEach((g, id)  => { if (!this.activeIds.has(id))     g.visible = false; });
    this.textPool.forEach((t, id)    => { if (!this.activeTextIds.has(id)) t.visible = false; });

    // Drive the renderer manually
    this.app.renderer.render(this.app.stage);
  }

  // ── Pool helpers ─────────────────────────────────────────────────────────────
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

    const isHit = player.playerHitTimer > 0;
    const strokeColor = isHit ? C.CRITICAL : C.STROKE;
    const cx = player.x + PLAYER_SIZE.width / 2;
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

    body.circle(0, 0, r).fill(C.BG).stroke({ color: strokeColor, width: SW });
    body.circle(0, 0, r * 0.3).fill(strokeColor);
    const bll = r * 1.3;
    this._weapon(body, 0, 0, bll, player.championType, strokeColor);

    hud.clear();
    hud.alpha = alpha;
    if (player.health < player.maxHealth && gameStatus !== 'GAME_OVER_PENDING') {
      const bW = PLAYER_SIZE.width, bH = 5;
      hud.rect(player.x, player.y + PLAYER_SIZE.height + 3, bW, bH).fill(C.SUBTLE);
      hud.rect(player.x, player.y + PLAYER_SIZE.height + 3, bW * (player.health / player.maxHealth), bH).fill(C.HEALTH);
    }
  }

  // ── Ally ─────────────────────────────────────────────────────────────────────
  private _ally(ally: Ally): void {
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

    body.circle(0, 0, r).stroke({ color: C.STROKE, width: SW });
    this._weapon(body, 0, 0, r * 1.3, ally.allyType, C.STROKE);
    hud.clear();
  }

  // ── Collectible Ally ──────────────────────────────────────────────────────────
  private _collectibleAlly(ca: CollectibleAlly): void {
    const { body, hud } = this._entity(ca.id);
    body.zIndex = ca.y + ca.height;

    const cx = ca.x + COLLECTIBLE_ALLY_SIZE.width / 2;
    const cy = ca.y + COLLECTIBLE_ALLY_SIZE.height / 2;
    const r  = Math.min(COLLECTIBLE_ALLY_SIZE.width, COLLECTIBLE_ALLY_SIZE.height) / 2 * 0.8;

    body.clear();
    body.x      = cx; body.y = cy;
    body.rotation = 0;
    body.alpha  = 0.7 + 0.3 * Math.sin(Date.now() * 0.003);

    body.circle(0, 0, r).fill(C.BG).stroke({ color: C.STROKE, width: SW });
    this._weapon(body, 0, 0, r * 1.3, ca.allyType, C.STROKE);
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
    const { body, hud } = this._entity(enemy.id);
    body.zIndex = enemy.y + enemy.height;

    const cx  = enemy.x + enemy.width / 2;
    const cy  = enemy.y + enemy.height / 2;
    const sz  = Math.min(enemy.width, enemy.height) * 0.8;

    body.clear();
    body.x = cx; body.y = cy;
    const vel = enemy.velocity;
    body.rotation = vel && (vel.x !== 0 || vel.y !== 0) ? Math.atan2(vel.y, vel.x) : body.rotation;

    const sk  = { color: C.STROKE, width: SW };
    const skT = { color: C.STROKE, width: SWT };

    switch (enemy.enemyType) {
      case EnemyType.MELEE_GRUNT:
        body.rect(-sz / 2, -sz / 2, sz, sz).stroke(sk);
        break;
      case EnemyType.RANGED_SHOOTER:
        body.rect(-sz / 2, -sz / 2, sz, sz).stroke(sk);
        body.circle(sz * 0.4, 0, sz * 0.1).fill(C.STROKE);
        break;
      case EnemyType.ROCKET_TANK:
        body.rect(-sz / 2, -sz / 2, sz, sz).stroke(skT);
        body.rect(-sz * 0.3, -sz * 0.3, sz * 0.6, sz * 0.6).stroke(sk);
        body.moveTo(0, 0).lineTo(sz * 0.5, 0).stroke(skT);
        break;
      case EnemyType.AGILE_STALKER:
        body.moveTo(0, -sz / 2).lineTo(sz / 2, 0).lineTo(0, sz / 2).lineTo(-sz / 2, 0).closePath().stroke(sk);
        body.moveTo(-sz * 0.1, -sz * 0.15).quadraticCurveTo(sz * 0.2, 0, -sz * 0.1, sz * 0.15).stroke({ color: C.STROKE, width: 1 });
        body.moveTo(sz * 0.1, -sz * 0.15).quadraticCurveTo(-sz * 0.2, 0, sz * 0.1, sz * 0.15).stroke({ color: C.STROKE, width: 1 });
        break;
      case EnemyType.ENEMY_SNIPER: {
        const bw = sz * 0.8, bh = sz * 0.6;
        const bl = sz, bt = sz * 0.1;
        body.rect(-bw / 2, -bh / 2, bw, bh).stroke(sk);
        body.rect(bw / 2 - bt / 2, -bt / 2, bl, bt).fill(C.STROKE);
        break;
      }
      case EnemyType.ELECTRIC_DRONE:
        body.circle(0, 0, sz / 2).stroke(sk);
        body.circle(0, 0, sz / 3).fill({ color: C.LIGHTNING, alpha: 0.2 }).stroke(sk);
        for (const deg of [0, 90, 180, 270]) {
          const r2 = deg * Math.PI / 180;
          body.moveTo(0, 0).lineTo(Math.cos(r2) * (sz / 2 + sz * 0.1), Math.sin(r2) * (sz / 2 + sz * 0.1)).stroke({ color: C.STROKE, width: 1 });
        }
        break;
      case EnemyType.TUTORIAL_DUMMY:
        body.circle(0, 0, sz / 2).fill({ color: C.SUBTLE, alpha: 0.33 }).stroke(sk);
        body.moveTo(-sz / 3, -sz / 3).lineTo(sz / 3, sz / 3).stroke({ color: C.STROKE, width: 1 });
        body.moveTo(-sz / 3, sz / 3).lineTo(sz / 3, -sz / 3).stroke({ color: C.STROKE, width: 1 });
        break;
      default:
        body.rect(-sz / 2, -sz / 2, sz, sz).stroke(sk);
        break;
    }

    // Health bar (in hudLayer, world coords)
    hud.clear();
    if (enemy.health < enemy.maxHealth) {
      const bH = 4, bX = enemy.x, bY = enemy.y - bH - 2;
      hud.rect(bX, bY, enemy.width, bH).fill(C.SUBTLE);
      hud.rect(bX, bY, enemy.width * (enemy.health / enemy.maxHealth), bH).fill(C.HEALTH);
    }
  }

  // ── Projectile ───────────────────────────────────────────────────────────────
  private _proj(proj: Projectile): void {
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
      const bW = W * 0.7, bH = H * 0.7;
      const nH = H * 0.2, fH = H * 0.15, fW = W * 0.3;
      const bX = -bW / 2, bY = -H / 2 + nH;
      g.rotation = Math.PI / 2;  // airstrike falls downward
      g.moveTo(0, -H / 2).lineTo(bX, bY).lineTo(bX + bW, bY).closePath().fill(C.CRITICAL).stroke({ color: C.STROKE, width: SW });
      g.rect(bX, bY, bW, bH).fill(C.CRITICAL).stroke({ color: C.STROKE, width: SW });
      g.moveTo(bX, bY + bH).lineTo(bX - fW / 2, bY + bH + fH).lineTo(bX + fW / 2, bY + bH).fill(C.CRITICAL).stroke({ color: C.STROKE, width: SW });
      g.moveTo(bX + bW, bY + bH).lineTo(bX + bW + fW / 2, bY + bH + fH).lineTo(bX + bW - fW / 2, bY + bH).fill(C.CRITICAL).stroke({ color: C.STROKE, width: SW });

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
      const baseR = Math.min(proj.width, proj.height) / 2 * 0.8;
      g.circle(0, 0, baseR).fill(col);
      if ((proj.playerChainLightningLevel ?? 0) > 0) {
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.025);
        g.circle(0, 0, baseR * 1.6).stroke({ color: C.LIGHTNING, alpha: 0.5 + 0.3 * pulse, width: 1.5 });
        g.circle(0, 0, baseR * 2.4).stroke({ color: C.LIGHTNING, alpha: 0.2 * pulse, width: 0.8 });
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
    const col = this._hex(gold.color) ?? C.WARNING;
    // Animated outer glow using a slow sine pulse
    const pulse = 0.4 + 0.6 * Math.abs(Math.sin(Date.now() * 0.004 + cx * 0.05));
    g.clear();
    // Outer glow ring
    g.circle(cx, cy, r * 1.8).stroke({ color: col, alpha: 0.25 * pulse, width: 1 });
    // Filled coin body
    g.circle(cx, cy, r).fill({ color: col, alpha: 0.55 }).stroke({ color: col, width: SW });
    // Inner shine dot
    g.circle(cx - r * 0.25, cy - r * 0.25, r * 0.25).fill({ color: 0xFFFFFF, alpha: 0.35 });
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
    g.alpha = Math.max(0, mf.timer / 3);
    g.x = mf.x; g.y = mf.y;
    const baseAng = mf.angle * Math.PI / 180;   // mf.angle is stored in degrees → convert
    for (let i = 0; i < 4; i++) {
      const ang = baseAng + i * (Math.PI / 2) + (Math.random() - 0.5) * 0.3;
      const len = mf.size * (0.5 + Math.random() * 0.5);
      g.moveTo(0, 0).lineTo(Math.cos(ang) * len, Math.sin(ang) * len).stroke({ color: col, width: 1.5 });
    }
  }

  // ── Effect particle ───────────────────────────────────────────────────────────
  private _particle(ep: EffectParticle): void {
    const g   = this._gfx(ep.id, this.particlePool, this.effectLayer);
    const col = this._hex(ep.color) ?? C.STROKE;
    g.clear();
    g.alpha = ep.timer / ep.initialTimer;
    if (ep.type === 'shield_pulse') {
      g.circle(ep.x, ep.y, ep.size).stroke({ color: col, width: 1 });
    } else {
      g.rect(ep.x - ep.size / 2, ep.y - ep.size / 2, ep.size, ep.size).fill(col);
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

  // ── Hex string → Pixi number ──────────────────────────────────────────────────
  private _hex(hex: string): number | null {
    if (!hex || hex.length < 4) return null;
    const n = parseInt(hex.replace('#', ''), 16);
    return isNaN(n) ? null : n;
  }
}
