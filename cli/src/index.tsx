#!/usr/bin/env node
import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { client } from './api/client.js';
import { useGame } from './hooks/useGame.js';
import { TitleScreen } from './screens/TitleScreen.js';
import { GameScreen } from './screens/GameScreen.js';

// Config file for session persistence
const CONFIG_PATH = join(homedir(), '.promisance-rogue.json');

interface Config {
  sessionId?: string;
  apiUrl?: string;
}

function loadConfig(): Config {
  try {
    if (existsSync(CONFIG_PATH)) {
      return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch {
    // Ignore errors
  }
  return {};
}

function saveConfig(config: Config) {
  try {
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch {
    // Ignore errors
  }
}

type AppScreen = 'title' | 'game';

function App() {
  const [screen, setScreen] = useState<AppScreen>('title');
  const [initialized, setInitialized] = useState(false);
  const [hasActiveGame, setHasActiveGame] = useState(false);

  const {
    player,
    game,
    bankInfo,
    loading,
    error,
    clearError,
    login,
    restoreSession,
    checkActiveGame,
    newGame,
    abandonGame,
    executeAction,
    endPlayerPhase,
    selectDraft,
    rerollDraft,
    dismissAdvisor,
    endShopPhase,
    marketTransaction,
    bankTransaction,
    executeBotPhase,
  } = useGame();

  // Initialize on mount (runs once)
  useEffect(() => {
    const init = async () => {
      const config = loadConfig();

      // Set API URL if configured
      if (config.apiUrl) {
        // Could add client.setBaseUrl() if needed
      }

      // Restore session if exists
      if (config.sessionId) {
        restoreSession(config.sessionId);

        // Check for active game (but don't auto-navigate)
        try {
          const response = await client.getCurrentGame();
          setHasActiveGame(response.hasActiveGame);
        } catch {
          // Session might be expired, continue to title
          setHasActiveGame(false);
        }
      }

      setInitialized(true);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle login
  const handleLogin = async (displayName: string) => {
    const success = await login(displayName);
    if (success) {
      // Use client.getSession() since player state won't be updated yet
      const sessionId = client.getSession();
      if (sessionId) {
        saveConfig({ sessionId });
      }
    }
    return success;
  };

  // Handle new game
  const handleNewGame = async (empireName: string, race: any) => {
    const success = await newGame(empireName, race);
    if (success) {
      // Save session after creating game
      if (client.getSession()) {
        saveConfig({ sessionId: client.getSession()! });
      }
      setHasActiveGame(true);
      setScreen('game');
    }
    return success;
  };

  // Handle continue game
  const handleContinue = async () => {
    const hasGame = await checkActiveGame();
    if (hasGame) {
      setScreen('game');
    }
    return hasGame;
  };

  // Handle abandon game
  const handleAbandon = async () => {
    const success = await abandonGame();
    if (success) {
      setHasActiveGame(false);
    }
    return success;
  };

  // Handle quit from game
  const handleQuit = () => {
    setScreen('title');
  };

  if (!initialized) {
    return (
      <Box padding={1}>
        <Text color="cyan">Loading...</Text>
      </Box>
    );
  }

  if (screen === 'title') {
    return (
      <TitleScreen
        onLogin={handleLogin}
        onNewGame={handleNewGame}
        onContinue={handleContinue}
        onAbandon={handleAbandon}
        hasSession={!!player.sessionId || !!client.getSession()}
        hasActiveGame={hasActiveGame}
        loading={loading}
        error={error}
      />
    );
  }

  if (screen === 'game' && game.playerEmpire && game.round) {
    return (
      <GameScreen
        empire={game.playerEmpire}
        round={game.round}
        bots={game.botEmpires}
        intel={game.intel}
        draftOptions={game.draftOptions}
        rerollInfo={game.rerollInfo}
        marketPrices={game.marketPrices}
        shopStock={game.shopStock}
        bankInfo={bankInfo}
        playerDefeated={game.playerDefeated}
        loading={loading}
        error={error}
        onAction={executeAction}
        onEndPlayerPhase={endPlayerPhase}
        onSelectDraft={selectDraft}
        onRerollDraft={rerollDraft}
        onDismissAdvisor={dismissAdvisor}
        onEndShopPhase={endShopPhase}
        onMarketTransaction={marketTransaction}
        onBankTransaction={bankTransaction}
        onExecuteBotPhase={executeBotPhase}
        onClearError={clearError}
        onQuit={handleQuit}
      />
    );
  }

  return (
    <Box padding={1}>
      <Text color="red">Something went wrong. Press Ctrl+C to exit.</Text>
    </Box>
  );
}

// Render the app
render(<App />);
