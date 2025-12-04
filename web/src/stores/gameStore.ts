import { create } from 'zustand';
import { client } from '@/api/client';
import type {
  Empire,
  GameRound,
  MarketPrices,
  EffectiveTroopPrices,
  ShopStock,
  DraftOption,
  BotSummary,
  SpyIntel,
  RerollInfo,
  BankInfo,
  GameStats,
  Race,
  TurnAction,
  TurnActionRequest,
  TurnActionResult,
  ShopTransaction,
  BankTransaction,
  DefeatReason,
  BotPhaseResponse,
  EdictResult,
} from '@/types';

interface PlayerState {
  playerId: string | null;
  displayName: string | null;
  sessionId: string | null;
}

interface GameState {
  gameId: string | null;
  round: GameRound | null;
  playerEmpire: Empire | null;
  botEmpires: BotSummary[];
  intel: Record<string, SpyIntel>;
  marketPrices: MarketPrices | null;
  effectivePrices: EffectiveTroopPrices | null;
  shopStock: ShopStock | null;
  draftOptions: DraftOption[] | null;
  rerollInfo: RerollInfo | null;
  isComplete: boolean;
  playerDefeated: DefeatReason | null;
  stats: GameStats | null;
}

interface GameStore {
  // State
  player: PlayerState;
  game: GameState;
  bankInfo: BankInfo | null;
  loading: boolean;
  error: string | null;
  lastActionResult: TurnActionResult | null;
  lastActionType: TurnAction | null;
  lastBotPhaseResult: BotPhaseResponse | null;
  lastEdictResult: EdictResult | null;

  // Actions
  clearError: () => void;
  clearLastResult: () => void;
  clearEdictResult: () => void;
  login: (displayName: string) => Promise<boolean>;
  restoreSession: () => Promise<boolean>;
  checkActiveGame: () => Promise<boolean>;
  newGame: (empireName: string, race: Race) => Promise<boolean>;
  abandonGame: () => Promise<boolean>;
  executeAction: (action: TurnActionRequest) => Promise<TurnActionResult | null>;
  endPlayerPhase: () => Promise<boolean>;
  selectDraft: (optionIndex: number) => Promise<boolean>;
  rerollDraft: () => Promise<boolean>;
  dismissAdvisor: (advisorId: string) => Promise<boolean>;
  endShopPhase: () => Promise<boolean>;
  marketTransaction: (transaction: ShopTransaction) => Promise<boolean>;
  fetchBankInfo: () => Promise<void>;
  bankTransaction: (transaction: BankTransaction) => Promise<boolean>;
  executeBotPhase: () => Promise<BotPhaseResponse | null>;
  resetGame: () => void;
}

const initialPlayerState: PlayerState = {
  playerId: null,
  displayName: null,
  sessionId: null,
};

