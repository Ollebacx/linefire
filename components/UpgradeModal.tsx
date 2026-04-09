import React, { useState } from 'react';
import { Upgrade, Player, UpgradeType, LogEntry } from '../types';
import { LockClosedIcon } from '@heroicons/react/24/solid';
import { INITIAL_LOG_DEFINITIONS } from '../constants';

interface UpgradeModalProps {
  player: Player;
  upgrades: Upgrade[];
  logs: LogEntry[];
  onPurchase: (upgrade: Upgrade) => void;
  onContinue: () => void;
  onGoToMenu: () => void;
}

type ShopTab = 'COMBAT' | 'SQUAD' | 'AIRSTRIKE' | 'SHIELD' | 'ALLIES' | 'MEDALS';

const TABS: { id: ShopTab; label: string }[] = [
  { id: 'COMBAT',    label: 'COMBAT'     },
  { id: 'SQUAD',     label: 'SQUAD'      },
  { id: 'AIRSTRIKE', label: 'AIR STRIKE' },
  { id: 'SHIELD',    label: 'SHIELD'     },
  { id: 'ALLIES',    label: 'ALLIES'     },
  { id: 'MEDALS',    label: 'MEDALS'     },
];

const TAB_UPGRADES: Record<Exclude<ShopTab, 'MEDALS'>, UpgradeType[]> = {
  COMBAT:    [UpgradeType.GLOBAL_DAMAGE_BOOST, UpgradeType.GLOBAL_FIRE_RATE_BOOST, UpgradeType.PLAYER_PROJECTILE_SPEED, UpgradeType.PLAYER_PIERCING_ROUNDS, UpgradeType.CHAIN_LIGHTNING_LEVEL, UpgradeType.WEAPON_TIER],
  SQUAD:     [UpgradeType.PLAYER_MAX_HEALTH, UpgradeType.PLAYER_SPEED, UpgradeType.GOLD_MAGNET, UpgradeType.SQUAD_SPACING, UpgradeType.INITIAL_ALLY_BOOST, UpgradeType.ALLY_HEALTH_BOOST],
  AIRSTRIKE: [UpgradeType.AIRSTRIKE_MISSILE_COUNT, UpgradeType.AIRSTRIKE_DAMAGE, UpgradeType.AIRSTRIKE_AOE],
  SHIELD:    [UpgradeType.UNLOCK_SHIELD_ABILITY, UpgradeType.SHIELD_DURATION, UpgradeType.SHIELD_RADIUS, UpgradeType.SHIELD_COOLDOWN_REDUCTION],
  ALLIES:    [UpgradeType.UNLOCK_SNIPER_ALLY, UpgradeType.UNLOCK_RPG_ALLY, UpgradeType.UNLOCK_FLAMER_ALLY, UpgradeType.UNLOCK_MINIGUNNER_ALLY],
};

