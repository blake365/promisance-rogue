import type {
  Empire,
  MarketPrices,
  ShopStock,
  DraftOption,
  Advisor,
  Tech,
  Edict,
  EdictResult,
  BonusRarity,
  ShopTransaction,
  RngState,
} from '../types';
import { SHOP, UNIT_COSTS, ECONOMY } from './constants';
import { calculateNetworth, addTroops, getModifier } from './empire';
import { ADVISORS } from './bonuses/advisors';
import { MASTERIES, MASTERY_BONUS_PER_LEVEL, MAX_MASTERY_LEVEL } from './bonuses/techs';
import { EDICTS } from './bonuses/edicts';
import { nextRng, randomFloat } from './rng';

// ============================================
// MARKET PRICE GENERATION
// ============================================

export interface MarketPriceResult {
  prices: MarketPrices;
  rngState: RngState;
}

export function generateMarketPrices(rngState: RngState): MarketPriceResult {
  const base = SHOP.baseMarketPrices;
  const fluctuation = SHOP.priceFluctuation;

  let state = rngState;
  const nextRandom = () => {
    const result = randomFloat(state);
    state = result.state;
    return result.value;
  };

  const fluctuate = (basePrice: number) => {
    const change = (nextRandom() - 0.5) * 2 * fluctuation;
    return Math.floor(basePrice * (1 + change));
  };

  const prices: MarketPrices = {
    foodBuyPrice: fluctuate(base.foodBuyPrice),
    foodSellPrice: fluctuate(base.foodSellPrice),
    troopBuyMultiplier: base.troopBuyMultiplier * (1 + (nextRandom() - 0.5) * fluctuation),
    troopSellMultiplier: base.troopSellMultiplier * (1 + (nextRandom() - 0.5) * fluctuation),
    runeBuyPrice: fluctuate(base.runeBuyPrice),
    runeSellPrice: fluctuate(base.runeSellPrice),
  };

  return { prices, rngState: state };
}

// ============================================
// SHOP STOCK GENERATION
// ============================================

// Stock multiplier - what fraction of networth worth of each item is available
const STOCK_MULTIPLIER = 0.50; // 50% of networth per item type

export function generateShopStock(empire: Empire, prices: MarketPrices): ShopStock {
  const networth = empire.networth;
  const stockBudget = networth * STOCK_MULTIPLIER;

  // Calculate stock for each item based on buy price
  const foodPrice = prices.foodBuyPrice;
  const runePrice = prices.runeBuyPrice;

  return {
    food: Math.floor(stockBudget / foodPrice),
    trparm: Math.floor(stockBudget / (UNIT_COSTS.trparm.buyPrice * prices.troopBuyMultiplier)),
    trplnd: Math.floor(stockBudget / (UNIT_COSTS.trplnd.buyPrice * prices.troopBuyMultiplier)),
    trpfly: Math.floor(stockBudget / (UNIT_COSTS.trpfly.buyPrice * prices.troopBuyMultiplier)),
    trpsea: Math.floor(stockBudget / (UNIT_COSTS.trpsea.buyPrice * prices.troopBuyMultiplier)),
    runes: Math.floor(stockBudget / runePrice),
  };
}

// ============================================
// MARKET TRANSACTIONS
// ============================================

// Sell limit - can only sell 50% of troops, unlimited food
const TROOP_SELL_LIMIT = 0.5;

// Shop bonus from pvtmarketbuy.php - affects how bldcash contributes to cost reduction
const PVTM_SHOPBONUS = 0.5;

/**
 * Calculate effective troop cost based on empire buildings and race modifiers
 * From QM Promisance pvtmarketbuy.php getCost()
 */
