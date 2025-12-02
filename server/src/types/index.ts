// Core game types for Promisance Rogue
// Names match QM Promisance 4.81 conventions

// ============================================
// ENUMS
// ============================================

export type Era = 'past' | 'present' | 'future';

export type Race = 'human' | 'elf' | 'dwarf' | 'troll' | 'gnome' | 'gremlin' | 'orc' | 'drow' | 'goblin';

export type TurnAction =
  | 'explore'
  | 'farm'
  | 'cash'
  | 'meditate'
  | 'industry'
  | 'build'
  | 'attack'
  | 'spell';

export type SpellType =
  | 'shield'
  | 'food'
  | 'cash'
  | 'runes'
  | 'blast'
  | 'steal'
  | 'storm'
  | 'struct'
  | 'advance'
  | 'regress'
  | 'gate'
  | 'spy'
  | 'fight';

// Attack types from QM Promisance military.php
export type AttackType =
  | 'standard'   // Uses all unit types with standard loss rates
  | 'trparm'     // Soldier attack - only uses infantry
  | 'trplnd'     // Tank attack - only uses land units
  | 'trpfly'     // Air attack - only uses air units
  | 'trpsea';    // Naval attack - only uses sea units

export type BonusRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export type BonusType = 'advisor' | 'tech' | 'edict' | 'policy';

export type GamePhase = 'player' | 'shop' | 'bot' | 'complete';

// ============================================
// RESOURCES & BUILDINGS (QM Promisance names)
// ============================================

export interface Resources {
  gold: number;       // e_cash
  food: number;       // e_food
  runes: number;      // e_runes
  land: number;       // e_land
  freeland: number;   // e_freeland
}

// Building names match QM Promisance (e_bld*)
export interface Buildings {
  bldpop: number;     // Homes - population capacity
  bldcash: number;    // Markets - income generation
  bldtrp: number;     // Barracks - troop production
  bldcost: number;    // Industry - expense reduction
  bldfood: number;    // Farms - food production
  bldwiz: number;     // Wizard towers - rune generation
  blddef: number;     // Guard towers - defense bonus
}

// Troop names match QM Promisance (e_trp*)
export interface Troops {
  trparm: number;     // Infantry/soldiers
  trplnd: number;     // Land units/vehicles
  trpfly: number;     // Air units/aircraft
  trpsea: number;     // Sea units/navy
  trpwiz: number;     // Wizards
}

export interface IndustryAllocation {
  trparm: number;     // % of barracks output (0-100)
  trplnd: number;
  trpfly: number;
  trpsea: number;
}

// ============================================
// EMPIRE STATE
// ============================================

export interface Empire {
  id: string;
  name: string;
  race: Race;
  era: Era;
  eraChangedRound: number;

  // Resources
  resources: Resources;

  // Buildings
  buildings: Buildings;

  // Military
  troops: Troops;
  industryAllocation: IndustryAllocation;

  // Economy
  peasants: number;
  health: number;         // 0-100
  taxRate: number;        // 0-100
  bank: number;           // Savings
  loan: number;           // Debt

  // Stats
  networth: number;

  // Combat stats
  offTotal: number;       // Total attacks made
  offSucc: number;        // Successful attacks
  defTotal: number;       // Times attacked
  defSucc: number;        // Successful defenses
  kills: number;          // Empires killed

  // Effects (round-based for roguelike)
  shieldExpiresRound: number | null;  // Shield lasts until end of this round's bot phase
  gateExpiresRound: number | null;    // Gate lasts until end of this round

  // Bonuses (from shop)
  advisors: Advisor[];
  techs: Record<string, number>;
  policies: string[];
}

// ============================================
// BONUSES (SHOP SYSTEM)
// ============================================

export interface Advisor {
  id: string;
  name: string;
  description: string;
  rarity: BonusRarity;
  effect: AdvisorEffect;
}

export interface AdvisorEffect {
  type: string;
  modifier: number;
  condition?: string;
}

export interface Tech {
  id: string;
  name: string;
  action: TurnAction;
  level: number;
  bonus: number;
}

export interface Edict {
  id: string;
  name: string;
  description: string;
  rarity: BonusRarity;
  effect: EdictEffect;
}

export interface EdictEffect {
  type: string;
  value: number;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  rarity: BonusRarity;
  unlocks: string;
}

export interface DraftOption {
  type: BonusType;
  item: Advisor | Tech | Edict | Policy;
}

// ============================================
// BOT SYSTEM
// ============================================

export type BotArchetype =
  | 'general_vask'
  | 'grain_mother'
  | 'archon_nyx'
  | 'iron_baron'
  | 'the_locust'
  | 'shadow_merchant'
  | 'the_fortress';

