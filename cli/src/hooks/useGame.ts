import { useState, useCallback } from 'react';
import {
  client,
  type Empire,
  type GameRound,
  type MarketPrices,
  type ShopStock,
  type DraftOption,
  type Race,
  type TurnActionRequest,
  type ShopTransaction,
  type BotSummary,
  type BotPhaseResponse,
} from '../api/client.js';

interface GameState {
  gameId: string | null;
  round: GameRound | null;
  playerEmpire: Empire | null;
  botEmpires: BotSummary[];
  marketPrices: MarketPrices | null;
  shopStock: ShopStock | null;
  draftOptions: DraftOption[] | null;
  isComplete: boolean;
}

interface PlayerState {
  playerId: string | null;
  displayName: string | null;
  sessionId: string | null;
}

export function useGame() {
  const [player, setPlayer] = useState<PlayerState>({
    playerId: null,
    displayName: null,
    sessionId: null,
  });

  const [game, setGame] = useState<GameState>({
    gameId: null,
    round: null,
    playerEmpire: null,
    botEmpires: [],
    marketPrices: null,
    shopStock: null,
    draftOptions: null,
    isComplete: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // Auth
  const login = useCallback(async (displayName: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.createPlayer(displayName);
      setPlayer({
        playerId: response.playerId,
        displayName,
        sessionId: response.sessionId,
      });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const restoreSession = useCallback((sessionId: string) => {
    client.setSession(sessionId);
    setPlayer((prev) => ({ ...prev, sessionId }));
  }, []);

  // Game management
  const checkActiveGame = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.getCurrentGame();
      if (response.hasActiveGame && response.game) {
        setGame({
          gameId: response.game.id,
          round: response.game.round,
          playerEmpire: response.game.playerEmpire,
          botEmpires: response.game.botEmpires,
          marketPrices: response.game.marketPrices,
          shopStock: response.game.shopStock,
          draftOptions: response.game.draftOptions,
          isComplete: false,
        });
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check game');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const newGame = useCallback(async (empireName: string, race: Race) => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.newGame(empireName, race);
      // Fetch full game state
      const gameResponse = await client.getGame(response.gameId);
      if (gameResponse.game) {
        setGame({
          gameId: response.gameId,
          round: gameResponse.game.round,
          playerEmpire: gameResponse.game.playerEmpire,
          botEmpires: gameResponse.game.botEmpires,
          marketPrices: gameResponse.game.marketPrices,
          shopStock: gameResponse.game.shopStock,
          draftOptions: gameResponse.game.draftOptions,
          isComplete: false,
        });
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Actions
  const executeAction = useCallback(
    async (action: TurnActionRequest) => {
      if (!game.gameId) return null;
      setLoading(true);
      setError(null);
      try {
        const response = await client.executeAction(game.gameId, action);
        if (response.result.success) {
          setGame((prev) => ({
            ...prev,
            playerEmpire: response.result.empire,
            round: prev.round
              ? {
                  ...prev.round,
                  turnsRemaining: response.result.turnsRemaining,
                }
              : null,
          }));
        }
        return response.result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [game.gameId]
  );

  const endPlayerPhase = useCallback(async () => {
    if (!game.gameId) return false;
    setLoading(true);
    setError(null);
    try {
      const response = await client.endPlayerPhase(game.gameId);
      setGame((prev) => ({
        ...prev,
        round: prev.round ? { ...prev.round, phase: response.phase as 'shop' } : null,
        marketPrices: response.marketPrices,
        shopStock: response.shopStock,
        draftOptions: response.draftOptions,
      }));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end phase');
      return false;
    } finally {
      setLoading(false);
    }
  }, [game.gameId]);

  // Shop
  const selectDraft = useCallback(
    async (optionIndex: number) => {
      if (!game.gameId) return false;
      setLoading(true);
      setError(null);
      try {
        const response = await client.selectDraft(game.gameId, optionIndex);
        if (response.success) {
          setGame((prev) => ({
            ...prev,
            playerEmpire: response.empire,
            draftOptions: response.draftOptions,
          }));
        }
        return response.success;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Draft failed');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [game.gameId]
  );

  const endShopPhase = useCallback(async () => {
    if (!game.gameId) return false;
    setLoading(true);
    setError(null);
    try {
      await client.endShopPhase(game.gameId);
      setGame((prev) => ({
        ...prev,
        round: prev.round ? { ...prev.round, phase: 'bot' as const } : null,
      }));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end shop');
      return false;
    } finally {
      setLoading(false);
    }
  }, [game.gameId]);

  // Market transaction (buy/sell troops and food)
  const marketTransaction = useCallback(
    async (transaction: ShopTransaction) => {
      if (!game.gameId) return false;
      setLoading(true);
      setError(null);
      try {
        const response = await client.marketTransaction(game.gameId, transaction);
        if (response.result.success) {
          setGame((prev) => ({
            ...prev,
            playerEmpire: response.empire,
            shopStock: response.shopStock,
          }));
          return true;
        } else {
          setError(response.result.error || 'Transaction failed');
          return false;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Market transaction failed');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [game.gameId]
  );

  // Bot phase
  const executeBotPhase = useCallback(async () => {
    if (!game.gameId) return null;
    setLoading(true);
    setError(null);
    try {
      const response = await client.executeBotPhase(game.gameId);
      setGame((prev) => ({
        ...prev,
        round: response.round,
        playerEmpire: response.playerEmpire,
        botEmpires: response.botEmpires,
        isComplete: response.isComplete,
      }));
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bot phase failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, [game.gameId]);

  return {
    player,
    game,
    loading,
    error,
    clearError,
    login,
    restoreSession,
    checkActiveGame,
    newGame,
    executeAction,
    endPlayerPhase,
    selectDraft,
    endShopPhase,
    marketTransaction,
    executeBotPhase,
  };
}
