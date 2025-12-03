import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Empire, ShopTransaction, Troops, MarketPrices, GamePhase, ShopStock } from '../api/client.js';

// QMT Private Market base prices (player phase - worse prices)
const PLAYER_PRICES = {
  food: { buy: 30, sell: 6 },           // sell = 30 * 0.20
  trparm: { buy: 500, sell: 160 },      // sell = 500 * 0.32
  trplnd: { buy: 1000, sell: 340 },     // sell = 1000 * 0.34
  trpfly: { buy: 2000, sell: 720 },     // sell = 2000 * 0.36
  trpsea: { buy: 3000, sell: 1140 },    // sell = 3000 * 0.38
};

// Base troop costs for calculating shop prices
const TROOP_BASE_COSTS = {
  trparm: 500,
  trplnd: 1000,
  trpfly: 2000,
  trpsea: 3000,
};

interface MarketItem {
  key: string;
  type: 'food' | keyof Troops;
  name: string;
  shortKey: string;
}

const MARKET_ITEMS: MarketItem[] = [
  { key: 'food', type: 'food', name: 'Food', shortKey: 'f' },
  { key: 'trparm', type: 'trparm', name: 'Infantry', shortKey: '1' },
  { key: 'trplnd', type: 'trplnd', name: 'Vehicles', shortKey: '2' },
  { key: 'trpfly', type: 'trpfly', name: 'Aircraft', shortKey: '3' },
  { key: 'trpsea', type: 'trpsea', name: 'Navy', shortKey: '4' },
];

type Mode = 'buy' | 'sell';