export function getEffectiveTroopCost(empire: Empire, baseCost: number, priceMultiplier: number = 1.0): number {
  const land = empire.resources.land;
  if (land <= 0) return Math.round(baseCost * priceMultiplier);

  const exchangeRatio = empire.buildings.bldcost / land;
  const marketRatio = empire.buildings.bldcash / land;

  // Cost bonus from buildings (exchanges reduce cost more, markets provide smaller bonus)
  const costBonus = 1 - ((1 - PVTM_SHOPBONUS) * exchangeRatio + PVTM_SHOPBONUS * marketRatio);

  // Race market modifier (higher is better, so 2 - modifier means gnomes pay less)
  const raceMarketMod = getModifier(empire, 'market');

  let cost = baseCost * priceMultiplier;
  cost *= costBonus;
  cost *= (2 - raceMarketMod);

  // Minimum cost is 60% of base
  const minCost = baseCost * priceMultiplier * 0.6;
  if (cost < minCost) cost = minCost;

  return Math.round(cost);
}

/**
 * Get effective troop prices for display in UI
 */
export function getEffectiveTroopPrices(empire: Empire, prices: MarketPrices): {
  trparm: { buy: number; sell: number };
  trplnd: { buy: number; sell: number };
  trpfly: { buy: number; sell: number };
  trpsea: { buy: number; sell: number };
} {
  return {
    trparm: {
      buy: getEffectiveTroopCost(empire, UNIT_COSTS.trparm.buyPrice, prices.troopBuyMultiplier),
      sell: Math.floor(UNIT_COSTS.trparm.buyPrice * prices.troopSellMultiplier),
    },
    trplnd: {
      buy: getEffectiveTroopCost(empire, UNIT_COSTS.trplnd.buyPrice, prices.troopBuyMultiplier),
      sell: Math.floor(UNIT_COSTS.trplnd.buyPrice * prices.troopSellMultiplier),
    },
    trpfly: {
      buy: getEffectiveTroopCost(empire, UNIT_COSTS.trpfly.buyPrice, prices.troopBuyMultiplier),
      sell: Math.floor(UNIT_COSTS.trpfly.buyPrice * prices.troopSellMultiplier),
    },
    trpsea: {
      buy: getEffectiveTroopCost(empire, UNIT_COSTS.trpsea.buyPrice, prices.troopBuyMultiplier),
      sell: Math.floor(UNIT_COSTS.trpsea.buyPrice * prices.troopSellMultiplier),
    },
  };
}

