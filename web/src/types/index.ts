// Game types - ported from CLI for web independence
// Keep in sync with cli/src/api/client.ts and server types

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

export interface SpellCosts {
  shield: number;
  food: number;
  cash: number;
  runes: number;
  blast: number;
  steal: number;
  storm: number;
  struct: number;
  advance: number;
  regress: number;
  gate: number;
  spy: number;
  fight: number;
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
  attacksThisRound: number;
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
  spellCosts?: SpellCosts;
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
  round: number;
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

export type NewsAction =
  | { type: 'attack'; success: boolean; landTaken: number; attackType?: AttackType }
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

export type TurnStopReason = 'food' | 'loan';
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
  seed: number;
  createdAt: number;
}

export interface GameStats {
  totalIncome: number;
  totalExpenses: number;
  totalFoodProduction: number;
  totalFoodConsumption: number;
  totalRuneProduction: number;
  totalTroopsProduced: Troops;
  totalAttacks: number;
  totalAttackWins: number;
  totalLandGained: number;
  totalLandLost: number;
  totalKills: number;
  totalSpellsCast: number;
  totalOffensiveSpells: number;
  networthPerTurn: number;
  turnsPlayed: number;
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

export interface BotSummary {
  id: string;
  name: string;
  race: Race;
  era: string;
  networth: number;
  land: number;
  troops?: Troops;
}

export interface RerollInfo {
  cost: number | null;
  canAfford: boolean;
  rerollCount: number;
  maxRerolls: number;
  rerollsRemaining: number;
  advisorCapacity: { current: number; max: number };
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