const CYAN  = '#00E5FF';
const GREEN = '#00FF88';
const AMBER = '#FF9500';
const RED   = '#FF2055';
const DIM   = 'rgba(226,232,240,';

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  player, upgrades, logs, onPurchase, onContinue, onGoToMenu,
}) => {
  const [activeTab, setActiveTab] = useState<ShopTab>('COMBAT');
  const [focusedId, setFocusedId] = useState<UpgradeType | null>(null);

  const isShieldSub = (id: UpgradeType) =>
    [UpgradeType.SHIELD_DURATION, UpgradeType.SHIELD_RADIUS, UpgradeType.SHIELD_COOLDOWN_REDUCTION].includes(id);

  const getState = (u: Upgrade) => {
    const locked = isShieldSub(u.id) && !player.shieldAbilityUnlocked;
    const maxed  = u.currentLevel >= u.maxLevel;
    const afford = player.gold >= u.cost;
    return { locked, maxed, afford, disabled: locked || maxed || !afford };
  };

  const tabIds      = activeTab !== 'MEDALS' ? TAB_UPGRADES[activeTab] : [];
  const tabUpgrades = tabIds.map(id => upgrades.find(u => u.id === id)).filter(Boolean) as Upgrade[];
  const focused     = (focusedId ? upgrades.find(u => u.id === focusedId) : null) ?? tabUpgrades[0] ?? null;
  const unlockedCount = logs.filter(l => l.isUnlocked).length;

  const tabHasBuyable = (tab: ShopTab) => {
    if (tab === 'MEDALS') return false;
    return TAB_UPGRADES[tab].some(tid => {
      const u = upgrades.find(u => u.id === tid);
      if (!u) return false;
      const { locked, maxed, afford } = getState(u);
      return !locked && !maxed && afford;
    });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', flexDirection: 'column',
      background: 'radial-gradient(ellipse at 25% 15%, rgba(0,36,52,0.45) 0%, rgba(4,6,14,0) 55%), radial-gradient(ellipse at 75% 85%, rgba(0,18,36,0.35) 0%, rgba(4,6,14,0) 55%), #080A14',
      fontFamily: "'Inter', sans-serif",
      color: '#E2E8F0',
    }}>

      {/* HEADER */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'clamp(12px,3vw,20px) clamp(16px,4vw,32px)',
        borderBottom: '1px solid rgba(0,229,255,0.1)',
        flexShrink: 0,
      }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.6rem', letterSpacing: '0.22em', color: 'rgba(0,229,255,0.45)', fontWeight: 300, marginBottom: 3 }}>
            BETWEEN WAVES
          </p>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.3rem,4vw,2rem)', fontWeight: 100, letterSpacing: '0.22em', color: '#E2E8F0', textShadow: '0 0 30px rgba(0,229,255,0.12)' }}>
            ARMORY
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,149,0,0.07)', border: '1px solid rgba(255,149,0,0.22)', borderRadius: 8, padding: '8px 14px' }}>
          <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="#FF9500" strokeWidth="1.5"/>
            <line x1="7" y1="10" x2="13" y2="10" stroke="#FF9500" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="10" y1="7" x2="10" y2="13" stroke="#FF9500" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span style={{ color: AMBER, fontWeight: 300, fontSize: 'clamp(1rem,2.5vw,1.15rem)', letterSpacing: '0.05em' }}>
            {player.gold.toLocaleString()}
          </span>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', padding: '0 clamp(8px,2vw,24px)', borderBottom: '1px solid rgba(0,229,255,0.07)', overflowX: 'auto', flexShrink: 0 }}>
        {TABS.map(tab => {
          const active     = activeTab === tab.id;
          const hasBuyable = tabHasBuyable(tab.id);
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setFocusedId(null); }}
              style={{
                background: 'none', border: 'none', outline: 'none', cursor: 'pointer',
                padding: 'clamp(8px,2vw,12px) clamp(12px,2.5vw,20px)',
                fontSize: 'clamp(0.6rem,1.5vw,0.72rem)', fontWeight: active ? 400 : 300,
                letterSpacing: '0.18em',
                color: active ? CYAN : 'rgba(226,232,240,0.38)',
                borderBottom: active ? `2px solid ${CYAN}` : '2px solid transparent',
                transition: 'color 0.15s, border-color 0.15s',
                whiteSpace: 'nowrap', position: 'relative',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {tab.label}
              {hasBuyable && !active && (
                <span style={{ position: 'absolute', top: 8, right: 8, width: 5, height: 5, borderRadius: '50%', background: GREEN, boxShadow: '0 0 5px rgba(0,255,136,0.9)' }}/>
              )}
            </button>
          );
        })}
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: 'clamp(14px,3vw,24px) clamp(16px,4vw,32px)', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {activeTab === 'MEDALS' ? (
          /* ── MEDALS GRID ───────────────────────────────────────────────── */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(160px,26vw,220px), 1fr))', gap: 'clamp(8px,2vw,12px)' }}>
            {INITIAL_LOG_DEFINITIONS.map(def => {
              const logEntry = logs.find(l => l.id === def.id);
              const earned   = logEntry?.isUnlocked ?? false;
              const IconComp = def.icon;
              return (
                <div
                  key={def.id}
                  style={{
                    background: earned ? 'rgba(0,229,255,0.05)' : 'transparent',
                    border: `1px solid ${earned ? 'rgba(0,229,255,0.4)' : 'rgba(30,42,64,0.7)'}`,
                    borderRadius: 10,
                    padding: 'clamp(10px,2vw,14px) clamp(10px,2vw,14px)',
                    display: 'flex', flexDirection: 'column', gap: 6,
                    boxShadow: earned ? '0 0 14px rgba(0,229,255,0.1)' : 'none',
                    opacity: earned ? 1 : 0.55,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 6, flexShrink: 0,
                      background: earned ? 'rgba(0,229,255,0.1)' : 'rgba(30,42,64,0.5)',
                      border: `1px solid ${earned ? 'rgba(0,229,255,0.3)' : 'rgba(30,42,64,0.9)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {earned
                        ? <IconComp style={{ width: 16, height: 16, color: CYAN }}/>
                        : <LockClosedIcon style={{ width: 14, height: 14, color: 'rgba(226,232,240,0.2)' }}/>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 'clamp(0.62rem,1.5vw,0.72rem)', fontWeight: earned ? 400 : 300, color: earned ? CYAN : 'rgba(226,232,240,0.4)', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {def.name}
                      </p>
                      {earned && (
                        <p style={{ margin: 0, fontSize: '0.6rem', fontWeight: 600, color: AMBER, letterSpacing: '0.06em' }}>
                          EARNED ✓
                        </p>
                      )}
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: 'clamp(0.58rem,1.4vw,0.66rem)', fontWeight: 300, color: 'rgba(226,232,240,0.45)', lineHeight: 1.45 }}>
                    {def.description}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, paddingTop: 6, borderTop: '1px solid rgba(255,149,0,0.12)' }}>
                    <svg width="10" height="10" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="8" stroke="#FF9500" strokeWidth="1.5"/>
                      <line x1="7" y1="10" x2="13" y2="10" stroke="#FF9500" strokeWidth="1.5" strokeLinecap="round"/>
                      <line x1="10" y1="7" x2="10" y2="13" stroke="#FF9500" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <span style={{ fontSize: '0.62rem', fontWeight: earned ? 400 : 300, color: earned ? AMBER : 'rgba(255,149,0,0.4)', letterSpacing: '0.04em' }}>
                      {def.rewardDescription ?? ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <>
        {/* Card grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(108px,21vw,148px), 1fr))', gap: 'clamp(8px,2vw,12px)' }}>
          {tabUpgrades.map(upgrade => {
            const { locked, maxed, afford, disabled } = getState(upgrade);
            const isFocused = focused?.id === upgrade.id;
            const IconComponent = upgrade.icon;

            const s = maxed ? {
              border: 'rgba(0,255,136,0.42)', bg: 'rgba(0,255,136,0.04)',
              icon: GREEN, cost: GREEN, glow: '0 0 14px rgba(0,255,136,0.1)',
            } : locked ? {
              border: 'rgba(30,42,64,0.7)', bg: 'transparent',
              icon: `${DIM}0.18)`, cost: `${DIM}0.22)`, glow: 'none',
            } : !afford ? {
              border: 'rgba(255,32,85,0.18)', bg: 'transparent',
              icon: `${DIM}0.28)`, cost: RED, glow: 'none',
            } : {
              border: isFocused ? 'rgba(0,229,255,0.62)' : 'rgba(0,229,255,0.22)',
              bg: isFocused ? 'rgba(0,229,255,0.07)' : 'rgba(0,229,255,0.025)',
              icon: CYAN, cost: AMBER,
              glow: isFocused ? '0 0 22px rgba(0,229,255,0.16), inset 0 0 12px rgba(0,229,255,0.03)' : '0 0 8px rgba(0,229,255,0.05)',
            };

            return (
              <button
                key={upgrade.id}
                onClick={() => { setFocusedId(upgrade.id); if (!disabled) onPurchase(upgrade); }}
                onMouseEnter={() => setFocusedId(upgrade.id)}
                style={{
                  background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  boxShadow: s.glow !== 'none' ? s.glow : undefined,
                  opacity: locked ? 0.45 : 1, transition: 'all 0.15s ease',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: 'clamp(10px,2vw,14px) clamp(8px,1.5vw,12px)',
                  gap: 6, minHeight: 'clamp(100px,18vw,140px)', position: 'relative', outline: 'none',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {upgrade.maxLevel > 1 && (
                  <div style={{ position: 'absolute', top: 7, left: 8, right: 8, display: 'flex', gap: 2 }}>
                    {Array.from({ length: upgrade.maxLevel }).map((_, i) => (
                      <div key={i} style={{ flex: 1, height: 2, borderRadius: 2, background: i < upgrade.currentLevel ? (maxed ? GREEN : CYAN) : 'rgba(226,232,240,0.09)' }}/>
                    ))}
                  </div>
                )}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: upgrade.maxLevel > 1 ? 8 : 0 }}>
                  {locked
                    ? <LockClosedIcon style={{ width: 28, height: 28, color: 'rgba(226,232,240,0.18)' }}/>
                    : IconComponent && <IconComponent style={{ width: 28, height: 28, color: s.icon as string }}/>
                  }
                </div>
                <p style={{ margin: 0, textAlign: 'center', fontSize: 'clamp(0.58rem,1.4vw,0.68rem)', fontWeight: 300, lineHeight: 1.3, color: maxed ? GREEN : `${DIM}0.72)`, letterSpacing: '0.02em' }}>
                  {upgrade.name}
                </p>
                <p style={{ margin: 0, fontSize: 'clamp(0.62rem,1.6vw,0.72rem)', fontWeight: 600, color: s.cost as string, letterSpacing: '0.04em' }}>
                  {locked ? 'LOCKED' : maxed ? '✓ MAX' : `$${upgrade.cost.toLocaleString()}`}
                </p>
              </button>
            );
          })}
        </div>

        {/* Description panel */}
        {focused && (
          <div style={{ padding: 'clamp(12px,2.5vw,16px) clamp(14px,3vw,20px)', background: 'rgba(0,229,255,0.025)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: 10, flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8 }}>
              <span style={{ fontSize: 'clamp(0.72rem,2vw,0.85rem)', fontWeight: 400, color: CYAN, letterSpacing: '0.06em' }}>
                {focused.name}
              </span>
              {focused.maxLevel > 1 && (
                <span style={{ fontSize: '0.62rem', color: `${DIM}0.35)`, fontWeight: 300, whiteSpace: 'nowrap' }}>
                  LV {focused.currentLevel} / {focused.maxLevel}
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 'clamp(0.68rem,1.8vw,0.78rem)', fontWeight: 300, color: `${DIM}0.6)`, lineHeight: 1.55 }}>
              {focused.description}
            </p>
          </div>
        )}
          </>
        )}

      </div>

      {/* MILESTONES STRIP */}
      <div style={{ padding: 'clamp(8px,2vw,10px) clamp(16px,4vw,32px)', borderTop: '1px solid rgba(0,229,255,0.06)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: '0.58rem', fontWeight: 300, letterSpacing: '0.18em', color: `${DIM}0.28)`, whiteSpace: 'nowrap' }}>
          MILESTONES
        </span>
        <div style={{ display: 'flex', gap: 3, flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {logs.map(log => {
            const LogIcon = log.icon;
            return (
              <div
                key={log.id}
                title={log.isUnlocked ? `✓ ${log.name}: ${log.description}` : `${log.name}: ${log.description}`}
                style={{
                  width: 22, height: 22, borderRadius: 4,
                  border: `1px solid ${log.isUnlocked ? 'rgba(0,229,255,0.38)' : 'rgba(30,42,64,0.7)'}`,
                  background: log.isUnlocked ? 'rgba(0,229,255,0.09)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'default',
                  boxShadow: log.isUnlocked ? '0 0 5px rgba(0,229,255,0.1)' : 'none',
                }}
              >
                {log.isUnlocked && <LogIcon style={{ width: 11, height: 11, color: CYAN }}/>}
              </div>
            );
          })}
        </div>
        <span style={{ fontSize: '0.62rem', fontWeight: 300, color: `${DIM}0.3)`, whiteSpace: 'nowrap' }}>
          {unlockedCount}/{logs.length}
        </span>
      </div>

      {/* FOOTER */}
      <div style={{ display: 'flex', gap: 10, padding: 'clamp(10px,2.5vw,14px) clamp(16px,4vw,32px) clamp(16px,4vw,24px)', borderTop: '1px solid rgba(0,229,255,0.07)', flexShrink: 0 }}>
        <button
          onClick={onGoToMenu}
          onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = 'rgba(226,232,240,0.3)'; b.style.color = '#E2E8F0'; }}
          onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = 'rgba(226,232,240,0.13)'; b.style.color = 'rgba(226,232,240,0.42)'; }}
          style={{ flex: 1, padding: 'clamp(10px,2vw,13px)', background: 'none', border: '1px solid rgba(226,232,240,0.13)', borderRadius: 8, cursor: 'pointer', color: 'rgba(226,232,240,0.42)', fontSize: 'clamp(0.65rem,1.8vw,0.75rem)', letterSpacing: '0.18em', fontWeight: 300, fontFamily: "'Inter', sans-serif", transition: 'all 0.15s' }}
        >
          EXIT
        </button>
        <button
          onClick={onContinue}
          onMouseEnter={e => { const b = e.currentTarget; b.style.background = 'rgba(0,229,255,0.14)'; b.style.boxShadow = '0 0 32px rgba(0,229,255,0.22)'; }}
          onMouseLeave={e => { const b = e.currentTarget; b.style.background = 'rgba(0,229,255,0.08)'; b.style.boxShadow = '0 0 24px rgba(0,229,255,0.1), inset 0 1px 0 rgba(0,229,255,0.08)'; }}
          style={{ flex: 2, padding: 'clamp(10px,2vw,13px)', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.38)', borderRadius: 8, cursor: 'pointer', color: CYAN, fontSize: 'clamp(0.65rem,1.8vw,0.75rem)', letterSpacing: '0.22em', fontWeight: 400, fontFamily: "'Inter', sans-serif", boxShadow: '0 0 24px rgba(0,229,255,0.1), inset 0 1px 0 rgba(0,229,255,0.08)', transition: 'all 0.15s' }}
        >
          ADVANCE →
        </button>
      </div>
    </div>
  );
};
