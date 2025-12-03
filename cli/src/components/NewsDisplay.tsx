import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { NewsItem, BotStanding } from '../api/client.js';

interface Props {
  news: NewsItem[];
  standings: BotStanding[];
  playerId: string;
  roundNumber: number;
  onContinue: () => void;
}

function formatNetworth(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatChange(n: number): string {
  const formatted = formatNetworth(Math.abs(n));
  return n >= 0 ? `+${formatted}` : `-${formatted}`;
}

export function NewsDisplay({ news, standings, playerId, roundNumber, onContinue }: Props) {
  useInput((_, key) => {
    if (key.return) {
      onContinue();
    }
  });

  // Filter news to only show items involving the player
  const playerNews = news.filter(
    (item) => item.targetId === playerId || item.actorId === playerId
  );

  // Get player's rank
  const playerRank = standings.findIndex((s) => s.id === playerId) + 1;
  const playerStanding = standings.find((s) => s.id === playerId);

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="round" borderColor="red" paddingX={2} paddingY={1} flexDirection="column">
        <Text bold color="red">Bot Phase Complete - Round {roundNumber}</Text>
      </Box>

      {/* Standings */}
      <Box marginTop={1} flexDirection="column">
        <Text bold color="yellow">Standings</Text>
        <Box flexDirection="column" marginLeft={1}>
          {standings.map((standing, index) => {
            const isPlayer = standing.id === playerId;
            const rank = index + 1;
            const changeColor = standing.networthChange >= 0 ? 'green' : 'red';

            return (
              <Box key={standing.id}>
                <Text color={isPlayer ? 'cyan' : 'white'} bold={isPlayer}>
                  {rank}. {standing.name.padEnd(20)}
                </Text>
                <Text color={isPlayer ? 'cyan' : 'gray'}>
                  {formatNetworth(standing.networth).padStart(8)}
                </Text>
                <Text color={changeColor}>
                  {' '}{formatChange(standing.networthChange).padStart(8)}
                </Text>
                {standing.isEliminated && <Text color="red"> [ELIMINATED]</Text>}
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* News Feed */}
      {playerNews.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="red">Events This Round</Text>
          <Box flexDirection="column" marginLeft={1}>
            {playerNews.map((item, index) => {
              const isPlayerTarget = item.targetId === playerId;

              if (item.action.type === 'attack') {
                if (isPlayerTarget) {
                  return (
                    <Box key={index}>
                      <Text color={item.action.success ? 'red' : 'green'}>
                        {item.actor} attacked you
                        {item.action.success && item.action.landTaken > 0 && ` and took ${item.action.landTaken} acres!`}
                        {!item.action.success && ' but was repelled!'}
                      </Text>
                    </Box>
                  );
                } else {
                  return (
                    <Box key={index}>
                      <Text color="cyan">
                        You attacked {item.target}
                        {item.action.success && item.action.landTaken > 0 && ` and took ${item.action.landTaken} acres.`}
                        {!item.action.success && ' but failed to break their defense.'}
                      </Text>
                    </Box>
                  );
                }
              }

              if (item.action.type === 'spell') {
                if (isPlayerTarget) {
                  return (
                    <Box key={index}>
                      <Text color={item.action.success ? 'magenta' : 'green'}>
                        {item.actor} cast {item.action.spell.toUpperCase()} on you
                        {item.action.success ? '!' : ' but it fizzled!'}
                      </Text>
                    </Box>
                  );
                } else {
                  return (
                    <Box key={index}>
                      <Text color="cyan">
                        You cast {item.action.spell.toUpperCase()} on {item.target}
                        {item.action.success ? '.' : ' but it failed.'}
                      </Text>
                    </Box>
                  );
                }
              }

              if (item.action.type === 'eliminated') {
                return (
                  <Box key={index}>
                    <Text color="red" bold>
                      {item.actor} was eliminated by {item.action.eliminatedBy}!
                    </Text>
                  </Box>
                );
              }

              return null;
            })}
          </Box>
        </Box>
      )}

      {playerNews.length === 0 && (
        <Box marginTop={1}>
          <Text color="gray">No attacks or spells targeted you this round.</Text>
        </Box>
      )}

      {/* Player summary */}
      {playerStanding && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="cyan">Your Empire</Text>
          <Box marginLeft={1}>
            <Text>Rank: </Text>
            <Text color="yellow" bold>{playerRank}</Text>
            <Text> of {standings.length}</Text>
            <Text color="gray"> | </Text>
            <Text>Networth: </Text>
            <Text color="yellow">{formatNetworth(playerStanding.networth)}</Text>
            <Text color={playerStanding.networthChange >= 0 ? 'green' : 'red'}>
              {' '}({formatChange(playerStanding.networthChange)})
            </Text>
          </Box>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray">[Enter] continue to next round</Text>
      </Box>
    </Box>
  );
}