export function executeMarketTransaction(
  empire: Empire,
  transaction: ShopTransaction,
  prices: MarketPrices,
  shopStock?: ShopStock | null,
  isShopPhase?: boolean
): { success: boolean; goldChange: number; error?: string } {
  const { type, resource, amount, troopType } = transaction;

  if (amount <= 0) {
    return { success: false, goldChange: 0, error: 'Invalid amount' };
  }

  if (type === 'buy') {
    // Shop phase has stock limits
    if (isShopPhase && shopStock) {
      switch (resource) {
        case 'food':
          if (amount > shopStock.food) {
            return { success: false, goldChange: 0, error: `Only ${shopStock.food} food in stock` };
          }
          break;
        case 'runes':
          if (amount > shopStock.runes) {
            return { success: false, goldChange: 0, error: `Only ${shopStock.runes} runes in stock` };
          }
          break;
        case 'troops':
          if (troopType && troopType !== 'trpwiz') {
            const stock = shopStock[troopType as keyof ShopStock] as number;
            if (amount > stock) {
              return { success: false, goldChange: 0, error: `Only ${stock} units in stock` };
            }
          }
          break;
      }
    }

    switch (resource) {
      case 'food': {
        const cost = amount * prices.foodBuyPrice;
        if (empire.resources.gold < cost) {
          return { success: false, goldChange: 0, error: 'Not enough gold' };
        }
        empire.resources.gold -= cost;
        empire.resources.food += amount;
        // Reduce shop stock
        if (isShopPhase && shopStock) {
          shopStock.food -= amount;
        }
        return { success: true, goldChange: -cost };
      }

      case 'runes': {
        const cost = amount * prices.runeBuyPrice;
        if (empire.resources.gold < cost) {
          return { success: false, goldChange: 0, error: 'Not enough gold' };
        }
        empire.resources.gold -= cost;
        empire.resources.runes += amount;
        // Reduce shop stock
        if (isShopPhase && shopStock) {
          shopStock.runes -= amount;
        }
        return { success: true, goldChange: -cost };
      }

      case 'troops': {
        if (!troopType || troopType === 'trpwiz') {
          return { success: false, goldChange: 0, error: 'Invalid troop type' };
        }
        const baseCost = UNIT_COSTS[troopType].buyPrice;
        // Apply race/building modifiers to get effective per-unit cost
        const perUnitCost = getEffectiveTroopCost(empire, baseCost, prices.troopBuyMultiplier);
        const cost = amount * perUnitCost;
        if (empire.resources.gold < cost) {
          return { success: false, goldChange: 0, error: 'Not enough gold' };
        }
        empire.resources.gold -= cost;
        empire.troops = addTroops(empire.troops, { [troopType]: amount });
        // Reduce shop stock
        if (isShopPhase && shopStock) {
          (shopStock as any)[troopType] -= amount;
        }
        return { success: true, goldChange: -cost };
      }

      default:
        return { success: false, goldChange: 0, error: 'Invalid resource' };
    }
  } else {
    // Sell - shop phase has sell limits for troops (50%), unlimited food
    if (isShopPhase && resource === 'troops' && troopType && troopType !== 'trpwiz') {
      const maxSellable = Math.floor(empire.troops[troopType] * TROOP_SELL_LIMIT);
      if (amount > maxSellable) {
        return { success: false, goldChange: 0, error: `Can only sell ${maxSellable} (50% of owned)` };
      }
    }

    switch (resource) {
      case 'food': {
        if (empire.resources.food < amount) {
          return { success: false, goldChange: 0, error: 'Not enough food' };
        }
        const revenue = amount * prices.foodSellPrice;
        empire.resources.food -= amount;
        empire.resources.gold += revenue;
        return { success: true, goldChange: revenue };
      }

      case 'runes': {
        if (empire.resources.runes < amount) {
          return { success: false, goldChange: 0, error: 'Not enough runes' };
        }
        const revenue = amount * prices.runeSellPrice;
        empire.resources.runes -= amount;
        empire.resources.gold += revenue;
        return { success: true, goldChange: revenue };
      }

      case 'troops': {
        if (!troopType || troopType === 'trpwiz') {
          return { success: false, goldChange: 0, error: 'Invalid troop type' };
        }
        if (empire.troops[troopType] < amount) {
          return { success: false, goldChange: 0, error: 'Not enough troops' };
        }
        const baseCost = UNIT_COSTS[troopType].buyPrice;
        const revenue = Math.floor(amount * baseCost * prices.troopSellMultiplier);
        empire.troops[troopType] -= amount;
        empire.resources.gold += revenue;
        return { success: true, goldChange: revenue };
      }

      default:
        return { success: false, goldChange: 0, error: 'Invalid resource' };
    }
  }
}

// ============================================
// DRAFT GENERATION
// ============================================

function selectRarityWithState(state: RngState): { rarity: BonusRarity; state: RngState } {
  const weights = SHOP.rarityWeights;
  const total = weights.common + weights.uncommon + weights.rare + weights.legendary;

  const result = nextRng(state);
  const roll = result.value % total;

  let rarity: BonusRarity;
  if (roll < weights.common) rarity = 'common';
  else if (roll < weights.common + weights.uncommon) rarity = 'uncommon';
  else if (roll < weights.common + weights.uncommon + weights.rare) rarity = 'rare';
  else rarity = 'legendary';

  return { rarity, state: result.state };
}

function getItemsByRarity<T extends { rarity: BonusRarity }>(
  items: T[],
  rarity: BonusRarity
): T[] {
  return items.filter((item) => item.rarity === rarity);
}

function selectRandomItemWithState<T>(items: T[], state: RngState): { item: T; state: RngState } {
  const result = nextRng(state);
  const index = result.value % items.length;
  return { item: items[index], state: result.state };
}

