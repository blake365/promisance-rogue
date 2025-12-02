import type {
  Empire,
  MarketPrices,
  ShopStock,
  DraftOption,
  Advisor,
  Tech,
  Edict,
  BonusRarity,
  ShopTransaction,
} from '../types';
import { SHOP, UNIT_COSTS } from './constants';
import { calculateNetworth, addTroops } from './empire';
import { ADVISORS } from './bonuses/advisors';
import { TECHS } from './bonuses/techs';
import { EDICTS } from './bonuses/edicts';

// ============================================
// MARKET PRICE GENERATION
// ============================================

export function generateMarketPrices(seed: number): MarketPrices {
  const base = SHOP.baseMarketPrices;
  const fluctuation = SHOP.priceFluctuation;

  // Seeded random for price fluctuation
  let rng = seed;
  const nextRandom = () => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;
    return (rng % 1000) / 1000;
  };

  const fluctuate = (basePrice: number) => {
    const change = (nextRandom() - 0.5) * 2 * fluctuation;
    return Math.floor(basePrice * (1 + change));
  };

  return {
    foodBuyPrice: fluctuate(base.foodBuyPrice),
    foodSellPrice: fluctuate(base.foodSellPrice),
    troopBuyMultiplier: base.troopBuyMultiplier * (1 + (nextRandom() - 0.5) * fluctuation),
    troopSellMultiplier: base.troopSellMultiplier * (1 + (nextRandom() - 0.5) * fluctuation),
    runeBuyPrice: fluctuate(base.runeBuyPrice),
    runeSellPrice: fluctuate(base.runeSellPrice),
  };
}

// ============================================
// SHOP STOCK GENERATION
// ============================================

// Stock multiplier - what fraction of networth worth of each item is available
const STOCK_MULTIPLIER = 0.05; // 5% of networth per item type

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
        const cost = Math.floor(amount * baseCost * prices.troopBuyMultiplier);
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

function selectRarity(seed: number): BonusRarity {
  const weights = SHOP.rarityWeights;
  const total = weights.common + weights.uncommon + weights.rare + weights.legendary;

  const rng = (seed * 1103515245 + 12345) & 0x7fffffff;
  const roll = (rng % total);

  if (roll < weights.common) return 'common';
  if (roll < weights.common + weights.uncommon) return 'uncommon';
  if (roll < weights.common + weights.uncommon + weights.rare) return 'rare';
  return 'legendary';
}

function getItemsByRarity<T extends { rarity: BonusRarity }>(
  items: T[],
  rarity: BonusRarity
): T[] {
  return items.filter((item) => item.rarity === rarity);
}

function selectRandomItem<T>(items: T[], seed: number): T {
  const rng = (seed * 1103515245 + 12345) & 0x7fffffff;
  const index = rng % items.length;
  return items[index];
}

// Helper to generate a single advisor option
function generateAdvisorOption(empire: Empire, rng: number): { option: DraftOption | null; rng: number } {
  rng = (rng * 1103515245 + 12345) & 0x7fffffff;
  const rarity = selectRarity(rng);
  const advisors = getItemsByRarity(ADVISORS, rarity);

  if (advisors.length > 0) {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;
    const advisor = selectRandomItem(advisors, rng);
    // Don't offer advisors already owned
    if (!empire.advisors.find((a) => a.id === advisor.id)) {
      return { option: { type: 'advisor', item: advisor }, rng };
    }
  }
  return { option: null, rng };
}

// Helper to generate a single non-advisor option (tech or edict)
function generateOtherOption(empire: Empire, rng: number): { option: DraftOption; rng: number } {
  rng = (rng * 1103515245 + 12345) & 0x7fffffff;
  const rarity = selectRarity(rng);

  rng = (rng * 1103515245 + 12345) & 0x7fffffff;
  const typeRoll = rng % 100;

  let option: DraftOption;

  if (typeRoll < 50) {
    // Tech (50%)
    const availableTechs = TECHS.filter(
      (t) => !empire.techs[t.action] || empire.techs[t.action] < t.level
    );
    if (availableTechs.length > 0) {
      rng = (rng * 1103515245 + 12345) & 0x7fffffff;
      option = { type: 'tech', item: selectRandomItem(availableTechs, rng) };
    } else {
      rng = (rng * 1103515245 + 12345) & 0x7fffffff;
      option = { type: 'edict', item: selectRandomItem(EDICTS, rng) };
    }
  } else {
    // Edict (50%)
    const edicts = getItemsByRarity(EDICTS, rarity);
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;
    option = { type: 'edict', item: selectRandomItem(edicts.length > 0 ? edicts : EDICTS, rng) };
  }

  return { option, rng };
}

