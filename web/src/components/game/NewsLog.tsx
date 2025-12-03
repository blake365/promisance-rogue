import { clsx } from 'clsx';
import type { NewsItem, BotStanding } from '@/types';
import { formatNumber, formatChange } from '@/utils/format';

interface NewsLogProps {
  news: NewsItem[];
  standings: BotStanding[];
  playerId: string;
  playerName: string;
  onContinue: () => void;
}

export function NewsLog({ news, standings, playerId, playerName, onContinue }: NewsLogProps) {
  // Filter news relevant to player
  const playerNews = news.filter(
    (item) => item.targetId === playerId || item.actorId === playerId
  );

  // Sort standings by networth
  const sortedStandings = [...standings].sort((a, b) => b.networth - a.networth);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="font-display text-xl text-gold">Bot Phase Complete</h2>
        <p className="text-sm text-gray-400">The other empires have taken their turns</p>
      </div>

      {/* Standings Table */}
      <div className="bg-game-card rounded-lg border border-game-border overflow-hidden">
        <div className="bg-game-border px-3 py-2">
          <h3 className="font-display text-sm text-cyan-400 uppercase tracking-wider">Standings</h3>
        </div>
        <div className="divide-y divide-game-border/50">
          {sortedStandings.map((standing, index) => {
            const isEliminated = standing.isEliminated;
            const rank = index + 1;

            return (
              <div
                key={standing.id}
                className={clsx(
                  'flex items-center justify-between px-3 py-2',
                  isEliminated && 'opacity-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={clsx(
                    'w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold',
                    rank === 1 && 'bg-gold/20 text-gold',
                    rank === 2 && 'bg-gray-400/20 text-gray-300',
                    rank === 3 && 'bg-amber-600/20 text-amber-500',
                    rank > 3 && 'bg-game-border text-gray-500'
                  )}>
                    {rank}
                  </span>
                  <span className={clsx(
                    'font-display',
                    isEliminated ? 'text-gray-500 line-through' : 'text-white'
                  )}>
                    {standing.name}
                    {isEliminated && ' 💀'}
                  </span>
                </div>

                <div className="text-right">
                  <div className="font-stats text-gold">{formatNumber(standing.networth)}</div>
                  {standing.networthChange !== 0 && (
                    <div className={clsx(
                      'text-xs font-stats',
                      standing.networthChange > 0 ? 'text-green-400' : 'text-red-400'
                    )}>
                      {formatChange(standing.networthChange)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* News Feed */}
      {playerNews.length > 0 && (
        <div className="bg-game-card rounded-lg border border-game-border overflow-hidden">
          <div className="bg-game-border px-3 py-2">
            <h3 className="font-display text-sm text-red-400 uppercase tracking-wider">News</h3>
          </div>
          <div className="divide-y divide-game-border/50 max-h-[200px] overflow-y-auto">
            {playerNews.map((item, index) => (
              <NewsItemDisplay key={index} item={item} playerId={playerId} playerName={playerName} />
            ))}
          </div>
        </div>
      )}

      {playerNews.length === 0 && (
        <div className="bg-game-card rounded-lg border border-game-border p-4 text-center text-gray-400">
          <p>No significant events involving your empire this round.</p>
        </div>
      )}

      {/* Continue Button */}
      <button onClick={onContinue} className="btn-primary btn-lg w-full">
        Continue to Next Round
      </button>
    </div>
  );
}

function NewsItemDisplay({
  item,
  playerId,
}: {
  item: NewsItem;
  playerId: string;
  playerName: string;
}) {
  const isPlayerTarget = item.targetId === playerId;
  const isPlayerActor = item.actorId === playerId;

  let icon = '📰';
  let message = '';
  let color = 'text-gray-400';

  if (item.action.type === 'attack') {
    icon = item.action.success ? '⚔️' : '🛡️';

    if (isPlayerTarget) {
      if (item.action.success) {
        message = `${item.actor} attacked you and took ${formatNumber(item.action.landTaken)} land!`;
        color = 'text-red-400';
      } else {
        message = `${item.actor} attacked you but was repelled!`;
        color = 'text-green-400';
      }
    } else if (isPlayerActor) {
      if (item.action.success) {
        message = `You attacked ${item.target} and took ${formatNumber(item.action.landTaken)} land!`;
        color = 'text-green-400';
      } else {
        message = `Your attack on ${item.target} failed!`;
        color = 'text-red-400';
      }
    }
  } else if (item.action.type === 'spell') {
    icon = '✨';

    if (isPlayerTarget) {
      if (item.action.success) {
        message = `${item.actor} cast ${item.action.spell} on you!`;
        color = 'text-red-400';
      } else {
        message = `${item.actor} tried to cast ${item.action.spell} on you but failed!`;
        color = 'text-green-400';
      }
    } else if (isPlayerActor) {
      if (item.action.success) {
        message = `Your ${item.action.spell} spell on ${item.target} succeeded!`;
        color = 'text-green-400';
      } else {
        message = `Your ${item.action.spell} spell on ${item.target} failed!`;
        color = 'text-red-400';
      }
    }
  } else if (item.action.type === 'eliminated') {
    icon = '💀';

    if (isPlayerTarget) {
      message = `You were eliminated by ${item.action.eliminatedBy}!`;
      color = 'text-red-400';
    } else {
      message = `${item.target} was eliminated by ${item.action.eliminatedBy}!`;
      color = 'text-yellow-400';
    }
  }

  return (
    <div className="px-3 py-2 flex items-start gap-2">
      <span className="text-lg">{icon}</span>
      <p className={clsx('text-sm', color)}>{message}</p>
    </div>
  );
}

// Game summary for end of game
interface GameSummaryProps {
  stats: {
    totalIncome: number;
    totalExpenses: number;
    totalFoodProduction: number;
    totalAttacks: number;
    totalAttackWins: number;
    totalKills: number;
    totalLandGained: number;
    totalSpellsCast: number;
    peakNetworth: number;
    peakLand: number;
    turnsPlayed: number;
  };
  finalNetworth: number;
  isVictory: boolean;
  defeatReason?: string;
  onNewGame: () => void;
  onMenu: () => void;
}

export function GameSummary({
  stats,
  finalNetworth,
  isVictory,
  defeatReason,
  onNewGame,
  onMenu,
}: GameSummaryProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center py-4">
        <div className="text-5xl mb-3">
          {isVictory ? '🏆' : '💀'}
        </div>
        <h1 className={clsx(
          'font-display text-2xl',
          isVictory ? 'text-gold text-glow-gold' : 'text-red-400'
        )}>
          {isVictory ? 'Victory!' : 'Game Over'}
        </h1>
        {!isVictory && defeatReason && (
          <p className="text-gray-400 mt-1">
            {defeatReason === 'no_land' && 'You lost all your land'}
            {defeatReason === 'no_peasants' && 'Your population collapsed'}
            {defeatReason === 'excessive_loan' && 'Your debt became unsustainable'}
            {defeatReason === 'abandoned' && 'You abandoned your empire'}
          </p>
        )}
      </div>

      {/* Final Score */}
      <div className="bg-game-card rounded-lg border border-gold/50 p-4 text-center">
        <div className="text-sm text-gray-400">Final Networth</div>
        <div className="font-stats text-3xl text-gold text-glow-gold">
          {formatNumber(finalNetworth)}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Peak Networth" value={formatNumber(stats.peakNetworth)} color="text-gold" />
        <StatCard label="Peak Land" value={formatNumber(stats.peakLand)} color="text-land" />
        <StatCard label="Total Income" value={formatNumber(stats.totalIncome)} color="text-green-400" />
        <StatCard label="Total Expenses" value={formatNumber(stats.totalExpenses)} color="text-red-400" />
        <StatCard label="Attacks Won" value={`${stats.totalAttackWins}/${stats.totalAttacks}`} color="text-red-400" />
        <StatCard label="Empires Defeated" value={String(stats.totalKills)} color="text-red-400" />
        <StatCard label="Land Captured" value={formatNumber(stats.totalLandGained)} color="text-land" />
        <StatCard label="Spells Cast" value={String(stats.totalSpellsCast)} color="text-runes" />
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-2">
        <button onClick={onNewGame} className="btn-gold btn-lg w-full">
          New Game
        </button>
        <button onClick={onMenu} className="btn-secondary btn-lg w-full">
          Main Menu
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-game-card rounded-lg border border-game-border p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={clsx('font-stats text-lg', color)}>{value}</div>
    </div>
  );
}
