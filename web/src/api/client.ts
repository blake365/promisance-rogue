// API Client - ported from CLI
// This is a direct port of the PromisanceClient class

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
} from '@/types';

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
  game?: {
    id: string;
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

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
}

// Session storage key
const SESSION_KEY = 'promisance-rogue-session';

export class PromisanceClient {
  private baseUrl: string;
  private sessionId: string | null = null;

  constructor(baseUrl: string = '') {
    // Use relative URL in browser, allowing Vite proxy to work
    this.baseUrl = baseUrl;
    this.loadSession();
  }

  private loadSession(): void {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        try {
          const session = JSON.parse(stored);
          if (session.sessionId && session.expiresAt > Date.now()) {
            this.sessionId = session.sessionId;
          } else {
            localStorage.removeItem(SESSION_KEY);
          }
        } catch {
          localStorage.removeItem(SESSION_KEY);
        }
      }
    }
  }

  private saveSession(sessionId: string, expiresAt: number): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ sessionId, expiresAt }));
    }
  }

  setSession(sessionId: string): void {
    this.sessionId = sessionId;
  }

  getSession(): string | null {
    return this.sessionId;
  }

  clearSession(): void {
    this.sessionId = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.sessionId) {
      headers['Authorization'] = `Bearer ${this.sessionId}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        (error as { error?: string }).error || `HTTP ${response.status}`
      );
    }

    return response.json() as Promise<T>;
  }

  // Auth
  async createPlayer(displayName: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>(
      'POST',
      '/api/auth/anonymous',
      { displayName }
    );
    this.sessionId = response.sessionId;
    this.saveSession(response.sessionId, response.expiresAt);
    return response;
  }

  async getMe(): Promise<PlayerResponse> {
    return this.request<PlayerResponse>('GET', '/api/auth/me');
  }

  // Game
  async newGame(empireName: string, race: Race): Promise<NewGameResponse> {
    return this.request<NewGameResponse>('POST', '/api/game/new', {
      empireName,
      race,
    });
  }

  async getCurrentGame(): Promise<CurrentGameResponse> {
    return this.request<CurrentGameResponse>('GET', '/api/game/current');
  }

  async getGame(gameId: string): Promise<{ game: CurrentGameResponse['game'] }> {
    return this.request('GET', `/api/game/${gameId}`);
  }

  async abandonGame(): Promise<{ success: boolean; gameId: string }> {
    return this.request('POST', '/api/game/abandon');
  }

  // Actions
  async executeAction(
    gameId: string,
    action: TurnActionRequest
  ): Promise<ActionResponse> {
    return this.request<ActionResponse>('POST', `/api/game/${gameId}/action`, action);
  }

  async getCombatPreview(
    gameId: string,
    targetId: string
  ): Promise<CombatPreviewResponse> {
    return this.request<CombatPreviewResponse>(
      'GET',
      `/api/game/${gameId}/combat-preview/${targetId}`
    );
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
    return this.request('POST', `/api/game/${gameId}/end-player-phase`);
  }

  // Shop
  async marketTransaction(
    gameId: string,
    transaction: ShopTransaction
  ): Promise<MarketResponse> {
    return this.request<MarketResponse>(
      'POST',
      `/api/game/${gameId}/market`,
      transaction
    );
  }

  async selectDraft(gameId: string, optionIndex: number): Promise<DraftResponse> {
    return this.request<DraftResponse>('POST', `/api/game/${gameId}/draft`, {
      optionIndex,
    });
  }

  async getRerollInfo(gameId: string): Promise<RerollInfo> {
    return this.request<RerollInfo>('GET', `/api/game/${gameId}/reroll`);
  }

  async rerollDraft(gameId: string): Promise<RerollResponse> {
    return this.request<RerollResponse>('POST', `/api/game/${gameId}/reroll`);
  }

  async dismissAdvisor(gameId: string, advisorId: string): Promise<DismissAdvisorResponse> {
    return this.request<DismissAdvisorResponse>('POST', `/api/game/${gameId}/dismiss-advisor`, {
      advisorId,
    });
  }

  async endShopPhase(gameId: string): Promise<{ phase: GamePhase }> {
    return this.request('POST', `/api/game/${gameId}/end-shop-phase`);
  }

  // Bank
  async getBankInfo(gameId: string): Promise<BankInfo> {
    return this.request<BankInfo>('GET', `/api/game/${gameId}/bank`);
  }

  async bankTransaction(
    gameId: string,
    transaction: BankTransaction
  ): Promise<BankResponse> {
    return this.request<BankResponse>(
      'POST',
      `/api/game/${gameId}/bank`,
      transaction
    );
  }

  // Bot phase
  async executeBotPhase(gameId: string): Promise<BotPhaseResponse> {
    return this.request<BotPhaseResponse>('POST', `/api/game/${gameId}/bot-phase`);
  }

  // Leaderboard
  async getLeaderboard(timeframe?: 'daily' | 'weekly'): Promise<LeaderboardEntry[]> {
    const params = new URLSearchParams();
    if (timeframe) params.set('timeframe', timeframe);

    const query = params.toString();
    const response = await this.request<LeaderboardResponse>(
      'GET',
      `/api/leaderboard${query ? `?${query}` : ''}`
    );
    return response.entries;
  }

  async getMyRank(): Promise<{ rank: number | null; score: number | null }> {
    return this.request('GET', '/api/leaderboard/rank');
  }

  // Health
  async health(): Promise<{ status: string; timestamp: number }> {
    return this.request('GET', '/health');
  }
}

// Singleton instance for app-wide use
export const client = new PromisanceClient();
