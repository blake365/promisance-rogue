import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { client } from '@/api/client';
import { Panel } from '@/components/ui';
import { formatNumber } from '@/utils/format';
import type { LeaderboardEntry, Race } from '@/types';

type TimeFilter = 'all' | 'weekly' | 'daily';

const RACE_COLORS: Record<Race, string> = {
  human: 'text-gray-300',
  elf: 'text-runes',
  dwarf: 'text-amber-400',
  troll: 'text-red-400',
  gnome: 'text-gold',
  gremlin: 'text-food',
  orc: 'text-orange-400',
  drow: 'text-purple-400',
  goblin: 'text-lime-400',
};

export function LeaderboardPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  useEffect(() => {
    fetchLeaderboard();
  }, [timeFilter]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);

    try {
      // The API supports timeframe filter
      const data = await client.getLeaderboard(timeFilter === 'all' ? undefined : timeFilter);
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      // Use placeholder data on error
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return { icon: '🥇', color: 'text-gold' };
    if (rank === 2) return { icon: '🥈', color: 'text-gray-300' };
    if (rank === 3) return { icon: '🥉', color: 'text-amber-600' };
    return { icon: String(rank), color: 'text-gray-500' };
  };

  return (
    <div className="min-h-screen flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl text-gold">Leaderboard</h1>
        <button onClick={() => navigate('/')} className="btn-secondary btn-sm">
          Back
        </button>
      </div>

      {/* Time Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        <button
          onClick={() => setTimeFilter('all')}
          className={clsx(
            'btn-sm whitespace-nowrap',
            timeFilter === 'all' ? 'btn-primary' : 'btn-secondary'
          )}
        >
          All Time
        </button>
        <button
          onClick={() => setTimeFilter('weekly')}
          className={clsx(
            'btn-sm whitespace-nowrap',
            timeFilter === 'weekly' ? 'btn-primary' : 'btn-secondary'
          )}
        >
          This Week
        </button>
        <button
          onClick={() => setTimeFilter('daily')}
          className={clsx(
            'btn-sm whitespace-nowrap',
            timeFilter === 'daily' ? 'btn-primary' : 'btn-secondary'
          )}
        >
          Today
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-4 text-red-400 text-sm">
          {error}
          <button onClick={fetchLeaderboard} className="ml-2 underline">
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <Panel>
          <div className="text-center py-8 text-cyan-400 animate-pulse">
            Loading leaderboard...
          </div>
        </Panel>
      )}

      {/* Empty State */}
      {!loading && entries.length === 0 && (
        <Panel>
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🏆</div>
            <p className="text-gray-400">No games completed yet.</p>
            <p className="text-gray-500 text-sm mt-2">
              Be the first to complete a game and claim the top spot!
            </p>
            <button onClick={() => navigate('/')} className="btn-gold btn-md mt-4">
              Start Playing
            </button>
          </div>
        </Panel>
      )}

      {/* Leaderboard Table */}
      {!loading && entries.length > 0 && (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-game-border">
                  <th className="text-left py-2 px-2 text-cyan-400 font-display">#</th>
                  <th className="text-left py-2 px-2 text-cyan-400 font-display">Empire</th>
                  <th className="text-left py-2 px-2 text-cyan-400 font-display hidden sm:table-cell">Race</th>
                  <th className="text-right py-2 px-2 text-cyan-400 font-display">Networth</th>
                  <th className="text-center py-2 px-2 text-cyan-400 font-display hidden sm:table-cell">Rounds</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => {
                  const rank = index + 1;
                  const rankDisplay = getRankDisplay(rank);

                  return (
                    <tr
                      key={entry.id}
                      className={clsx(
                        'border-b border-game-border/50 transition-colors hover:bg-game-card/50',
                        rank <= 3 && 'bg-game-card/30'
                      )}
                    >
                      <td className={clsx('py-3 px-2', rankDisplay.color)}>
                        {rank <= 3 ? (
                          <span className="text-lg">{rankDisplay.icon}</span>
                        ) : (
                          <span className="text-gray-500">{rank}</span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <div className="font-display text-white">{entry.playerName}</div>
                        <div className="text-xs text-gray-500 sm:hidden">
                          {entry.race} • {entry.roundsCompleted}/10 rounds
                        </div>
                      </td>
                      <td className={clsx('py-3 px-2 hidden sm:table-cell', RACE_COLORS[entry.race])}>
                        {entry.race.charAt(0).toUpperCase() + entry.race.slice(1)}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className="font-stats text-gold">{formatNumber(entry.finalNetworth)}</span>
                      </td>
                      <td className="py-3 px-2 text-center hidden sm:table-cell">
                        <span className={clsx(
                          entry.roundsCompleted === 10 ? 'text-green-400' : 'text-yellow-400'
                        )}>
                          {entry.roundsCompleted}/10
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Legend */}
      <div className="mt-4 text-center">
        <p className="text-gray-500 text-xs">
          Rankings based on final networth • Completing all 10 rounds earns bonus ranking
        </p>
      </div>

      {/* Stats Summary */}
      {!loading && entries.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-4">
          <Panel className="text-center">
            <div className="text-xs text-gray-500">Total Games</div>
            <div className="font-stats text-lg text-cyan-400">{entries.length}</div>
          </Panel>
          <Panel className="text-center">
            <div className="text-xs text-gray-500">Top Score</div>
            <div className="font-stats text-lg text-gold">
              {entries.length > 0 ? formatNumber(entries[0].finalNetworth) : '—'}
            </div>
          </Panel>
          <Panel className="text-center">
            <div className="text-xs text-gray-500">Victories</div>
            <div className="font-stats text-lg text-green-400">
              {entries.filter((e) => e.roundsCompleted === 10).length}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
