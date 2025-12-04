// Game types (mirrored from server for CLI independence)

export type Era = 'past' | 'present' | 'future';
export type Race = 'human' | 'elf' | 'dwarf' | 'troll' | 'gnome' | 'gremlin' | 'orc' | 'drow' | 'goblin';
export type TurnAction = 'explore' | 'farm' | 'cash' | 'meditate' | 'industry' | 'build' | 'demolish' | 'attack' | 'spell';
export type SpellType = 'shield' | 'food' | 'cash' | 'runes' | 'blast' | 'steal' | 'storm' | 'struct' | 'advance' | 'regress' | 'gate' | 'spy' | 'fight';
export type AttackType = 'standard' | 'trparm' | 'trplnd' | 'trpfly' | 'trpsea';
export type BonusRarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export type BonusType = 'advisor' | 'tech' | 'edict' | 'policy';
export type GamePhase = 'player' | 'shop' | 'bot' | 'complete';

export interface Resources {
  gold: number;
  food: number;
  runes: number;
  land: number;
  freeland: number;
}

export interface Buildings {
  bldpop: number;
  bldcash: number;
  bldtrp: number;
  bldcost: number;
  bldfood: number;
  bldwiz: number;
  blddef: number;
}

export interface Troops {
  trparm: number;
  trplnd: number;
  trpfly: number;
  trpsea: number;
  trpwiz: number;
}

export interface IndustryAllocation {
  trparm: number;
  trplnd: number;
  trpfly: number;
  trpsea: number;
}

export interface AdvisorEffect {
  type: string;
  modifier: number;
  condition?: string;
}

export interface Advisor {
  id: string;
  name: string;
  description: string;
  rarity: BonusRarity;
  effect: AdvisorEffect;
}

export interface Empire {
  id: string;
  name: string;
  race: Race;
  era: Era;
  eraChangedRound: number;
  resources: Resources;
  buildings: Buildings;
  troops: Troops;
  industryAllocation: IndustryAllocation;
  peasants: number;
  health: number;
  taxRate: number;
  bank: number;
  loan: number;
  networth: number;
  offTotal: number;
  offSucc: number;
  defTotal: number;
  defSucc: number;
  kills: number;
  shieldExpiresRound: number | null;
  gateExpiresRound: number | null;
  pacificationExpiresRound: number | null;
  divineProtectionExpiresRound: number | null;
  bonusTurnsNextRound: number;
  guaranteedRareDraft: boolean;
  extraDraftPicks: number;
  advisors: Advisor[];
  techs: Record<string, number>;
  policies: string[];
  bonusAdvisorSlots: number;
  bonusDraftOptions: number;
}

export interface GameRound {
  number: number;
  turnsRemaining: number;
  phase: GamePhase;
}

export interface MarketPrices {
  foodBuyPrice: number;
  foodSellPrice: number;
  troopBuyMultiplier: number;
  troopSellMultiplier: number;
  runeBuyPrice: number;
  runeSellPrice: number;
}

export interface EffectiveTroopPrices {
  trparm: { buy: number; sell: number };
  trplnd: { buy: number; sell: number };
  trpfly: { buy: number; sell: number };
  trpsea: { buy: number; sell: number };
}

export interface ShopStock {
  food: number;
  trparm: number;
  trplnd: number;
  trpfly: number;
  trpsea: number;
  runes: number;
}

export interface DraftOption {
  type: BonusType;
  item: Advisor | { id: string; name: string; description?: string; rarity?: BonusRarity; level?: number };
}

export interface CombatResult {
  won: boolean;
  attackerLosses: Partial<Troops>;
  defenderLosses: Partial<Troops>;
  landGained: number;
  landLost: number;
  buildingsGained: Partial<Buildings>;
  buildingsDestroyed: Partial<Buildings>;
  offpower: number;
  defpower: number;
}

export interface SpyIntel {
  targetId: string;
  targetName: string;
  round: number;              // Round when intel was gathered
  era: Era;
  race: Race;
  land: number;
  networth: number;
  peasants: number;
  health: number;
  taxRate: number;
  gold: number;
  food: number;
  runes: number;
  troops: Troops;
}

// News feed for bot phase results
export type NewsAction =
  | { type: 'attack'; success: boolean; landTaken: number }
  | { type: 'spell'; spell: SpellType; success: boolean }
  | { type: 'eliminated'; eliminatedBy: string };

export interface NewsItem {
  round: number;
  actor: string;
  actorId: string;
  target: string;
  targetId: string;
  action: NewsAction;
}

export interface BotStanding {
  id: string;
  name: string;
  networth: number;
  networthChange: number;
  isEliminated: boolean;
}

export interface SpellResult {
  success: boolean;
  spell: SpellType;
  resourcesGained?: Partial<Resources>;
  effectApplied?: string;
  effectDuration?: number;
  castCount?: number;
  troopsDestroyed?: Partial<Troops>;
  goldStolen?: number;
  foodDestroyed?: number;
  cashDestroyed?: number;
  buildingsDestroyed?: Partial<Buildings>;
  wizardsLost?: number;
  intel?: SpyIntel;
}

export interface TurnActionRequest {
  action: TurnAction;
  turns: number;
  buildingAllocation?: Partial<Buildings>;
  demolishAllocation?: Partial<Buildings>;
  industryAllocation?: IndustryAllocation;
  taxRate?: number;
  targetId?: string;
  attackType?: AttackType;
  spell?: SpellType;
  spellTargetId?: string;
}