interface Props {
  empire: Empire;
  phase: GamePhase;
  marketPrices: MarketPrices | null;
  shopStock: ShopStock | null;
  onTransaction: (transaction: ShopTransaction) => Promise<boolean>;
  onClose: () => void;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// Sell limit for troops during shop phase (50%)
const TROOP_SELL_LIMIT = 0.5;

export function MarketView({ empire, phase, marketPrices, shopStock, onTransaction, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('buy');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [amount, setAmount] = useState(0);
  const [processing, setProcessing] = useState(false);

  // Calculate prices based on phase
  const prices = useMemo(() => {
    if (phase === 'shop' && marketPrices) {
      // Shop phase - use server prices (better deals)
      return {
        food: {
          buy: marketPrices.foodBuyPrice,
          sell: marketPrices.foodSellPrice,
        },
        trparm: {
          buy: Math.floor(TROOP_BASE_COSTS.trparm * marketPrices.troopBuyMultiplier),
          sell: Math.floor(TROOP_BASE_COSTS.trparm * marketPrices.troopSellMultiplier),
        },
        trplnd: {
          buy: Math.floor(TROOP_BASE_COSTS.trplnd * marketPrices.troopBuyMultiplier),
          sell: Math.floor(TROOP_BASE_COSTS.trplnd * marketPrices.troopSellMultiplier),
        },
        trpfly: {
          buy: Math.floor(TROOP_BASE_COSTS.trpfly * marketPrices.troopBuyMultiplier),
          sell: Math.floor(TROOP_BASE_COSTS.trpfly * marketPrices.troopSellMultiplier),
        },
        trpsea: {
          buy: Math.floor(TROOP_BASE_COSTS.trpsea * marketPrices.troopBuyMultiplier),
          sell: Math.floor(TROOP_BASE_COSTS.trpsea * marketPrices.troopSellMultiplier),
        },
      };
    }
    // Player phase - use QMT base prices (worse deals)
    return PLAYER_PRICES;
  }, [phase, marketPrices]);

  const isShopPhase = phase === 'shop';
  const currentItem = MARKET_ITEMS[selectedIndex];
  const price = mode === 'buy'
    ? prices[currentItem.type as keyof typeof prices].buy
    : prices[currentItem.type as keyof typeof prices].sell;

  // Calculate owned amount
  const getOwned = (type: string): number => {
    if (type === 'food') return empire.resources.food;
    return empire.troops[type as keyof Troops] || 0;
  };

  // Get stock available for buying (shop phase only)
  const getStock = (type: string): number | null => {
    if (!isShopPhase || !shopStock) return null;
    return shopStock[type as keyof ShopStock] || 0;
  };

  // Calculate max buyable (limited by gold and stock in shop phase)
  const getMaxBuyable = (type: string): number => {
    const itemPrice = prices[type as keyof typeof prices].buy;
    const goldLimit = Math.floor(empire.resources.gold / itemPrice);
    const stock = getStock(type);
    if (stock !== null) {
      return Math.min(goldLimit, stock);
    }
    return goldLimit;
  };

  // Calculate max sellable (limited to 50% for troops in shop phase, unlimited for food)
  const getMaxSellable = (type: string): number => {
    const owned = getOwned(type);
    if (isShopPhase && type !== 'food') {
      // Troops: 50% limit in shop phase
      return Math.floor(owned * TROOP_SELL_LIMIT);
    }
    // Food: unlimited, or player phase: unlimited
    return owned;
  };

  const maxBuyable = getMaxBuyable(currentItem.type);
  const maxSellable = getMaxSellable(currentItem.type);

  const maxAmount = mode === 'buy' ? maxBuyable : maxSellable;
  const totalCost = amount * price;
  const currentStock = getStock(currentItem.type);

  useInput(async (input, key) => {
    if (processing) return;

    if (key.escape) {
      if (amount > 0) {
        setAmount(0);
      } else {
        onClose();
      }
      return;
    }

    // Mode toggle
    if (key.tab) {
      setMode((m) => (m === 'buy' ? 'sell' : 'buy'));
      setAmount(0);
      return;
    }

    // Navigation
    if (key.upArrow || input === 'k') {
      setSelectedIndex((i) => (i > 0 ? i - 1 : MARKET_ITEMS.length - 1));
      setAmount(0);
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex((i) => (i < MARKET_ITEMS.length - 1 ? i + 1 : 0));
      setAmount(0);
    }

    // Amount adjustment
    if (key.rightArrow || input === '+' || input === '=') {
      setAmount((a) => Math.min(a + 1, maxAmount));
    } else if (key.leftArrow || input === '-') {
      setAmount((a) => Math.max(a - 1, 0));
    } else if (input === ']') {
      setAmount((a) => Math.min(a + 10, maxAmount));
    } else if (input === '[') {
      setAmount((a) => Math.max(a - 10, 0));
    } else if (input === '}') {
      setAmount((a) => Math.min(a + 100, maxAmount));
    } else if (input === '{') {
      setAmount((a) => Math.max(a - 100, 0));
    } else if (input === 'a') {
      setAmount(maxAmount);
    } else if (input === 'z') {
      setAmount(0);
    }

    // Quick select by shortkey
    const itemIndex = MARKET_ITEMS.findIndex((item) => item.shortKey === input);
    if (itemIndex >= 0) {
      setSelectedIndex(itemIndex);
      setAmount(0);
    }

    // Execute transaction
    if (key.return && amount > 0) {
      setProcessing(true);
      const transaction: ShopTransaction = {
        type: mode,
        resource: currentItem.type === 'food' ? 'food' : 'troops',
        amount,
        troopType: currentItem.type !== 'food' ? currentItem.type as keyof Troops : undefined,
      };
      await onTransaction(transaction);
      setAmount(0);
      setProcessing(false);
    }
  });

  const getItemPrice = (itemType: string, buyMode: boolean) => {
    const p = prices[itemType as keyof typeof prices];
    return buyMode ? p.buy : p.sell;
  };

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={isShopPhase ? 'green' : 'yellow'} paddingX={1}>
      <Box justifyContent="space-between">
        <Box>
          <Text bold color={isShopPhase ? 'green' : 'yellow'}>
            {isShopPhase ? 'Shop Market' : 'Private Market'}
          </Text>
          {isShopPhase && (
            <Text color="green"> (Better Prices!)</Text>
          )}
        </Box>
        <Text color="gray">
          Gold: <Text color="yellow">{formatNumber(empire.resources.gold)}</Text>
        </Text>
      </Box>

      {/* Mode toggle */}
      <Box marginTop={1} gap={2}>
        <Text color={mode === 'buy' ? 'green' : 'gray'} bold={mode === 'buy'}>
          {mode === 'buy' ? '>' : ' '} [Tab] BUY
        </Text>
        <Text color={mode === 'sell' ? 'red' : 'gray'} bold={mode === 'sell'}>
          {mode === 'sell' ? '>' : ' '} SELL
        </Text>
      </Box>

      {/* Items list */}
      <Box flexDirection="column" marginTop={1}>
        <Box>
          <Text color="gray">{'    '}Item       </Text>
          <Text color="gray">Owned      </Text>
          <Text color="gray">{mode === 'buy' ? 'Buy $  ' : 'Sell $ '}</Text>
          {isShopPhase && mode === 'buy' && <Text color="gray">Stock    </Text>}
          {isShopPhase && mode === 'sell' && <Text color="gray">Limit    </Text>}
          <Text color="gray">Max     </Text>
        </Box>
        {MARKET_ITEMS.map((item, index) => {
          const isSelected = index === selectedIndex;
          const owned = getOwned(item.type);
          const itemPrice = getItemPrice(item.type, mode === 'buy');
          const stock = getStock(item.type);
          const itemMaxBuy = getMaxBuyable(item.type);
          const itemMaxSell = getMaxSellable(item.type);
          const itemMax = mode === 'buy' ? itemMaxBuy : itemMaxSell;

          return (
            <Box key={item.key}>
              <Text color={isSelected ? 'cyan' : 'gray'}>{isSelected ? '> ' : '  '}</Text>
              <Text color="yellow">[{item.shortKey}]</Text>
              <Text color={isSelected ? 'cyan' : 'white'}> {item.name.padEnd(10)}</Text>
              <Text color="gray">{formatNumber(owned).padStart(8)}  </Text>
              <Text color={mode === 'buy' ? 'green' : 'red'}>{formatNumber(itemPrice).padStart(6)} </Text>
              {isShopPhase && mode === 'buy' && (
                <Text color={stock !== null && stock > 0 ? 'cyan' : 'red'}>
                  {stock !== null ? formatNumber(stock).padStart(7) : '     --'}{' '}
                </Text>
              )}
              {isShopPhase && mode === 'sell' && (
                <Text color="gray">
                  {item.type === 'food' ? '    all ' : '    50% '}
                </Text>
              )}
              <Text color="gray">{formatNumber(itemMax).padStart(8)}</Text>
            </Box>
          );
        })}
      </Box>

      {/* Transaction input */}
      <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
        <Box>
          <Text>
            {mode === 'buy' ? 'Buy' : 'Sell'} <Text color="cyan">{currentItem.name}</Text>:
          </Text>
          <Text bold color="cyan"> {formatNumber(amount)}</Text>
          <Text color="gray"> / {formatNumber(maxAmount)}</Text>
        </Box>
        <Box>
          <Text>Total {mode === 'buy' ? 'cost' : 'revenue'}: </Text>
          <Text color={mode === 'buy' ? 'red' : 'green'}>
            {mode === 'buy' ? '-' : '+'}{formatNumber(totalCost)}
          </Text>
          <Text color="yellow"> gold</Text>
        </Box>
        {isShopPhase && mode === 'buy' && currentStock !== null && (
          <Box>
            <Text color="gray">Stock available: </Text>
            <Text color={currentStock > 0 ? 'cyan' : 'red'}>{formatNumber(currentStock)}</Text>
          </Box>
        )}
        {isShopPhase && mode === 'sell' && currentItem.type !== 'food' && (
          <Box>
            <Text color="gray">Sell limit: 50% of owned troops</Text>
          </Box>
        )}
      </Box>

      {/* Controls */}
      <Box marginTop={1} flexDirection="column">
        <Text color="gray">[↑↓/jk] select • [←→] ±1 • [[ ]] ±10 • {'{ }'} ±100</Text>
        <Text color="gray">[a]ll • [z]ero • [Tab] buy/sell • [Enter] confirm</Text>
        <Text color="gray">[Esc] {amount > 0 ? 'clear' : 'close'}</Text>
      </Box>

      {processing && (
        <Box marginTop={1}>
          <Text color="yellow">Processing transaction...</Text>
        </Box>
      )}
    </Box>
  );
}
