
import React, { useState, useRef } from 'react';
import { Upgrade, Player, UpgradeType, LogEntry } from '../types';
import { LockClosedIcon } from '@heroicons/react/24/solid';
import { UI_BACKGROUND_NEUTRAL, UI_STROKE_PRIMARY, UI_STROKE_SECONDARY, UI_ACCENT_SUBTLE, UI_ACCENT_CRITICAL } from '../constants';

interface UpgradeModalProps {
  player: Player;
  upgrades: Upgrade[];
  logs: LogEntry[];
  onPurchase: (upgrade: Upgrade) => void;
  onContinue: () => void;
  onGoToMenu: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ player, upgrades, logs, onPurchase, onContinue, onGoToMenu }) => {
  const modalContentRef = useRef<HTMLDivElement>(null);

  const [augmentHoverDetail, setAugmentHoverDetail] = useState<string | null>(null);
  const [logHoverDetail, setLogHoverDetail] = useState<string | null>(null);

  const isAllyUnlockUpgrade = (id: UpgradeType): boolean => {
    return [
      UpgradeType.UNLOCK_FLAMER_ALLY,
      UpgradeType.UNLOCK_MINIGUNNER_ALLY,
      UpgradeType.UNLOCK_RPG_ALLY,
      UpgradeType.UNLOCK_SNIPER_ALLY
    ].includes(id);
  };

  const unlockedLogsCount = logs.filter(log => log.isUnlocked).length;
  const totalLogsCount = logs.length;
  const logsPercentage = totalLogsCount > 0 ? Math.floor((unlockedLogsCount / totalLogsCount) * 100) : 0;

  const defaultAugmentMessage = "Hover over an augment for details.";
  const defaultLogMessage = "Hover over a log entry for details.";

  const getDynamicDescriptionAreaStyle = (isHovered: boolean): React.CSSProperties => ({
    fontFamily: "'Inter', sans-serif", fontWeight: '300',
    border: isHovered ? `1.5px dashed ${UI_ACCENT_SUBTLE}` : '1.5px solid transparent',
    backgroundColor: isHovered ? `${UI_ACCENT_SUBTLE}22` : 'transparent',
    color: isHovered ? UI_STROKE_PRIMARY : UI_STROKE_SECONDARY,
    transition: 'background-color 0.1s ease-in-out, border-color 0.1s ease-in-out, color 0.1s ease-in-out',
  });

  const titleStyle: React.CSSProperties = { fontFamily: "'Inter', sans-serif", fontWeight: '700', textTransform: 'uppercase' };
  const textStyle: React.CSSProperties = { fontFamily: "'Inter', sans-serif", fontWeight: '400' };
  const lightTextStyle: React.CSSProperties = { fontFamily: "'Inter', sans-serif", fontWeight: '300' };
  const costStyle: React.CSSProperties = { fontFamily: "'Inter', sans-serif", fontWeight: '600' };
  const logNameStyle: React.CSSProperties = { fontFamily: "'Inter', sans-serif", fontWeight: '400' };


  return (
    <div 
        className="fixed inset-0 flex items-center justify-center z-50" 
        style={{ backgroundColor: 'transparent'}} 
    >
      <div
        ref={modalContentRef}
        className="flex flex-col p-3 sm:p-4 rounded-lg w-[90vw] max-w-5xl max-h-[90vh] sm:max-h-[95vh]"
        style={{ backgroundColor: UI_BACKGROUND_NEUTRAL, border: `1.5px solid ${UI_STROKE_PRIMARY}`, color: UI_STROKE_PRIMARY }}
      >
        {/* Scrollable Content Area */}
        <div className="flex-grow overflow-y-auto pr-1 sm:pr-2">
          {/* SHOP Panel */}
          <div className="p-3 sm:p-4 rounded-md mb-3 sm:mb-4" style={{border: `1.5px solid ${UI_STROKE_SECONDARY}`}}>
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h2 className="text-xl sm:text-2xl" style={titleStyle}>SYSTEM AUGMENTS</h2>
              <div className="flex items-center text-xl sm:text-2xl" style={{...titleStyle, fontWeight: '700'}}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1.5">
                  <circle cx="10" cy="10" r="8" stroke={UI_STROKE_PRIMARY} strokeWidth="1.5"/>
                  <line x1="7" y1="10" x2="13" y2="10" stroke={UI_STROKE_PRIMARY} strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="10" y1="7" x2="10" y2="13" stroke={UI_STROKE_PRIMARY} strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {player.coins}
              </div>
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-9 xl:grid-cols-10 gap-1.5 sm:gap-2">
              {upgrades.map((upgrade) => {
                const isMaxed = upgrade.currentLevel >= upgrade.maxLevel;
                const canAfford = player.coins >= upgrade.cost;
                const isEffectivelyDisabled = isMaxed || !canAfford;
                const IconComponent = upgrade.icon;

                return (
                  <button
                    key={upgrade.id}
                    onClick={() => {
                      if (isEffectivelyDisabled) return;
                      onPurchase(upgrade);
                    }}
                    onMouseEnter={() => setAugmentHoverDetail(`${upgrade.name}: ${upgrade.description}`)}
                    onMouseLeave={() => setAugmentHoverDetail(null)}
                    className={`relative p-2.5 flex flex-col items-center justify-between rounded-md transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-offset-transparent`}
                    style={{
                      border: `1.5px solid ${isEffectivelyDisabled ? UI_ACCENT_SUBTLE : UI_STROKE_SECONDARY}`,
                      backgroundColor: UI_BACKGROUND_NEUTRAL,
                      opacity: isMaxed ? 0.7 : 1, 
                      cursor: isEffectivelyDisabled ? 'not-allowed' : 'pointer',
                    }}
                    aria-label={`Upgrade ${upgrade.name}. Cost: ${isMaxed ? 'Maxed' : upgrade.cost}. Level: ${upgrade.currentLevel}/${upgrade.maxLevel}. ${upgrade.description}`}
                    aria-disabled={isEffectivelyDisabled}
                  >
                    <div className="absolute top-1 left-1 right-1 flex justify-center space-x-0.5 h-1.5"> 
                      {upgrade.maxLevel > 1 && Array.from({ length: upgrade.maxLevel }).map((_, i) => (
                        <div
                          key={i}
                          className="w-2 h-1.5 rounded-sm" 
                          style={{ backgroundColor: i < upgrade.currentLevel ? UI_STROKE_PRIMARY : UI_ACCENT_SUBTLE }}
                          aria-hidden="true"
                        ></div>
                      ))}
                    </div>
                    <div className="flex-grow flex items-center justify-center w-full mt-2.5"> 
                      {IconComponent && <IconComponent className="w-1/2 h-1/2" style={{color: isMaxed ? UI_STROKE_SECONDARY : (canAfford ? UI_STROKE_PRIMARY : UI_ACCENT_SUBTLE) }} aria-hidden="true" />}
                    </div>
                    <div className="text-center w-full">
                      <p className="text-sm leading-snug mt-0.5" style={{...lightTextStyle, color: UI_STROKE_SECONDARY}}>{isAllyUnlockUpgrade(upgrade.id) ? upgrade.name.replace('Acquire ', '').replace(' Unit', '') : upgrade.name}</p>
                      <div className="text-sm">
                        {isMaxed ? (
                          <span style={{...costStyle, color: UI_STROKE_SECONDARY }}>MAX</span>
                        ) : (
                          <span style={{...costStyle, color: canAfford ? UI_STROKE_PRIMARY : UI_ACCENT_CRITICAL }}>${upgrade.cost}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div 
              className="mt-2 sm:mt-3 p-2 rounded-md text-xs sm:text-sm min-h-[3.5em] text-left"
              style={getDynamicDescriptionAreaStyle(!!augmentHoverDetail)}
            >
              {augmentHoverDetail || defaultAugmentMessage}
            </div>
          </div>

          {/* LOGS Panel */}
          <div className="p-3 sm:p-4 rounded-md" style={{border: `1.5px solid ${UI_STROKE_SECONDARY}`}}>
            <div className="flex justify-between items-center mb-2 sm:mb-3">
              <h2 className="text-lg sm:text-xl" style={{...titleStyle, fontWeight: '600'}}>LOGS</h2>
              <span className="text-lg sm:text-xl" style={{...titleStyle, fontWeight: '600', color: UI_STROKE_PRIMARY}}>{logsPercentage}%</span>
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-9 xl:grid-cols-10 gap-1.5 sm:gap-2 mb-2">
              {logs.map((log) => {
                const LogIcon = log.isUnlocked ? log.icon : LockClosedIcon;
                return (
                  <div
                    key={log.id}
                    className="flex flex-col items-center justify-center rounded-md p-2.5"
                    style={{
                        border: `1.5px solid ${log.isUnlocked ? UI_STROKE_PRIMARY : UI_ACCENT_SUBTLE}`,
                        backgroundColor: log.isUnlocked ? `${UI_STROKE_PRIMARY}15` : UI_BACKGROUND_NEUTRAL,
                        cursor: 'default'
                    }}
                    onMouseEnter={() => {
                        if (log.isUnlocked) {
                            setLogHoverDetail(`${log.name}: ${log.description}`);
                        } else {
                            setLogHoverDetail(`LOCKED: ${log.name} - ${log.description}`);
                        }
                    }}
                    onMouseLeave={() => setLogHoverDetail(null)}
                    aria-label={log.isUnlocked ? `${log.name}: ${log.description}` : `Locked Log: ${log.name} - ${log.description}`}
                    role="img"
                    tabIndex={-1} 
                  >
                    <LogIcon
                      className="w-1/2 h-1/2" 
                      style={{ color: log.isUnlocked ? UI_STROKE_PRIMARY : UI_ACCENT_SUBTLE }}
                      aria-hidden="true"
                    />
                     <p className="text-xs sm:text-sm leading-snug text-center mt-0.5 w-full" style={{...logNameStyle, color: log.isUnlocked ? UI_STROKE_PRIMARY : UI_STROKE_SECONDARY}}>
                        {log.name}
                     </p>
                  </div>
                );
              })}
            </div>
            <div 
              className="mt-2 sm:mt-3 p-2 rounded-md text-xs sm:text-sm min-h-[3.5em] text-left"
              style={getDynamicDescriptionAreaStyle(!!logHoverDetail)}
            >
              {logHoverDetail || defaultLogMessage}
            </div>
            <p className="text-center text-xs sm:text-sm mt-1" style={{...lightTextStyle, color: UI_STROKE_SECONDARY}}>
              {unlockedLogsCount} / {totalLogsCount} LOG ENTRIES COMPILED
            </p>
          </div>
        </div>

        {/* Fixed Footer Buttons */}
        <div className="mt-auto pt-2 sm:pt-3 flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 sm:space-x-2">
          <button onClick={onGoToMenu} className="w-full sm:flex-1 btn-minimal">EXIT</button>
          <button onClick={onContinue} className="w-full sm:flex-1 btn-minimal btn-primary-minimal">CONTINUE</button>
        </div>
      </div>
    </div>
  );
};