const initialGameState: GameState = {
  gameId: null,
  round: null,
  playerEmpire: null,
  botEmpires: [],
  intel: {},
  marketPrices: null,
  effectivePrices: null,
  shopStock: null,
  draftOptions: null,
  rerollInfo: null,
  isComplete: false,
  playerDefeated: null,
  stats: null,
};

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  player: initialPlayerState,
  game: initialGameState,
  bankInfo: null,
  loading: false,
  error: null,
  lastActionResult: null,
  lastActionType: null,
  lastBotPhaseResult: null,
  lastEdictResult: null,

  // Clear error
  clearError: () => set({ error: null }),

  // Clear last result
  clearLastResult: () => set({ lastActionResult: null, lastActionType: null, lastBotPhaseResult: null }),

  // Clear edict result
  clearEdictResult: () => set({ lastEdictResult: null }),

  // Login
  login: async (displayName: string) => {
    set({ loading: true, error: null });
    try {
      const response = await client.createPlayer(displayName);
      set({
        player: {
          playerId: response.playerId,
          displayName,
          sessionId: response.sessionId,
        },
        loading: false,
      });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Login failed',
        loading: false,
      });
      return false;
    }
  },

  // Restore session from localStorage
  restoreSession: async () => {
    const sessionId = client.getSession();
    if (!sessionId) return false;

    set({ loading: true, error: null });
    try {
      const me = await client.getMe();
      set({
        player: {
          playerId: me.id,
          displayName: me.displayName,
          sessionId,
        },
        loading: false,
      });
      return true;
    } catch {
      client.clearSession();
      set({ loading: false });
      return false;
    }
  },

  // Check for active game
  checkActiveGame: async () => {
    set({ loading: true, error: null });
    try {
      const response = await client.getCurrentGame();
      if (response.hasActiveGame && response.game) {
        set({
          game: {
            gameId: response.game.id,
            round: response.game.round,
            playerEmpire: response.game.playerEmpire,
            botEmpires: response.game.botEmpires,
            intel: response.game.intel,
            marketPrices: response.game.marketPrices,
            effectivePrices: response.game.effectivePrices,
            shopStock: response.game.shopStock,
            draftOptions: response.game.draftOptions,
            rerollInfo: null,
            isComplete: response.game.round.phase === 'complete',
            playerDefeated: response.game.playerDefeated,
            stats: response.game.stats,
          },
          loading: false,
        });
        return true;
      }
      set({ loading: false });
      return false;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to check game',
        loading: false,
      });
      return false;
    }
  },

  // Start new game
  newGame: async (empireName: string, race: Race) => {
    set({ loading: true, error: null });
    try {
      const response = await client.newGame(empireName, race);
      const gameResponse = await client.getGame(response.gameId);
      if (gameResponse.game) {
        set({
          game: {
            gameId: response.gameId,
            round: gameResponse.game.round,
            playerEmpire: gameResponse.game.playerEmpire,
            botEmpires: gameResponse.game.botEmpires,
            intel: gameResponse.game.intel,
            marketPrices: gameResponse.game.marketPrices,
            effectivePrices: gameResponse.game.effectivePrices,
            shopStock: gameResponse.game.shopStock,
            draftOptions: gameResponse.game.draftOptions,
            rerollInfo: null,
            isComplete: false,
            playerDefeated: null,
            stats: gameResponse.game.stats,
          },
          loading: false,
        });
      }
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to create game',
        loading: false,
      });
      return false;
    }
  },

  // Abandon game
  abandonGame: async () => {
    set({ loading: true, error: null });
    try {
      await client.abandonGame();
      set({
        game: initialGameState,
        bankInfo: null,
        lastActionResult: null,
        lastBotPhaseResult: null,
        loading: false,
      });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to abandon game',
        loading: false,
      });
      return false;
    }
  },

  // Execute turn action
  executeAction: async (action: TurnActionRequest) => {
    const { game } = get();
    if (!game.gameId) return null;

    set({ loading: true, error: null });
    try {
      const response = await client.executeAction(game.gameId, action);
      if (response.result.success) {
        const newIntel = response.result.spellResult?.intel
          ? { ...game.intel, [response.result.spellResult.intel.targetId]: response.result.spellResult.intel }
          : game.intel;

        set({
          game: {
            ...game,
            playerEmpire: response.result.empire,
            intel: newIntel,
            botEmpires: response.botEmpires,
            round: game.round
              ? { ...game.round, turnsRemaining: response.result.turnsRemaining }
              : null,
          },
          lastActionResult: response.result,
          lastActionType: action.action,
          loading: false,
        });
      }
      return response.result;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Action failed',
        loading: false,
      });
      return null;
    }
  },

  // End player phase
  endPlayerPhase: async () => {
    const { game } = get();
    if (!game.gameId) return false;

    set({ loading: true, error: null });
    try {
      const response = await client.endPlayerPhase(game.gameId);

      // Check if game completed (final round)
      if (response.isComplete) {
        set({
          game: {
            ...game,
            round: game.round ? { ...game.round, phase: 'complete' } : null,
            isComplete: true,
            playerDefeated: response.playerDefeated ?? null,
            stats: response.stats ?? null,
          },
          loading: false,
        });
        return true;
      }

      const rerollInfo = await client.getRerollInfo(game.gameId);
      set({
        game: {
          ...game,
          round: game.round ? { ...game.round, phase: 'shop' } : null,
          marketPrices: response.marketPrices,
          shopStock: response.shopStock,
          draftOptions: response.draftOptions,
          rerollInfo,
        },
        loading: false,
      });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to end phase',
        loading: false,
      });
      return false;
    }
  },

  // Select draft option
  selectDraft: async (optionIndex: number) => {
    const { game } = get();
    if (!game.gameId) return false;

    set({ loading: true, error: null });
    try {
      const response = await client.selectDraft(game.gameId, optionIndex);
      if (response.success) {
        const rerollInfo = await client.getRerollInfo(game.gameId);
        set({
          game: {
            ...game,
            playerEmpire: response.empire,
            draftOptions: response.draftOptions,
            rerollInfo,
          },
          lastEdictResult: response.edictResult ?? null,
          loading: false,
        });
      }
      return response.success;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Draft failed',
        loading: false,
      });
      return false;
    }
  },

  // Reroll draft
  rerollDraft: async () => {
    const { game } = get();
    if (!game.gameId) return false;

    set({ loading: true, error: null });
    try {
      const response = await client.rerollDraft(game.gameId);
      if (response.success) {
        set({
          game: {
            ...game,
            playerEmpire: response.empire,
            draftOptions: response.draftOptions,
            rerollInfo: response.rerollInfo,
          },
          loading: false,
        });
        return true;
      } else {
        set({ error: response.error || 'Reroll failed', loading: false });
        return false;
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Reroll failed',
        loading: false,
      });
      return false;
    }
  },

  // Dismiss advisor
  dismissAdvisor: async (advisorId: string) => {
    const { game } = get();
    if (!game.gameId) return false;

    set({ loading: true, error: null });
    try {
      const response = await client.dismissAdvisor(game.gameId, advisorId);
      if (response.success) {
        set({
          game: {
            ...game,
            playerEmpire: response.empire,
            rerollInfo: game.rerollInfo
              ? { ...game.rerollInfo, advisorCapacity: response.advisorCapacity }
              : null,
          },
          loading: false,
        });
        return true;
      } else {
        set({ error: response.error || 'Dismiss failed', loading: false });
        return false;
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Dismiss failed',
        loading: false,
      });
      return false;
    }
  },

  // End shop phase
  endShopPhase: async () => {
    const { game } = get();
    if (!game.gameId) return false;

    set({ loading: true, error: null });
    try {
      const response = await client.endShopPhase(game.gameId);
      set({
        game: {
          ...game,
          round: game.round ? { ...game.round, phase: response.phase } : null,
        },
        loading: false,
      });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to end shop',
        loading: false,
      });
      return false;
    }
  },

  // Market transaction
  marketTransaction: async (transaction: ShopTransaction) => {
    const { game } = get();
    if (!game.gameId) return false;

    set({ loading: true, error: null });
    try {
      const response = await client.marketTransaction(game.gameId, transaction);
      if (response.result.success) {
        // Refresh reroll info since gold changed (affects canAfford)
        const rerollInfo = game.round?.phase === 'shop'
          ? await client.getRerollInfo(game.gameId)
          : game.rerollInfo;

        set({
          game: {
            ...game,
            playerEmpire: response.empire,
            shopStock: response.shopStock,
            effectivePrices: response.effectivePrices ?? game.effectivePrices,
            rerollInfo,
          },
          loading: false,
        });
        return true;
      } else {
        set({ error: response.result.error || 'Transaction failed', loading: false });
        return false;
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Market transaction failed',
        loading: false,
      });
      return false;
    }
  },

  // Fetch bank info
  fetchBankInfo: async () => {
    const { game } = get();
    if (!game.gameId) return;

    try {
      const info = await client.getBankInfo(game.gameId);
      set({ bankInfo: info });
    } catch {
      // Silently fail
    }
  },

  // Bank transaction
  bankTransaction: async (transaction: BankTransaction) => {
    const { game } = get();
    if (!game.gameId) return false;

    set({ loading: true, error: null });
    try {
      const response = await client.bankTransaction(game.gameId, transaction);
      if (response.result.success) {
        // Refresh reroll info since gold changed (affects canAfford)
        const rerollInfo = game.round?.phase === 'shop'
          ? await client.getRerollInfo(game.gameId)
          : game.rerollInfo;

        set({
          game: {
            ...game,
            playerEmpire: response.empire,
            rerollInfo,
          },
          bankInfo: response.bankInfo,
          loading: false,
        });
        return true;
      } else {
        set({ error: response.result.error || 'Transaction failed', loading: false });
        return false;
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Bank transaction failed',
        loading: false,
      });
      return false;
    }
  },

  // Execute bot phase
  executeBotPhase: async () => {
    const { game } = get();
    if (!game.gameId) return null;

    set({ loading: true, error: null });
    try {
      const response = await client.executeBotPhase(game.gameId);
      set({
        game: {
          ...game,
          round: response.round,
          playerEmpire: response.playerEmpire,
          botEmpires: response.botEmpires,
          intel: response.intel,
          isComplete: response.isComplete,
          playerDefeated: response.playerDefeated,
          stats: response.stats,
        },
        lastBotPhaseResult: response,
        loading: false,
      });
      return response;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Bot phase failed',
        loading: false,
      });
      return null;
    }
  },

  // Reset game state
  resetGame: () => {
    set({
      game: initialGameState,
      bankInfo: null,
      lastActionResult: null,
      lastBotPhaseResult: null,
    });
  },
}));