// Reason turns stopped early (matching QM Promisance TURNS_TROUBLE_* flags)
export type TurnStopReason = 'food' | 'loan';

// Reason player was defeated (game over conditions)
export type DefeatReason = 'no_land' | 'no_peasants' | 'excessive_loan' | 'abandoned';

export interface TurnActionResult {
  success: boolean;
  turnsSpent: number;
  turnsRemaining: number;
  income: number;
  expenses: number;
  foodProduction: number;
  foodConsumption: number;
  runeChange: number;
  troopsProduced: Partial<Troops>;
  loanPayment: number;
  bankInterest: number;
  loanInterest: number;
  stoppedEarly?: TurnStopReason;
  landGained?: number;
  buildingsConstructed?: Partial<Buildings>;
  combatResult?: CombatResult;
  spellResult?: SpellResult;
  empire: Empire;
}

export interface ShopTransaction {
  type: 'buy' | 'sell';
  resource: 'food' | 'troops' | 'runes';
  amount: number;
  troopType?: keyof Troops;
}

export type BankOperation = 'deposit' | 'withdraw' | 'take_loan' | 'pay_loan';

export interface BankTransaction {
  operation: BankOperation;
  amount: number;
}

export interface BankInfo {
  savings: number;
  loan: number;
  gold: number;
  maxLoan: number;
  availableLoan: number;
  maxSavings: number;
  availableSavings: number;
  savingsRate: number;
  loanRate: number;
}

export interface BankTransactionResult {
  success: boolean;
  error?: string;
  operation: BankOperation;
  amount: number;
  newBankBalance: number;
  newLoanBalance: number;
  newGoldBalance: number;
}

export interface LeaderboardEntry {
  id: string;
  playerId: string;
  playerName: string;
  race: Race;
  finalNetworth: number;
  roundsCompleted: number;
  modifiers: string[];
  createdAt: number;
}

// Game stats for post-game summary
export interface GameStats {
  // Production totals
  totalIncome: number;
  totalExpenses: number;
  totalFoodProduction: number;
  totalFoodConsumption: number;
  totalRuneProduction: number;
  totalTroopsProduced: Troops;

  // Combat totals
  totalAttacks: number;
  totalAttackWins: number;
  totalLandGained: number;
  totalLandLost: number;
  totalKills: number;

  // Spell totals
  totalSpellsCast: number;
  totalOffensiveSpells: number;

  // Networth tracking
  networthPerTurn: number;
  turnsPlayed: number;

  // Peak values
  peakGold: number;
  peakFood: number;
  peakRunes: number;
  peakLand: number;
  peakNetworth: number;
  peakPeasants: number;
  peakTrparm: number;
  peakTrplnd: number;
  peakTrpfly: number;
  peakTrpsea: number;
  peakTrpwiz: number;
}

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

export interface BotSummary {
  id: string;
  name: string;
  race: Race;
  era: string;
  networth: number;
  land: number;
  troops?: Troops;
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

// Result information from applying an edict (for display to user)
export interface EdictResult {
  edictId: string;
  edictName: string;
  message: string;
  details?: {
    amountGained?: number;
    chosenTroopType?: 'trparm' | 'trplnd' | 'trpfly' | 'trpsea';
    boostedAmount?: number;
    chosenAdvisorName?: string;
    newModifier?: number;
  };
}

interface DraftResponse {
  success: boolean;
  error?: string;
  empire: Empire;
  draftOptions: DraftOption[] | null;
  picksRemaining?: number;
  edictResult?: EdictResult;
}

export interface RerollInfo {
  cost: number | null;
  canAfford: boolean;
  rerollCount: number;
  maxRerolls: number;
  rerollsRemaining: number;
  advisorCapacity: { current: number; max: number };
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

export interface BotPhaseResponse {
  news: NewsItem[];
  standings: BotStanding[];
  round: GameRound;
  playerEmpire: Empire;
  botEmpires: BotSummary[];
  intel: Record<string, SpyIntel>;
  isComplete: boolean;
  playerDefeated: DefeatReason | null;
  stats: GameStats;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
}

// API Client
export class PromisanceClient {
  private baseUrl: string;
  private sessionId: string | null = null;

  constructor(baseUrl: string = 'https://promisance-rogue.blake365morgan.workers.dev') {
    this.baseUrl = baseUrl;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setSession(sessionId: string) {
    this.sessionId = sessionId;
  }

  getSession(): string | null {
    return this.sessionId;
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
  async getLeaderboard(options?: {
    timeframe?: 'all' | 'daily' | 'weekly';
    race?: string;
    limit?: number;
    offset?: number;
  }): Promise<LeaderboardResponse> {
    const params = new URLSearchParams();
    if (options?.timeframe) params.set('timeframe', options.timeframe);
    if (options?.race) params.set('race', options.race);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));

    const query = params.toString();
    return this.request<LeaderboardResponse>(
      'GET',
      `/api/leaderboard${query ? `?${query}` : ''}`
    );
  }

  async getMyRank(): Promise<{ rank: number | null; score: number | null }> {
    return this.request('GET', '/api/leaderboard/rank');
  }

  // Health
  async health(): Promise<{ status: string; timestamp: number }> {
    return this.request('GET', '/health');
  }
}

// Singleton for convenience
export const client = new PromisanceClient();
