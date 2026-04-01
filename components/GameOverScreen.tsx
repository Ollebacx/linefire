import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Player } from '../types';
import { UI_STROKE_PRIMARY, UI_STROKE_SECONDARY } from '../constants';
import { submitScore, recordRun, fetchLeaderboard } from '../src/services/apiClient';
import type { LeaderboardEntry } from '../src/services/apiClient';
import { getPlayerName } from '../src/services/session';
import { saveBestWave } from './StartScreen';

interface GameOverScreenProps {
  player: Player;
  round: number;
  onGoToMenu: () => void;
  onGoToShop: () => void;
  onRetry: () => void;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ player, round, onGoToMenu, onGoToShop, onRetry }) => {
  const moneyCollected   = player.currentRunGoldEarned;
  const enemiesKilled    = player.currentRunKills;
  const highestKillCombo = player.highestComboCount || 0;
  const biggestSquad     = player.maxSquadSizeAchieved || 0;

  const enemiesKilledScore    = enemiesKilled * 10;
  const highestKillComboScore = highestKillCombo * 100;
  const biggestSquadScore     = biggestSquad * 100;
  const totalScore = moneyCollected + enemiesKilledScore + highestKillComboScore + biggestSquadScore;

  const [period,     setPeriod]     = useState<'all' | 'weekly'>('all');
  const [allEntries, setAllEntries] = useState<LeaderboardEntry[]>([]);
  const [myEntryId,  setMyEntryId]  = useState<string | null>(null);
  const [loadingLb,  setLoadingLb]  = useState(false);
  const [copied,     setCopied]     = useState(false);
  const submitted = useRef(false);

  // Submit once on mount
  useEffect(() => {
    if (submitted.current) return;
    submitted.current = true;
    saveBestWave(round);
    const playerName = getPlayerName();
    const runId      = uuidv4();
    (async () => {
      try { await recordRun({ playerName, round, kills: enemiesKilled, gold: moneyCollected, combo: highestKillCombo }); } catch { /**/ }
      try {
        const { id } = await submitScore({ playerName, score: totalScore, round, kills: enemiesKilled, runId });
        setMyEntryId(id);
      } catch { /**/ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch leaderboard whenever period changes
  useEffect(() => {
    let cancelled = false;
    setLoadingLb(true);
    fetchLeaderboard(period)
      .then(entries => { if (!cancelled) setAllEntries(entries); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingLb(false); });
    return () => { cancelled = true; };
  }, [period]);

  const handleShare = () => {
    const rank = myRank !== null ? ` · Rank #${myRank}` : '';
    const text = [
      `🔥 LINEFIRE — Round ${round}${rank}`,
      `Score ${totalScore.toLocaleString()} · ${enemiesKilled} kills · Combo ×${highestKillCombo} · Squad ${biggestSquad}`,
      window.location.href,
    ].join('\n');
    navigator.clipboard.writeText(text)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => {});
  };

  const displayEntries = allEntries.slice(0, 10);
  const myRankIdx      = myEntryId ? allEntries.findIndex(e => e.id === myEntryId) : -1;
  const myRank         = myRankIdx >= 0 ? myRankIdx + 1 : null;

  const font: React.CSSProperties = { fontFamily: "'Inter', sans-serif" };
  const statRow    = 'flex justify-between items-baseline text-md sm:text-lg py-1';
  const labelStyle: React.CSSProperties = { ...font, fontWeight: '400', textAlign: 'left', flexShrink: 0 };
  const valueBox   = 'flex items-baseline justify-end ml-2 flex-grow';
  const valueStyle: React.CSSProperties = { ...font, fontWeight: '600', textAlign: 'right' };
  const multStyle: React.CSSProperties  = { ...font, fontSize: '0.75rem', fontWeight: '400', color: UI_STROKE_SECONDARY, marginLeft: '0.5rem', width: '50px', textAlign: 'left' };

  const tabBtn = (active: boolean): React.CSSProperties => ({
    ...font, fontSize: '0.65rem', fontWeight: active ? '600' : '400',
    letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.2rem 0.7rem',
    border: `1px solid ${active ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: '3px', cursor: 'pointer', background: 'transparent',
    color: active ? UI_STROKE_PRIMARY : UI_STROKE_SECONDARY, transition: 'all 0.15s',
  });

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog" aria-labelledby="game-over-title">
      <div
        className="p-5 sm:p-6 md:p-8 rounded-lg w-full max-w-md sm:max-w-lg text-center shadow-xl overflow-y-auto max-h-[95vh]"
        style={{ backgroundColor: '#0D1220', border: '1.5px solid rgba(255,32,85,0.5)', color: UI_STROKE_PRIMARY, boxShadow: '0 0 40px rgba(255,32,85,0.12), 0 8px 32px rgba(0,0,0,0.6)' }}
      >
        <h1 id="game-over-title" className="text-4xl sm:text-5xl mb-6 sm:mb-8 uppercase"
          style={{ ...font, fontWeight: '100', color: UI_STROKE_PRIMARY, textShadow: '0 0 30px rgba(255,32,85,0.7), 0 0 8px rgba(255,32,85,0.4)' }}>
          GAME OVER
        </h1>

        {/* Run stats */}
        <div className="space-y-1 mb-6 sm:mb-8 text-left px-2 sm:px-4">
          {[
            { label: 'MONEY COLLECTED:', val: moneyCollected, mult: '' },
            { label: 'ENEMIES KILLED:',  val: enemiesKilled,  mult: '[X10]' },
            { label: 'HIGHEST KILL COMBO:', val: highestKillCombo, mult: '[X100]' },
            { label: 'BIGGEST SQUAD:',   val: biggestSquad,   mult: '[X100]' },
          ].map(({ label, val, mult }) => (
            <div key={label} className={statRow}>
              <span style={labelStyle}>{label}</span>
              <div className={valueBox}>
                <span style={valueStyle}>{val}</span>
                <span style={multStyle}>{mult}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Total score */}
        <div className="mb-6 sm:mb-8">
          <p className="text-xl sm:text-2xl" style={{ ...font, fontWeight: '300', color: UI_STROKE_SECONDARY, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Total Score
          </p>
          <p className="text-3xl sm:text-4xl" style={{ ...font, fontWeight: '100', color: '#FF9500', textShadow: '0 0 22px rgba(255,149,0,0.75)' }}>
            {totalScore.toLocaleString()}
          </p>
          {myRank !== null && (
            <p className="mt-1 text-sm" style={{ ...font, color: '#00FFCC', fontWeight: '500', letterSpacing: '0.08em' }}>
              GLOBAL RANK #{myRank}
            </p>
          )}
        </div>

        {/* Leaderboard with period toggle */}
        <div className="mb-6 text-left" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-widest" style={{ ...font, color: UI_STROKE_SECONDARY }}>Leaderboard</p>
            <div className="flex gap-1">
              <button style={tabBtn(period === 'all')}    onClick={() => setPeriod('all')}>All Time</button>
              <button style={tabBtn(period === 'weekly')} onClick={() => setPeriod('weekly')}>This Week</button>
            </div>
          </div>
          {loadingLb ? (
            <p className="text-xs text-center py-3" style={{ ...font, color: UI_STROKE_SECONDARY }}>Loading…</p>
          ) : displayEntries.length === 0 ? (
            <p className="text-xs text-center py-3" style={{ ...font, color: UI_STROKE_SECONDARY }}>No entries yet</p>
          ) : (
            <div className="space-y-0.5">
              {displayEntries.map((entry, i) => {
                const isMe = entry.id === myEntryId;
                return (
                  <div key={entry.id}
                    className="flex items-center justify-between text-xs sm:text-sm px-2 py-1 rounded"
                    style={{
                      background: isMe ? 'rgba(255,149,0,0.10)' : i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                      border: isMe ? '1px solid rgba(255,149,0,0.35)' : '1px solid transparent',
                    }}
                  >
                    <span style={{ ...font, color: isMe ? '#FF9500' : UI_STROKE_SECONDARY, width: '24px', flexShrink: 0 }}>#{i + 1}</span>
                    <span className="flex-1 mx-2 truncate" style={{ ...font, color: isMe ? '#FF9500' : UI_STROKE_PRIMARY, fontWeight: isMe ? '600' : '400' }}>
                      {entry.player_name}
                    </span>
                    <span style={{ ...font, color: isMe ? '#FF9500' : UI_STROKE_PRIMARY, fontWeight: '600' }}>
                      {Number(entry.score).toLocaleString()}
                    </span>
                    <span className="ml-2" style={{ ...font, color: UI_STROKE_SECONDARY, width: '30px', textAlign: 'right', flexShrink: 0 }}>
                      R{entry.round}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <button onClick={onGoToMenu}  className="btn-minimal w-full py-2.5 sm:py-3 text-sm sm:text-md">MENU</button>
          <button onClick={onGoToShop}  className="btn-minimal w-full py-2.5 sm:py-3 text-sm sm:text-md">SHOP</button>
          <button onClick={onRetry}     className="btn-minimal w-full py-2.5 sm:py-3 text-sm sm:text-md">RETRY</button>
          <button onClick={handleShare} className="btn-minimal w-full py-2.5 sm:py-3 text-sm sm:text-md">
            {copied ? '✓ COPIED' : 'SHARE'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverScreen;