// Helper to generate a single advisor option
// Will retry up to MAX_RETRIES times to find an unowned, unoffered advisor
function generateAdvisorOption(
  empire: Empire,
  state: RngState,
  offeredAdvisorIds: Set<string>,
  hasSecondChance: boolean
): { option: DraftOption | null; state: RngState } {
  const MAX_RETRIES = 10;
  const ownedIds = new Set(empire.advisors.map((a) => a.id));

  let currentState = state;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const rarityResult = selectRarityWithState(currentState);
    currentState = rarityResult.state;
    const advisors = getItemsByRarity(ADVISORS, rarityResult.rarity);

    if (advisors.length === 0) continue;

    const selectResult = selectRandomItemWithState(advisors, currentState);
    currentState = selectResult.state;
    const advisor = selectResult.item;

    // Skip if already owned
    if (ownedIds.has(advisor.id)) continue;

    // Skip if previously offered (unless hasSecondChance edict)
    if (!hasSecondChance && offeredAdvisorIds.has(advisor.id)) continue;

    return { option: { type: 'advisor', item: advisor }, state: currentState };
  }

  return { option: null, state: currentState };
}

// Helper to generate a rare or legendary advisor option (for guaranteed rare edict)
function generateRarePlusAdvisorOption(
  empire: Empire,
  state: RngState,
  offeredAdvisorIds: Set<string>,
  hasSecondChance: boolean
): { option: DraftOption | null; state: RngState } {
  const MAX_RETRIES = 10;
  const ownedIds = new Set(empire.advisors.map((a) => a.id));

  // Get only rare and legendary advisors
  const rareAdvisors = ADVISORS.filter(
    (a) => a.rarity === 'rare' || a.rarity === 'legendary'
  );

  if (rareAdvisors.length === 0) {
    return { option: null, state };
  }

  let currentState = state;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const selectResult = selectRandomItemWithState(rareAdvisors, currentState);
    currentState = selectResult.state;
    const advisor = selectResult.item;

    // Skip if already owned
    if (ownedIds.has(advisor.id)) continue;

    // Skip if previously offered (unless hasSecondChance edict)
    if (!hasSecondChance && offeredAdvisorIds.has(advisor.id)) continue;

    return { option: { type: 'advisor', item: advisor }, state: currentState };
  }

  // Fallback to regular generation if no valid rare+ found
  return generateAdvisorOption(empire, currentState, offeredAdvisorIds, hasSecondChance);
}

// Helper to generate a single non-advisor option (mastery or edict)
function generateOtherOption(empire: Empire, state: RngState): { option: DraftOption; state: RngState } {
  let currentState = state;

  const rarityResult = selectRarityWithState(currentState);
  currentState = rarityResult.state;
  const rarity = rarityResult.rarity;

  const typeResult = nextRng(currentState);
  currentState = typeResult.state;
  const typeRoll = typeResult.value % 100;

  let option: DraftOption;

  if (typeRoll < 50) {
    // Mastery (50%) - only offer masteries not yet at max level
    const availableMasteries = MASTERIES.filter(
      (m) => (empire.techs[m.action] ?? 0) < MAX_MASTERY_LEVEL
    );
    if (availableMasteries.length > 0) {
      const selectResult = selectRandomItemWithState(availableMasteries, currentState);
      currentState = selectResult.state;
      option = { type: 'tech', item: selectResult.item };
    } else {
      // All masteries maxed, offer edict instead
      const selectResult = selectRandomItemWithState(EDICTS, currentState);
      currentState = selectResult.state;
      option = { type: 'edict', item: selectResult.item };
    }
  } else {
    // Edict (50%)
    const edicts = getItemsByRarity(EDICTS, rarity);
    const selectResult = selectRandomItemWithState(edicts.length > 0 ? edicts : EDICTS, currentState);
    currentState = selectResult.state;
    option = { type: 'edict', item: selectResult.item };
  }

  return { option, state: currentState };
}

