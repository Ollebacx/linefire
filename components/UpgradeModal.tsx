
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
  const costStyleBase: React.CSSProperties = { fontFamily: "'Inter', sans-serif", fontWeight: '600' };


  return (
    <div 
        className="fixed inset-0 flex items-center justify-center z-50 p-2"  // Reduced base padding
        style={{ backgroundColor: 'transparent'}} 
    >
      <div
        ref={modalContentRef}
        className="flex flex-col p-2 sm:p-3 md:p-4 rounded-lg w-[95vw] sm:w-[90vw] max-w-5xl max-h-[95vh] sm:max-h-[90vh]" // Adjusted width and max-height
        style={{ backgroundColor: UI_BACKGROUND_NEUTRAL, border: `1.5px solid ${UI_STROKE_PRIMARY}`, color: UI_STROKE_PRIMARY }}
      >
        {/* Scrollable Content Area */}
        <div className="flex-grow overflow-y-auto pr-1 sm:pr-2"> {/* Keep pr for scrollbar */}
          {/* SHOP Panel */}
          <div className="p-2 sm:p-3 md:p-4 rounded-md mb-2 sm:mb-3" style={{border: `1.5px solid ${UI_STROKE_SECONDARY}`}}>
            <div className="flex justify-between items-center mb-2 sm:mb-3">
              <h2 className="text-lg sm:text-xl md:text-2xl" style={titleStyle}>SYSTEM AUGMENTS</h2>
              <div className="flex items-center text-lg sm:text-xl md:text-2xl" style={{...titleStyle, fontWeight: '700'}}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1 sm:mr-1.5">
                  <circle cx="10" cy="10" r="8" stroke={UI_STROKE_PRIMARY} strokeWidth="1.5"/>
                  <line x1="7" y1="10" x2="13" y2="10" stroke={UI_STROKE_PRIMARY} strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="10" y1="7" x2="10" y2="13" stroke={UI_STROKE_PRIMARY} strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {player.gold}
              </div>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1 sm:gap-1.5 md:gap-2"> {/* Adjusted grid cols and gap */}
              {upgrades.map((upgrade) => {
                const isShieldSubUpgrade = [
                    UpgradeType.SHIELD_DURATION,
                    UpgradeType.SHIELD_RADIUS,
                    UpgradeType.SHIELD_COOLDOWN_REDUCTION
                ].includes(upgrade.id);

                const isLockedByPrerequisite = isShieldSubUpgrade && !player.shieldAbilityUnlocked;
                const isMaxed = upgrade.currentLevel >= upgrade.maxLevel;
                const canAfford = player.gold >= upgrade.cost;
                const isEffectivelyDisabled = isMaxed || !canAfford || isLockedByPrerequisite;
                const IconComponent = upgrade.icon;

                return (
                  <button
                    key={upgrade.id}
                    onClick={() => {
                      if (isEffectivelyDisabled) return;
                      onPurchase(upgrade);
                    }}
                    onMouseEnter={() => {
                        if (isLockedByPrerequisite) {
                            setAugmentHoverDetail(`Requires "Deployable Shield Emitter" to be unlocked first.`);
                        } else {
                            setAugmentHoverDetail(`${upgrade.name}: ${upgrade.description}`);
                        }
                    }}
                    onMouseLeave={() => setAugmentHoverDetail(null)}
                    className={`relative p-1.5 sm:p-2 md:p-2.5 flex flex-col items-center justify-between rounded-md transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-offset-transparent`}
                    style={{
                      border: `1.5px solid ${isEffectivelyDisabled ? UI_ACCENT_SUBTLE : UI_STROKE_SECONDARY}`,
                      backgroundColor: UI_BACKGROUND_NEUTRAL,
                      opacity: (isMaxed || isLockedByPrerequisite) ? 0.7 : 1,
                      cursor: isEffectivelyDisabled ? 'not-allowed' : 'pointer',
                    }}
                    aria-label={`Upgrade ${upgrade.name}. Cost: ${isMaxed ? 'Maxed' : upgrade.cost}. Level: ${upgrade.currentLevel}/${upgrade.maxLevel}. ${upgrade.description}`}
                    aria-disabled={isEffectivelyDisabled}
                  >
                    <div className="absolute top-0.5 sm:top-1 left-1 right-1 flex justify-center space-x-0.5 h-1 sm:h-1.5"> {/* Adjusted top and height */}
                      {upgrade.maxLevel > 1 && Array.from({ length: upgrade.maxLevel }).map((_, i) => (
                        <div
                          key={i}
                          className="w-1.5 sm:w-2 h-1 sm:h-1.5 rounded-sm" // Adjusted size
                          style={{ backgroundColor: i < upgrade.currentLevel ? UI_STROKE_PRIMARY : UI_ACCENT_SUBTLE }}
                          aria-hidden="true"
                        ></div>
                      ))}
                    </div>
                    <div className="flex-grow flex items-center justify-center w-full mt-1.5 sm:mt-2.5"> {/* Adjusted margin top */}
                       {isLockedByPrerequisite ? (
                            <LockClosedIcon className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" style={{ color: UI_ACCENT_SUBTLE }} />
                        ) : (
                            IconComponent && <IconComponent className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" style={{color: isMaxed ? UI_STROKE_SECONDARY : (canAfford ? UI_STROKE_PRIMARY : UI_ACCENT_SUBTLE) }} aria-hidden="true" />
                        )}
                    </div>
                    <div className="text-center w-full">
                      <p className="text-[0.6rem] leading-tight sm:text-xs md:text-sm sm:leading-snug mt-0.5" style={{...lightTextStyle, color: UI_STROKE_SECONDARY}}>{isAllyUnlockUpgrade(upgrade.id) ? upgrade.name.replace('Acquire ', '').replace(' Unit', '') : upgrade.name}</p>
                      <div className="text-[0.6rem] sm:text-xs md:text-sm">
                        {isLockedByPrerequisite ? (
                           <span style={{...costStyleBase, color: UI_STROKE_SECONDARY }}>LOCKED</span>
                        ) : isMaxed ? (
                          <span style={{...costStyleBase, color: UI_STROKE_SECONDARY }}>MAX</span>
                        ) : (
                          <span style={{...costStyleBase, color: canAfford ? UI_STROKE_PRIMARY : UI_ACCENT_CRITICAL }}>${upgrade.cost}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div 
              className="mt-2 sm:mt-3 p-1.5 sm:p-2 rounded-md text-[0.65rem] sm:text-xs md:text-sm min-h-[3em] sm:min-h-[3.5em] text-left" // Adjusted padding and font size
              style={getDynamicDescriptionAreaStyle(!!augmentHoverDetail)}
            >
              {augmentHoverDetail || defaultAugmentMessage}
            </div>
          </div>

          {/* LOGS Panel */}
          <div className="p-2 sm:p-3 md:p-4 rounded-md" style={{border: `1.5px solid ${UI_STROKE_SECONDARY}`}}>
            <div className="flex justify-between items-center mb-1.5 sm:mb-2 md:mb-3">
              <h2 className="text-md sm:text-lg md:text-xl" style={{...titleStyle, fontWeight: '600'}}>LOGS</h2>
              <span className="text-md sm:text-lg md:text-xl" style={{...titleStyle, fontWeight: '600', color: UI_STROKE_PRIMARY}}>{logsPercentage}%</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1 sm:gap-1.5 md:gap-2 mb-1.5 sm:mb-2"> {/* Adjusted grid and gap */}
              {logs.map((log) => {
                const LogIcon = log.isUnlocked ? log.icon : LockClosedIcon;
                return (
                  <div
                    key={log.id}
                    className="flex flex-col items-center justify-center rounded-md p-1.5 sm:p-2 md:p-2.5" // Adjusted padding
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
                      className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" // Adjusted icon size
                      style={{ color: log.isUnlocked ? UI_STROKE_PRIMARY : UI_ACCENT_SUBTLE }}
                      aria-hidden="true"
                    />
                     <p className="text-[0.55rem] leading-tight sm:text-[0.6rem] md:text-xs text-center mt-0.5 w-full" style={{...lightTextStyle, color: log.isUnlocked ? UI_STROKE_PRIMARY : UI_STROKE_SECONDARY}}> {/* Adjusted font size */}
                        {log.name}
                     </p>
                  </div>
                );
              })}
            </div>
            <div 
              className="mt-2 sm:mt-3 p-1.5 sm:p-2 rounded-md text-[0.65rem] sm:text-xs md:text-sm min-h-[3em] sm:min-h-[3.5em] text-left" // Adjusted padding and font size
              style={getDynamicDescriptionAreaStyle(!!logHoverDetail)}
            >
              {logHoverDetail || defaultLogMessage}
            </div>
            <p className="text-center text-[0.65rem] sm:text-xs mt-1 sm:mt-1.5" style={{...lightTextStyle, color: UI_STROKE_SECONDARY}}> {/* Adjusted font size and margin */}
              {unlockedLogsCount} / {totalLogsCount} LOG ENTRIES COMPILED
            </p>
          </div>
        </div>

        {/* Fixed Footer Buttons */}
        <div className="mt-auto pt-1.5 sm:pt-2 md:pt-3 flex flex-col sm:flex-row justify-between items-center space-y-1.5 sm:space-y-0 sm:space-x-2"> {/* Adjusted padding and spacing */}
          <button onClick={onGoToMenu} className="w-full sm:flex-1 btn-minimal text-xs sm:text-sm md:text-base py-1.5 sm:py-2">EXIT</button> {/* Adjusted padding and font size */}
          <button onClick={onContinue} className="w-full sm:flex-1 btn-minimal btn-primary-minimal text-xs sm:text-sm md:text-base py-1.5 sm:py-2">CONTINUE</button> {/* Adjusted padding and font size */}
        </div>
      </div>
    </div>
  );
};