export function generateDraftOptions(
  seed: number,
  empire: Empire
): DraftOption[] {
  const options: DraftOption[] = [];
  let rng = seed;

  // Determine number of advisor slots (1-2)
  rng = (rng * 1103515245 + 12345) & 0x7fffffff;
  const advisorSlots = SHOP.advisorOptionsMin +
    (rng % (SHOP.advisorOptionsMax - SHOP.advisorOptionsMin + 1));

  // Determine number of other slots (2-3)
  rng = (rng * 1103515245 + 12345) & 0x7fffffff;
  const otherSlots = SHOP.otherOptionsMin +
    (rng % (SHOP.otherOptionsMax - SHOP.otherOptionsMin + 1));

  // Generate advisor options (may get fewer if not enough unique advisors available)
  const usedAdvisorIds = new Set(empire.advisors.map(a => a.id));
  for (let i = 0; i < advisorSlots; i++) {
    const result = generateAdvisorOption(empire, rng);
    rng = result.rng;

    if (result.option) {
      const advisorId = (result.option.item as Advisor).id;
      // Avoid duplicate advisors in same draft
      if (!usedAdvisorIds.has(advisorId)) {
        options.push(result.option);
        usedAdvisorIds.add(advisorId);
      }
    }
  }

  // Generate other options (tech or edict)
  for (let i = 0; i < otherSlots; i++) {
    const result = generateOtherOption(empire, rng);
    rng = result.rng;
    options.push(result.option);
  }

  return options;
}

// ============================================
// REROLL COST CALCULATION
// ============================================

export function calculateRerollCost(empire: Empire): number {
  return Math.floor(empire.resources.gold * SHOP.rerollCostPercent);
}

// ============================================
// APPLY DRAFT SELECTION
// ============================================

export function applyDraftSelection(
  empire: Empire,
  option: DraftOption,
  bots?: import('../types').BotEmpire[]
): { success: boolean; error?: string } {
  switch (option.type) {
    case 'advisor': {
      // Check advisor limit
      if (empire.advisors.length >= SHOP.maxAdvisors) {
        return { success: false, error: `Cannot have more than ${SHOP.maxAdvisors} advisors. Dismiss one first.` };
      }
      const advisor = option.item as Advisor;
      empire.advisors.push(advisor);
      break;
    }

    case 'tech': {
      const tech = option.item as Tech;
      empire.techs[tech.action] = tech.level;
      break;
    }

    case 'edict': {
      const edict = option.item as Edict;
      applyEdictEffect(empire, edict, bots);
      break;
    }
  }

  empire.networth = calculateNetworth(empire);
  return { success: true };
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
  return empire.advisors.length < SHOP.maxAdvisors;
}

export function getAdvisorCapacity(empire: Empire): { current: number; max: number } {
  return {
    current: empire.advisors.length,
    max: SHOP.maxAdvisors,
  };
}

function applyEdictEffect(
  empire: Empire,
  edict: Edict,
  bots?: import('../types').BotEmpire[]
): void {
  const { type, value } = edict.effect;

  switch (type) {
    case 'gold':
      empire.resources.gold += value;
      break;

    case 'food':
      empire.resources.food += value;
      break;

    case 'runes':
      empire.resources.runes += value;
      break;

    case 'land':
      empire.resources.land += value;
      empire.resources.freeland += value;
      break;

    case 'health':
      empire.health = Math.min(100, value);
      break;

    case 'conscript': {
      const conscripted = Math.floor(empire.peasants * value);
      empire.peasants -= conscripted;
      empire.troops.trparm += conscripted;
      break;
    }

    case 'troops':
      empire.troops.trparm += value;
      empire.troops.trplnd += value;
      empire.troops.trpfly += value;
      empire.troops.trpsea += value;
      break;

    case 'steal_gold':
      if (bots && bots.length > 0) {
        // Find richest bot
        const richest = bots.reduce((a, b) =>
          a.resources.gold > b.resources.gold ? a : b
        );
        const stolen = Math.floor(richest.resources.gold * value);
        richest.resources.gold -= stolen;
        empire.resources.gold += stolen;
      }
      break;

    case 'advance_era': {
      const eraOrder = ['past', 'present', 'future'] as const;
      const currentIndex = eraOrder.indexOf(empire.era);
      if (currentIndex < eraOrder.length - 1) {
        empire.era = eraOrder[currentIndex + 1];
      }
      break;
    }
  }
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

  // Sum all bonuses up to current level (since bonuses vary per level)
  let totalBonus = 0;
  for (let i = 1; i <= level; i++) {
    const tech = TECHS.find((t) => t.action === action && t.level === i);
    if (tech) {
      totalBonus += tech.bonus;
    }
  }
  return totalBonus / 100;
}
