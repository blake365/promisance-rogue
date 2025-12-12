// Devvit API Client - Uses webview messaging instead of HTTP
import type {
  Race,
  TurnActionRequest,
  TurnActionResult,
  ShopTransaction,
  BankTransaction,
  BankInfo,
  BankTransactionResult,
  Empire,
  GameRound,
  GamePhase,
  MarketPrices,
  EffectiveTroopPrices,
  ShopStock,
  DraftOption,
  BotSummary,
  SpyIntel,
  RerollInfo,
  Advisor,
  BotPhaseResponse,
  LeaderboardEntry,
  DefeatReason,
  GameStats,
  EdictResult,
} from '../types';

// API Response types
interface AuthResponse {
  playerId: string;
  sessionId: string;
  expiresAt: number;
}

interface PlayerResponse {
  id: string;
  displayName: string;
  createdAt: number;
}

interface GameSummary {
  round: number;
  turnsRemaining: number;
  phase: string;
  networth: number;
  land: number;
  gold: number;
}

interface CurrentGameResponse {
  hasActiveGame: boolean;
  corrupted?: boolean;
  error?: string;
  game?: {
    id: string;
    seed: number;
    round: GameRound;
    playerEmpire: Empire;
    botEmpires: BotSummary[];
    intel: Record<string, SpyIntel>;
    marketPrices: MarketPrices;
    effectivePrices: EffectiveTroopPrices;
    shopStock: ShopStock | null;
    draftOptions: DraftOption[] | null;
    playerDefeated: DefeatReason | null;
    stats: GameStats;
  };
}

interface NewGameResponse {
  gameId: string;
  seed: number;
  summary: GameSummary;
}

interface ActionResponse {
  result: TurnActionResult;
  summary: GameSummary;
  botEmpires: BotSummary[];
}

interface CombatPreviewResponse {
  canAttack: boolean;
  reason?: string;
  estimatedOffense: number;
  estimatedDefense: number;
  winChance: number;
  turnsRequired: number;
}

interface MarketResponse {
  result: { success: boolean; error?: string };
  empire: Empire;
  shopStock: ShopStock | null;
  effectivePrices?: EffectiveTroopPrices;
}

interface DraftResponse {
  success: boolean;
  error?: string;
  empire: Empire;
  draftOptions: DraftOption[] | null;
  picksRemaining?: number;
  edictResult?: EdictResult;
}

interface RerollResponse {
  success: boolean;
  error?: string;
  cost?: number;
  empire: Empire;
  draftOptions: DraftOption[] | null;
  rerollInfo: RerollInfo;
}

interface DismissAdvisorResponse {
  success: boolean;
  error?: string;
  dismissed?: Advisor;
  empire: Empire;
  advisorCapacity: { current: number; max: number };
}

interface BankResponse {
  result: BankTransactionResult;
  empire: Empire;
  bankInfo: BankInfo;
}

interface SettingsResponse {
  success: boolean;
  empire: Empire;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
}

// Devvit webview context
declare global {
  interface Window {
    devvit?: {
      postMessage: (message: { type: string; data?: unknown }) => void;
      addEventListener: (event: string, handler: (data: unknown) => void) => void;
    };
  }
}

export class DevvitClient {
  private requestId = 0;
  private pendingRequests = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  private sessionId: string | null = null;

  constructor() {
    this.setupMessageListener();
    this.loadSession();
  }

  private setupMessageListener(): void {
    if (typeof window !== 'undefined' && window.devvit) {
      window.devvit.addEventListener('message', (data: unknown) => {
        const response = data as { requestId: number; success: boolean; data?: unknown; error?: string };
        const pending = this.pendingRequests.get(response.requestId);
        if (pending) {
          this.pendingRequests.delete(response.requestId);
          if (response.success) {
            pending.resolve(response.data);
          } else {
            pending.reject(new Error(response.error || 'Request failed'));
          }
        }
      });
    }
  }

  private loadSession(): void {
    // Session is managed on Reddit side, no need for localStorage
    // The player is identified by their Reddit username
  }

  setSession(sessionId: string): void {
    this.sessionId = sessionId;
  }

  getSession(): string | null {
    return this.sessionId;
  }

  clearSession(): void {
    this.sessionId = null;
  }

