import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { client, type LeaderboardEntry } from '../api/client.js';

interface Props {
  hasSession: boolean;
  onClose: () => void;
}

type Timeframe = 'all' | 'daily' | 'weekly';

const timeframeLabels: Record<Timeframe, string> = {
  all: 'All Time',
  daily: 'Today',
  weekly: 'This Week',
};

const raceIcons: Record<string, string> = {
  human: '👤',
  elf: '🧝',
  dwarf: '⛏️',
  orc: '👹',
  troll: '🧌',
  gnome: '🧙',
  gremlin: '👺',
  drow: '🖤',
  goblin: '👽',
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}

export function LeaderboardView({ hasSession, onClose }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<{ rank: number | null; score: number | null }>({ rank: null, score: null });
  const [timeframe, setTimeframe] = useState<Timeframe>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch leaderboard data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [leaderboard, rank] = await Promise.all([
          client.getLeaderboard({ timeframe, limit: 20 }),
          hasSession ? client.getMyRank() : Promise.resolve({ rank: null, score: null }),
        ]);
        setEntries(leaderboard.entries);
        setMyRank(rank);
        setSelectedIndex(0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [timeframe, hasSession]);

  useInput((input, key) => {
    if (key.escape) {
      onClose();
    } else if (key.upArrow && entries.length > 0) {
      setSelectedIndex((i) => (i > 0 ? i - 1 : entries.length - 1));
    } else if (key.downArrow && entries.length > 0) {
      setSelectedIndex((i) => (i < entries.length - 1 ? i + 1 : 0));
    } else if (key.leftArrow) {
      const timeframes: Timeframe[] = ['all', 'daily', 'weekly'];
      const currentIdx = timeframes.indexOf(timeframe);
      setTimeframe(timeframes[currentIdx > 0 ? currentIdx - 1 : timeframes.length - 1]);
    } else if (key.rightArrow) {
      const timeframes: Timeframe[] = ['all', 'daily', 'weekly'];
      const currentIdx = timeframes.indexOf(timeframe);
      setTimeframe(timeframes[(currentIdx + 1) % timeframes.length]);
    }
  });

  if (loading) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={2} paddingY={1}>
        <Text color="yellow">Loading leaderboard...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="red" paddingX={2} paddingY={1}>
        <Text color="red">Error: {error}</Text>
        <Box marginTop={1}>
          <Text color="gray">[Esc] back to menu</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={2} paddingY={1}>
      {/* Header */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color="yellow">LEADERBOARD</Text>
        <Box gap={1}>
          {(['all', 'daily', 'weekly'] as Timeframe[]).map((tf) => (
            <Text
              key={tf}
              color={timeframe === tf ? 'cyan' : 'gray'}
              bold={timeframe === tf}
            >
              [{timeframeLabels[tf]}]
            </Text>
          ))}
        </Box>
      </Box>

      {/* Player's rank if logged in */}
      {hasSession && myRank.rank !== null && (
        <Box marginBottom={1} borderStyle="single" borderColor="green" paddingX={1}>
          <Text color="green">
            Your Best: Rank #{myRank.rank} ({formatNumber(myRank.score ?? 0)} networth)
          </Text>
        </Box>
      )}

      {/* Column headers */}
      <Box gap={1} marginBottom={1}>
        <Box width={3}><Text color="gray"> </Text></Box>
        <Box width={5}><Text color="gray" bold>Rank</Text></Box>
        <Box width={3}><Text color="gray"> </Text></Box>
        <Box width={18}><Text color="gray" bold>Empire</Text></Box>
        <Box width={10}><Text color="gray" bold>Networth</Text></Box>
        <Box width={8}><Text color="gray" bold>Rounds</Text></Box>
        <Text color="gray" bold>Date</Text>
      </Box>

      {/* Leaderboard entries */}
      <Box flexDirection="column">
        {entries.length === 0 ? (
          <Text color="gray">No entries yet for this timeframe.</Text>
        ) : (
          entries.map((entry, index) => {
            const isSelected = index === selectedIndex;
            // Gold, silver, bronze for top 3
            const rankColor = index === 0 ? 'yellow' : index === 1 ? 'white' : index === 2 ? 'red' : 'gray';

            return (
              <Box key={entry.id} gap={1}>
                <Box width={3}>
                  <Text color={isSelected ? 'cyan' : 'gray'}>
                    {isSelected ? '>' : ' '}
                  </Text>
                </Box>
                <Box width={5}>
                  <Text color={rankColor} bold={index < 3}>
                    #{index + 1}
                  </Text>
                </Box>
                <Box width={3}>
                  <Text>{raceIcons[entry.race] || '?'}</Text>
                </Box>
                <Box width={18}>
                  <Text bold color={isSelected ? 'white' : 'gray'}>
                    {entry.playerName.length > 16 ? entry.playerName.slice(0, 15) + '…' : entry.playerName}
                  </Text>
                </Box>
                <Box width={10}>
                  <Text color="yellow">{formatNumber(entry.finalNetworth)}</Text>
                </Box>
                <Box width={8}>
                  <Text color="cyan">R{entry.roundsCompleted}</Text>
                </Box>
                <Text color="gray" dimColor>
                  {formatDate(entry.createdAt)}
                </Text>
              </Box>
            );
          })
        )}
      </Box>

      {/* Controls */}
      <Box marginTop={1}>
        <Text color="gray">
          [↑↓] browse • [←→] change timeframe • [Esc] back to menu
        </Text>
      </Box>
    </Box>
  );
}
