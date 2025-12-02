import React, { useState, useMemo } from 'react';
import { Box, Text, useApp } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import type { Race } from '../api/client.js';

type Stage = 'menu' | 'login' | 'new_game_name' | 'new_game_race';

interface Props {
  onLogin: (displayName: string) => Promise<boolean>;
  onNewGame: (empireName: string, race: Race) => Promise<boolean>;
  onContinue: () => Promise<boolean>;
  hasSession: boolean;
  loading: boolean;
  error: string | null;
}

const RACES: { label: string; value: Race }[] = [
  { label: 'Human - Balanced', value: 'human' },
  { label: 'Elf - Magic & Runes', value: 'elf' },
  { label: 'Dwarf - Defense & Building', value: 'dwarf' },
  { label: 'Troll - Offense & Exploration', value: 'troll' },
  { label: 'Gnome - Market & Economy', value: 'gnome' },
  { label: 'Gremlin - Agriculture', value: 'gremlin' },
  { label: 'Orc - Exploration & Offense', value: 'orc' },
  { label: 'Drow - Magic & Military', value: 'drow' },
  { label: 'Goblin - Industry', value: 'goblin' },
];

const TITLE = `
  ____  ____   ___  __  __ ___ ____
 |  _ \\|  _ \\ / _ \\|  \\/  |_ _/ ___|
 | |_) | |_) | | | | |\\/| || |\\___ \\
 |  __/|  _ <| |_| | |  | || | ___) |
 |_|   |_| \\_\\\\___/|_|  |_|___|____/
          R O G U E`;

export function TitleScreen({
  onLogin,
  onNewGame,
  onContinue,
  hasSession,
  loading,
  error,
}: Props) {
  const { exit } = useApp();
  const [stage, setStage] = useState<Stage>('menu');
  const [displayName, setDisplayName] = useState('');
  const [empireName, setEmpireName] = useState('');
  const [inputValue, setInputValue] = useState('');

  // Memoize menu items to prevent re-renders from causing instability
  const menuItems = useMemo(
    () =>
      hasSession
        ? [
            { label: 'Continue Game', value: 'continue' },
            { label: 'New Game', value: 'new' },
            { label: 'Quit', value: 'quit' },
          ]
        : [
            { label: 'New Game', value: 'login' },
            { label: 'Quit', value: 'quit' },
          ],
    [hasSession]
  );

  const raceItems = useMemo(
    () => [...RACES, { label: '← Back', value: 'back' as Race }],
    []
  );

  const handleMenuSelect = async (item: { value: string }) => {
    if (loading) return;
    if (item.value === 'login') {
      setInputValue('');
      setStage('login');
    } else if (item.value === 'new') {
      setInputValue('');
      setStage('new_game_name');
    } else if (item.value === 'continue') {
      await onContinue();
    } else if (item.value === 'quit') {
      exit();
    }
  };

  const handleLoginSubmit = async () => {
    if (loading) return;
    if (!inputValue.trim()) {
      setInputValue('');
      setStage('menu');
      return;
    }
    setDisplayName(inputValue);
    const success = await onLogin(inputValue.trim());
    if (success) {
      setInputValue('');
      setStage('new_game_name');
    }
  };

  const handleNameSubmit = () => {
    if (loading) return;
    if (!inputValue.trim()) {
      setInputValue('');
      setStage('menu');
      setDisplayName('');
      return;
    }
    setEmpireName(inputValue);
    setInputValue('');
    setStage('new_game_race');
  };

  const handleRaceSelect = async (item: { value: Race | 'back' }) => {
    if (loading) return;
    if (item.value === 'back') {
      setInputValue('');
      setStage('new_game_name');
      return;
    }
    await onNewGame(empireName.trim(), item.value);
  };

  return (
    <Box flexDirection="column" alignItems="center">
      <Text color="cyan">{TITLE}</Text>

      {error && (
        <Box marginY={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}

      {loading && (
        <Box marginY={1}>
          <Text color="yellow">Loading...</Text>
        </Box>
      )}

      {stage === 'menu' && !loading && (
        <Box marginTop={1}>
          <SelectInput items={menuItems} onSelect={handleMenuSelect} />
        </Box>
      )}

      {stage === 'login' && (
        <Box flexDirection="column" alignItems="center" marginTop={1}>
          <Text>Enter your name:</Text>
          <Box marginTop={1}>
            <Text color="green">{`> `}</Text>
            <TextInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={() => handleLoginSubmit()}
              placeholder={loading ? 'Please wait...' : 'Type name and press Enter...'}
            />
          </Box>
          {!loading && <Text color="gray">Press Enter with no text to go back</Text>}
        </Box>
      )}

      {stage === 'new_game_name' && (
        <Box flexDirection="column" alignItems="center" marginTop={1}>
          <Text>Name your empire:</Text>
          <Box marginTop={1}>
            <Text color="green">{`> `}</Text>
            <TextInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={() => handleNameSubmit()}
              placeholder={loading ? 'Please wait...' : 'Type empire name and press Enter...'}
            />
          </Box>
          {!loading && <Text color="gray">Press Enter with no text to go back</Text>}
        </Box>
      )}

      {stage === 'new_game_race' && !loading && (
        <Box flexDirection="column" alignItems="center" marginTop={1}>
          <Text>Choose your race:</Text>
          <Box marginTop={1}>
            <SelectInput items={raceItems} onSelect={handleRaceSelect} />
          </Box>
        </Box>
      )}

      <Box marginTop={2}>
        <Text color="gray">A roguelike strategy game</Text>
      </Box>
    </Box>
  );
}