  private async sendMessage<T>(action: string, payload?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = ++this.requestId;
      this.pendingRequests.set(requestId, { resolve: resolve as (value: unknown) => void, reject });

      if (window.devvit) {
        window.devvit.postMessage({
          type: action,
          data: {
            requestId,
            sessionId: this.sessionId,
            payload,
          },
        });
      } else {
        reject(new Error('Devvit context not available'));
      }

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  // Auth - simplified for Reddit (no separate login needed)
  async createPlayer(displayName: string): Promise<AuthResponse> {
    return this.sendMessage<AuthResponse>('auth.createPlayer', { displayName });
  }

  async getMe(): Promise<PlayerResponse> {
    return this.sendMessage<PlayerResponse>('auth.getMe');
  }

  // Game
  async newGame(empireName: string, race: Race, seed?: number): Promise<NewGameResponse> {
    return this.sendMessage<NewGameResponse>('game.new', { empireName, race, seed });
  }

  async getCurrentGame(): Promise<CurrentGameResponse> {
    return this.sendMessage<CurrentGameResponse>('game.current');
  }

  async getGame(gameId: string): Promise<{ game: CurrentGameResponse['game'] }> {
    return this.sendMessage('game.get', { gameId });
  }

  async abandonGame(): Promise<{ success: boolean; gameId: string }> {
    return this.sendMessage('game.abandon');
  }

  // Actions
  async executeAction(gameId: string, action: TurnActionRequest): Promise<ActionResponse> {
    return this.sendMessage<ActionResponse>('game.action', { gameId, action });
  }

  async getCombatPreview(gameId: string, targetId: string): Promise<CombatPreviewResponse> {
    return this.sendMessage<CombatPreviewResponse>('game.combatPreview', { gameId, targetId });
  }

  async endPlayerPhase(gameId: string): Promise<{
    phase: string;
    marketPrices: MarketPrices;
    shopStock: ShopStock | null;
    draftOptions: DraftOption[] | null;
    isComplete?: boolean;
    stats?: GameStats;
    playerDefeated?: DefeatReason | null;
  }> {
    return this.sendMessage('game.endPlayerPhase', { gameId });
  }

  // Shop
  async marketTransaction(gameId: string, transaction: ShopTransaction): Promise<MarketResponse> {
    return this.sendMessage<MarketResponse>('game.market', { gameId, transaction });
  }

  async selectDraft(gameId: string, optionIndex: number): Promise<DraftResponse> {
    return this.sendMessage<DraftResponse>('game.draft', { gameId, optionIndex });
  }

  async getRerollInfo(gameId: string): Promise<RerollInfo> {
    return this.sendMessage<RerollInfo>('game.rerollInfo', { gameId });
  }

  async rerollDraft(gameId: string): Promise<RerollResponse> {
    return this.sendMessage<RerollResponse>('game.reroll', { gameId });
  }

  async dismissAdvisor(gameId: string, advisorId: string): Promise<DismissAdvisorResponse> {
    return this.sendMessage<DismissAdvisorResponse>('game.dismissAdvisor', { gameId, advisorId });
  }

  async endShopPhase(gameId: string): Promise<{ phase: GamePhase }> {
    return this.sendMessage('game.endShopPhase', { gameId });
  }

  // Bank
  async getBankInfo(gameId: string): Promise<BankInfo> {
    return this.sendMessage<BankInfo>('game.bankInfo', { gameId });
  }

  async bankTransaction(gameId: string, transaction: BankTransaction): Promise<BankResponse> {
    return this.sendMessage<BankResponse>('game.bank', { gameId, transaction });
  }

  // Empire settings
  async updateSettings(
    gameId: string,
    settings: {
      industryAllocation?: { trparm: number; trplnd: number; trpfly: number; trpsea: number };
      taxRate?: number;
    }
  ): Promise<SettingsResponse> {
    return this.sendMessage<SettingsResponse>('game.settings', { gameId, settings });
  }

  // Bot phase
  async executeBotPhase(gameId: string): Promise<BotPhaseResponse> {
    return this.sendMessage<BotPhaseResponse>('game.botPhase', { gameId });
  }

  // Leaderboard
  async getLeaderboard(timeframe?: 'daily' | 'weekly'): Promise<LeaderboardEntry[]> {
    const response = await this.sendMessage<LeaderboardResponse>('leaderboard.get', { timeframe });
    return response.entries;
  }

  async getMyRank(): Promise<{ rank: number | null; score: number | null }> {
    return this.sendMessage('leaderboard.rank');
  }

  // Health
  async health(): Promise<{ status: string; timestamp: number }> {
    return this.sendMessage('health');
  }
}

// Singleton instance for app-wide use
export const client = new DevvitClient();