export interface DraftResult {
  options: DraftOption[];
  newOfferedAdvisorIds: string[];
  rngState: RngState;
}

export function generateDraftOptions(
  rngState: RngState,
  empire: Empire,
  previouslyOfferedIds: string[] = []
): DraftResult {
  const options: DraftOption[] = [];
  const newOfferedAdvisorIds: string[] = [];
  let state = rngState;

  // Check if player has Second Chance edict (allows previously offered advisors)
  const hasSecondChance = hasEdictEffect(empire, 'second_chance');

  // Build set of previously offered IDs for lookup
  const offeredSet = new Set(previouslyOfferedIds);

  // Determine number of advisor slots (1-2 base + bonus from edicts)
  const advisorSlotsResult = nextRng(state);
  state = advisorSlotsResult.state;
  const baseAdvisorSlots = SHOP.advisorOptionsMin +
    (advisorSlotsResult.value % (SHOP.advisorOptionsMax - SHOP.advisorOptionsMin + 1));
  const advisorSlots = baseAdvisorSlots + (empire.bonusDraftOptions ?? 0);

  // Determine number of other slots (2-3)
  const otherSlotsResult = nextRng(state);
  state = otherSlotsResult.state;
  let otherSlots = SHOP.otherOptionsMin +
    (otherSlotsResult.value % (SHOP.otherOptionsMax - SHOP.otherOptionsMin + 1));

  // Ensure minimum of 4 total draft options
  const minTotalOptions = 4;
  if (advisorSlots + otherSlots < minTotalOptions) {
    otherSlots = minTotalOptions - advisorSlots;
  }

  // Check for guaranteed rare advisor
  const hasGuaranteedRare = empire.guaranteedRareDraft ?? false;

  // Generate advisor options (may get fewer if not enough unique advisors available)
  const thisRoundIds = new Set<string>();
  let hasRarePlus = false;  // Track if we've added a rare+ advisor

  for (let i = 0; i < advisorSlots; i++) {
    // Force rare+ for first slot if guaranteed and we haven't added one yet
    const forceRarePlus = hasGuaranteedRare && !hasRarePlus && i === 0;

    const result = forceRarePlus
      ? generateRarePlusAdvisorOption(empire, state, offeredSet, hasSecondChance)
      : generateAdvisorOption(empire, state, offeredSet, hasSecondChance);
    state = result.state;

    if (result.option) {
      const advisor = result.option.item as Advisor;
      const advisorId = advisor.id;
      // Avoid duplicate advisors in same draft
      if (!thisRoundIds.has(advisorId)) {
        options.push(result.option);
        thisRoundIds.add(advisorId);
        newOfferedAdvisorIds.push(advisorId);
        // Add to offered set so next slot in this draft doesn't pick same one
        offeredSet.add(advisorId);

        // Track if we added a rare+ advisor
        if (advisor.rarity === 'rare' || advisor.rarity === 'legendary') {
          hasRarePlus = true;
        }
      }
    }
  }

  // Generate other options (tech or edict)
  for (let i = 0; i < otherSlots; i++) {
    const result = generateOtherOption(empire, state);
    state = result.state;
    options.push(result.option);
  }

  return { options, newOfferedAdvisorIds, rngState: state };
}

// ============================================
// REROLL COST CALCULATION
// ============================================

/**
 * Calculate the liquidation value of an empire at current market prices.
 * This represents the total gold the player would have if they sold all assets.
 */