export interface BotPersonality {
  archetype: BotArchetype;
  name: string;
  preferredEra: Era;
  weights: {
    explore: number;
    farm: number;
    cash: number;
    meditate: number;
    industry: number;
    build: number;
    attack: number;
    spell: number;
  };
  aggressionThreshold: number;
  defenseFocus: number;
}

export type BotState =
  | 'developing'    // Early game, building economy
  | 'militarizing'  // Mid game, building army
  | 'aggressive'    // Ready to attack
  | 'defensive'     // Under threat, turtle up
  | 'retaliating';  // Recently attacked, revenge mode

export interface BotMemory {
  attacksReceived: Record<string, number>;
  spellsReceived: Record<string, number>;
  landLostTo: Record<string, number>;
  lastAttackedBy: string | null;
  lastAttackedRound: number | null;
}

export interface BotEmpire extends Empire {
  isBot: true;
  personality: BotPersonality;
  memory: BotMemory;
  currentState: BotState;
}

// News feed for bot phase
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

export interface BotPhaseResult {
  botEmpires: BotEmpire[];
  playerEmpire: Empire;
  news: NewsItem[];
  standings: BotStanding[];
  newSeed: number;
}

export interface BotStanding {
  id: string;
  name: string;
  networth: number;
  networthChange: number;
  isEliminated: boolean;
}

// ============================================
// GAME STATE
// ============================================

export interface GameRound {
  number: number;
  turnsRemaining: number;
  phase: GamePhase;
}

export interface GameRun {
  id: string;
  playerId: string;
  seed: number;

  round: GameRound;
  playerEmpire: Empire;
  botEmpires: BotEmpire[];

  marketPrices: MarketPrices;
  shopStock: ShopStock | null; // Available during shop phase only
  draftOptions: DraftOption[] | null;

  modifiers: RunModifier[];

  createdAt: number;
  updatedAt: number;
}

export interface MarketPrices {
  foodBuyPrice: number;
  foodSellPrice: number;
  troopBuyMultiplier: number;
  troopSellMultiplier: number;
  runeBuyPrice: number;
  runeSellPrice: number;
}

// Shop stock - limited quantities available to buy during shop phase
export interface ShopStock {
  food: number;
  trparm: number;
  trplnd: number;
  trpfly: number;
  trpsea: number;
  runes: number;
}

export interface RunModifier {
  id: string;
  name: string;
  description: string;
  scoreMultiplier: number;
}

// ============================================
// COMBAT (matching military.php)
// ============================================

export interface CombatResult {
  won: boolean;

  attackerLosses: Partial<Troops>;
  defenderLosses: Partial<Troops>;

  landGained: number;
  buildingsGained: Partial<Buildings>;
  buildingsDestroyed: Partial<Buildings>;

  offpower: number;
  defpower: number;
}

// ============================================
// SPELL RESULTS
// ============================================

export interface SpellResult {
  success: boolean;
  spell: SpellType;

  // For self spells
  resourcesGained?: Partial<Resources>;
  effectApplied?: string;
  effectDuration?: number;

  // For multiple casts
  castCount?: number;

  // For enemy spells
  troopsDestroyed?: Partial<Troops>;
  goldStolen?: number;
  foodDestroyed?: number;
  cashDestroyed?: number;
  buildingsDestroyed?: Partial<Buildings>;

  // On failure
  wizardsLost?: number;
}

// ============================================
// API TYPES
// ============================================

export interface TurnActionRequest {
  action: TurnAction;
  turns: number;

  buildingAllocation?: Partial<Buildings>;
  targetId?: string;
  attackType?: AttackType;
  spell?: SpellType;
  spellTargetId?: string;
}

export interface TurnActionResult {
  success: boolean;
  turnsSpent: number;
  turnsRemaining: number;

  // Economy processed
  income: number;
  expenses: number;
  foodProduction: number;
  foodConsumption: number;
  runeChange: number;
  troopsProduced: Partial<Troops>;

  // Bank/loan changes
  loanPayment: number;
  bankInterest: number;
  loanInterest: number;

  // Action-specific results
  landGained?: number;
  buildingsConstructed?: Partial<Buildings>;
  combatResult?: CombatResult;
  spellResult?: SpellResult;

  // Updated state
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

export interface BankTransactionResult {
  success: boolean;
  error?: string;
  operation: BankOperation;
  amount: number;
  newBankBalance: number;
  newLoanBalance: number;
  newGoldBalance: number;
}

export interface DraftSelection {
  optionIndex: number;
}

// ============================================
// LEADERBOARD
// ============================================

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

// ============================================
// CLOUDFLARE BINDINGS
// ============================================

export interface Env {
  DB: D1Database;
}