export function calculateLiquidationValue(empire: Empire, prices: MarketPrices): number {
  let value = 0;

  // Current gold
  value += empire.resources.gold;

  // Bank savings (fully withdrawable)
  value += empire.bank;

  // Subtract loan debt
  value -= empire.loan;

  // Food sold at market price
  value += empire.resources.food * prices.foodSellPrice;

  // Runes sold at market price
  value += empire.resources.runes * prices.runeSellPrice;

  // Troops sold at market price (base cost * sell multiplier)
  value += empire.troops.trparm * UNIT_COSTS.trparm.buyPrice * prices.troopSellMultiplier;
  value += empire.troops.trplnd * UNIT_COSTS.trplnd.buyPrice * prices.troopSellMultiplier;
  value += empire.troops.trpfly * UNIT_COSTS.trpfly.buyPrice * prices.troopSellMultiplier;
  value += empire.troops.trpsea * UNIT_COSTS.trpsea.buyPrice * prices.troopSellMultiplier;

  return Math.max(0, Math.floor(value));
}

export function calculateRerollCost(empire: Empire, prices: MarketPrices): number {
  const liquidationValue = calculateLiquidationValue(empire, prices);
  return Math.floor(liquidationValue * SHOP.rerollCostPercent);
}

// ============================================
// APPLY DRAFT SELECTION
// ============================================

export interface DraftSelectionContext {
  bots?: import('../types').BotEmpire[];
  currentRound?: number;
  seed?: number;
  clearOfferedCallback?: () => void;
}

export function applyDraftSelection(
  empire: Empire,
  option: DraftOption,
  context: DraftSelectionContext = {}
): { success: boolean; error?: string; edictResult?: EdictResult } {
  let edictResult: EdictResult | undefined;

  switch (option.type) {
    case 'advisor': {
      // Check advisor limit (base + bonus slots from edicts)
      const maxAdvisors = SHOP.maxAdvisors + (empire.bonusAdvisorSlots ?? 0);
      if (empire.advisors.length >= maxAdvisors) {
        return { success: false, error: `Cannot have more than ${maxAdvisors} advisors. Dismiss one first.` };
      }
      const advisor = option.item as Advisor;
      empire.advisors.push(advisor);
      break;
    }

    case 'tech': {
      // Mastery: increment level by 1 (capped at MAX_MASTERY_LEVEL)
      const tech = option.item as Tech;
      const currentLevel = empire.techs[tech.action] ?? 0;
      if (currentLevel >= MAX_MASTERY_LEVEL) {
        return { success: false, error: 'Mastery already at maximum level' };
      }
      empire.techs[tech.action] = currentLevel + 1;
      break;
    }

    case 'edict': {
      const edict = option.item as Edict;
      edictResult = applyEdictEffect(empire, edict, context);
      break;
    }
  }

  empire.networth = calculateNetworth(empire);
  return { success: true, edictResult };
}

// ============================================
// DISMISS ADVISOR
// ============================================

export function dismissAdvisor(
  empire: Empire,
  advisorId: string
): { success: boolean; error?: string; dismissed?: Advisor } {
  const advisorIndex = empire.advisors.findIndex((a) => a.id === advisorId);

  if (advisorIndex === -1) {
    return { success: false, error: 'Advisor not found' };
  }

  const dismissed = empire.advisors.splice(advisorIndex, 1)[0];
  empire.networth = calculateNetworth(empire);

  return { success: true, dismissed };
}

// ============================================
// CHECK ADVISOR CAPACITY
// ============================================

export function canAddAdvisor(empire: Empire): boolean {
  const maxAdvisors = SHOP.maxAdvisors + (empire.bonusAdvisorSlots ?? 0);
  return empire.advisors.length < maxAdvisors;
}

export function getAdvisorCapacity(empire: Empire): { current: number; max: number } {
  return {
    current: empire.advisors.length,
    max: SHOP.maxAdvisors + (empire.bonusAdvisorSlots ?? 0),
  };
}

interface ApplyEdictContext {
  bots?: import('../types').BotEmpire[];
  currentRound?: number;
  seed?: number;
  clearOfferedCallback?: () => void;  // Callback to clear offered advisor IDs on the run
}

const TROOP_TYPE_NAMES: Record<string, string> = {
  trparm: 'Infantry',
  trplnd: 'Cavalry',
  trpfly: 'Aircraft',
  trpsea: 'Navy',
};

function applyEdictEffect(
  empire: Empire,
  edict: Edict,
  context: ApplyEdictContext = {}
): EdictResult {
  const { type, value } = edict.effect;
  const { bots, currentRound = 1, seed = Date.now() } = context;

  const result: EdictResult = {
    edictId: edict.id,
    edictName: edict.name,
    message: edict.description, // Default message
  };

  switch (type) {
    case 'gold':
      empire.resources.gold += value as number;
      result.message = `Gained ${value} gold`;
      result.details = { amountGained: value as number };
      break;

    case 'food':
      empire.resources.food += value as number;
      result.message = `Gained ${value} food`;
      result.details = { amountGained: value as number };
      break;

    case 'runes':
      empire.resources.runes += value as number;
      result.message = `Gained ${value} runes`;
      result.details = { amountGained: value as number };
      break;

    case 'land':
      empire.resources.land += value as number;
      empire.resources.freeland += value as number;
      result.message = `Gained ${value} land`;
      result.details = { amountGained: value as number };
      break;

    case 'health':
      empire.health = Math.min(100, value as number);
      result.message = `Health restored to ${empire.health}%`;
      break;

    case 'conscript': {
      const conscripted = Math.floor(empire.peasants * (value as number));
      empire.peasants -= conscripted;
      empire.troops.trparm += conscripted;
      result.message = `Conscripted ${conscripted} peasants into infantry`;
      result.details = { amountGained: conscripted };
      break;
    }

    case 'troops':
      empire.troops.trparm += value as number;
      empire.troops.trplnd += value as number;
      empire.troops.trpfly += value as number;
      empire.troops.trpsea += value as number;
      result.message = `Gained ${value} of each troop type`;
      break;

    case 'steal_gold':
      if (bots && bots.length > 0) {
        const richest = bots.reduce((a, b) =>
          a.resources.gold > b.resources.gold ? a : b
        );
        const stolen = Math.floor(richest.resources.gold * (value as number));
        richest.resources.gold -= stolen;
        empire.resources.gold += stolen;
        result.message = `Stole ${stolen} gold from ${richest.name}`;
        result.details = { amountGained: stolen };
      }
      break;

    case 'advance_era': {
      const eraOrder = ['past', 'present', 'future'] as const;
      const currentIndex = eraOrder.indexOf(empire.era);
      if (currentIndex < eraOrder.length - 1) {
        empire.era = eraOrder[currentIndex + 1];
        result.message = `Advanced to the ${empire.era} era`;
      } else {
        result.message = `Already in the future era`;
      }
      break;
    }

    case 'advisor_slot':
      empire.bonusAdvisorSlots = (empire.bonusAdvisorSlots ?? 0) + (value as number);
      result.message = `Gained +${value} advisor slot`;
      break;

    case 'bonus_draft_options':
      empire.bonusDraftOptions = (empire.bonusDraftOptions ?? 0) + (value as number);
      result.message = `Gained +${value} draft option per round`;
      break;

    case 'policy':
      if (typeof value === 'string' && !empire.policies.includes(value)) {
        empire.policies.push(value);
      }
      break;

    // ============================================
    // NEW SPECTRAL-STYLE EDICTS
    // ============================================

    case 'percent_gold': {
      const goldGained = Math.floor(empire.resources.gold * (value as number));
      empire.resources.gold += goldGained;
      result.message = `Gained ${goldGained} gold (${Math.round((value as number) * 100)}% bonus)`;
      result.details = { amountGained: goldGained };
      break;
    }

    case 'percent_food': {
      const foodGained = Math.floor(empire.resources.food * (value as number));
      empire.resources.food += foodGained;
      result.message = `Gained ${foodGained} food (${Math.round((value as number) * 100)}% bonus)`;
      result.details = { amountGained: foodGained };
      break;
    }

    case 'percent_land': {
      const extraLand = Math.floor(empire.resources.land * (value as number));
      empire.resources.land += extraLand;
      empire.resources.freeland += extraLand;
      result.message = `Gained ${extraLand} land (${Math.round((value as number) * 100)}% bonus)`;
      result.details = { amountGained: extraLand };
      break;
    }

    case 'clear_offered':
      if (context.clearOfferedCallback) {
        context.clearOfferedCallback();
      }
      result.message = `Cleared advisor history - all advisors available again`;
      break;

    case 'bonus_turns_next':
      empire.bonusTurnsNextRound = (empire.bonusTurnsNextRound ?? 0) + (value as number);
      result.message = `+${value} bonus turns next round`;
      break;

    case 'pacification':
      empire.pacificationExpiresRound = currentRound + (value as number);
      result.message = `Bots will not attack you for ${value} round(s)`;
      break;

    case 'divine_protection':
      empire.divineProtectionExpiresRound = currentRound + (value as number);
      result.message = `Immune to bot attacks for ${value} round(s)`;
      break;

    case 'guaranteed_rare':
      empire.guaranteedRareDraft = true;
      result.message = `Next draft will contain a rare+ advisor`;
      break;

    case 'extra_draft_pick':
      empire.extraDraftPicks = (empire.extraDraftPicks ?? 0) + (value as number);
      result.message = `You can pick ${value} extra option(s) from the next draft`;
      break;

    case 'elite_corps': {
      const troopTypes: (keyof typeof empire.troops)[] = ['trparm', 'trplnd', 'trpfly', 'trpsea'];
      let rng = seed;
      rng = (rng * 1103515245 + 12345) & 0x7fffffff;
      const chosenType = troopTypes[rng % troopTypes.length];

      const boostedAmount = Math.floor(empire.troops[chosenType] * (1 + (value as number)));

      for (const t of troopTypes) {
        empire.troops[t] = 0;
      }
      empire.troops[chosenType] = boostedAmount;

      const typeName = TROOP_TYPE_NAMES[chosenType] || chosenType;
      result.message = `${typeName} boosted to ${boostedAmount}! Other troops dismissed.`;
      result.details = {
        chosenTroopType: chosenType as 'trparm' | 'trplnd' | 'trpfly' | 'trpsea',
        boostedAmount,
      };
      break;
    }

    case 'advisor_mastery': {
      if (empire.advisors.length > 0) {
        let rng = seed;
        rng = (rng * 1103515245 + 12345) & 0x7fffffff;
        const chosenIndex = rng % empire.advisors.length;
        const chosenAdvisor = empire.advisors[chosenIndex];

        chosenAdvisor.effect.modifier *= value as number;
        empire.advisors = [chosenAdvisor];

        result.message = `${chosenAdvisor.name}'s effect doubled! Other advisors dismissed.`;
        result.details = {
          chosenAdvisorName: chosenAdvisor.name,
          newModifier: chosenAdvisor.effect.modifier,
        };
      } else {
        result.message = `No advisors to enhance`;
      }
      break;
    }
  }

  return result;
}

/**
 * Check if empire has a specific policy/edict effect active
 */
export function hasEdictEffect(empire: Empire, policyName: string): boolean {
  return empire.policies.includes(policyName);
}

// ============================================
// GET ADVISOR BONUS
// ============================================

export function getAdvisorBonus(empire: Empire, effectType: string): number {
  let bonus = 0;

  for (const advisor of empire.advisors) {
    if (advisor.effect.type === effectType) {
      bonus += advisor.effect.modifier;
    }
  }

  return bonus;
}

export function getTechBonus(empire: Empire, action: string): number {
  const level = empire.techs[action] ?? 0;
  if (level === 0) return 0;

  // Sum all bonuses up to current level
  // MASTERY_BONUS_PER_LEVEL = [10, 10, 10, 15, 15] (percentage points)
  let totalBonus = 0;
  for (let i = 0; i < level; i++) {
    totalBonus += MASTERY_BONUS_PER_LEVEL[i] ?? 0;
  }
  return totalBonus / 100;
}
