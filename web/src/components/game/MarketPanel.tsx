import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import type { Empire, MarketPrices, EffectiveTroopPrices, ShopStock, Troops, GamePhase, ShopTransaction } from '@/types';
import { formatNumber } from '@/utils/format';
import { NumberInput } from '@/components/ui';

interface MarketItem {
  key: string;
  type: 'food' | keyof Troops;
  name: string;
  icon: string;
}

const MARKET_ITEMS: MarketItem[] = [
  { key: 'food', type: 'food', name: 'Food', icon: '🌾' },
  { key: 'trparm', type: 'trparm', name: 'Infantry', icon: '🗡️' },
  { key: 'trplnd', type: 'trplnd', name: 'Cavalry', icon: '🐎' },
  { key: 'trpfly', type: 'trpfly', name: 'Aircraft', icon: '✈️' },
  { key: 'trpsea', type: 'trpsea', name: 'Navy', icon: '🚢' },
];

interface MarketPanelProps {
  empire: Empire;
  phase: GamePhase;
  marketPrices: MarketPrices | null;
  effectivePrices: EffectiveTroopPrices | null;
  shopStock: ShopStock | null;
  onTransaction: (transaction: ShopTransaction) => Promise<boolean>;
  onClose: () => void;
  embedded?: boolean;
}

export function MarketPanel({
  empire,
  phase,
  marketPrices,
  effectivePrices,
  shopStock,
  onTransaction,
  onClose,
  embedded = false,
}: MarketPanelProps) {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [selectedItem, setSelectedItem] = useState<MarketItem>(MARKET_ITEMS[0]);
  const [amount, setAmount] = useState(0);
  const [processing, setProcessing] = useState(false);

  const isShopPhase = phase === 'shop';

  // Use effective prices from server (includes race/building modifiers)
  const prices = useMemo(() => {
    if (effectivePrices && marketPrices) {
      return {
        food: { buy: marketPrices.foodBuyPrice, sell: marketPrices.foodSellPrice },
        trparm: effectivePrices.trparm,
        trplnd: effectivePrices.trplnd,
        trpfly: effectivePrices.trpfly,
        trpsea: effectivePrices.trpsea,
      };
    }
    // Fallback prices if server didn't provide effective prices
    return {
      food: { buy: 30, sell: 6 },
      trparm: { buy: 500, sell: 160 },
      trplnd: { buy: 1000, sell: 340 },
      trpfly: { buy: 2000, sell: 720 },
      trpsea: { buy: 3000, sell: 1140 },
    };
  }, [effectivePrices, marketPrices]);

  const getOwned = (type: string): number => {
    if (type === 'food') return empire.resources.food;
    return empire.troops[type as keyof Troops] || 0;
  };

  const getStock = (type: string): number | null => {
    if (!isShopPhase || !shopStock) return null;
    return shopStock[type as keyof ShopStock] ?? 0;
  };

  const currentPrice = prices[selectedItem.type as keyof typeof prices];
  const price = mode === 'buy' ? currentPrice.buy : currentPrice.sell;
  const owned = getOwned(selectedItem.type);
  const stock = getStock(selectedItem.type);

  // Max buyable (limited by gold and stock in shop phase)
  const maxBuyable = useMemo(() => {
    const goldLimit = Math.floor(empire.resources.gold / currentPrice.buy);
    if (stock !== null) return Math.min(goldLimit, stock);
    return goldLimit;
  }, [empire.resources.gold, currentPrice.buy, stock]);

  // Max sellable (50% limit for troops in shop phase)
  const maxSellable = useMemo(() => {
    if (isShopPhase && selectedItem.type !== 'food') {
      return Math.floor(owned * 0.5);
    }
    return owned;
  }, [isShopPhase, selectedItem.type, owned]);

  const maxAmount = mode === 'buy' ? maxBuyable : maxSellable;
  const totalCost = amount * price;

  const handleTransaction = async () => {
    if (amount <= 0 || processing) return;

    setProcessing(true);
    const transaction: ShopTransaction = {
      type: mode,
      resource: selectedItem.type === 'food' ? 'food' : 'troops',
      amount,
      troopType: selectedItem.type !== 'food' ? (selectedItem.type as keyof Troops) : undefined,
    };

    await onTransaction(transaction);
    setAmount(0);
    setProcessing(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className={clsx('font-display text-lg', isShopPhase ? 'text-green-400' : 'text-gold')}>
          {isShopPhase ? '🏪 Shop Market' : '💰 Private Market'}
        </h2>
        <div className="text-right">
          <div className="text-label">Gold</div>
          <div className="font-stats text-gold">{formatNumber(empire.resources.gold)}</div>
        </div>
      </div>

      {isShopPhase && (
        <p className="text-sm text-green-400 bg-green-400/10 px-3 py-2 rounded">
          Better prices during shop phase!
        </p>
      )}

      {/* Mode Toggle */}
      <div className="flex rounded-lg overflow-hidden border border-game-border">
        <button
          onClick={() => {
            setMode('buy');
            setAmount(0);
          }}
          className={clsx(
            'flex-1 py-2 font-display uppercase tracking-wider text-sm',
            mode === 'buy' ? 'bg-green-600 text-white' : 'bg-game-card text-gray-400'
          )}
        >
          Buy
        </button>
        <button
          onClick={() => {
            setMode('sell');
            setAmount(0);
          }}
          className={clsx(
            'flex-1 py-2 font-display uppercase tracking-wider text-sm',
            mode === 'sell' ? 'bg-red-600 text-white' : 'bg-game-card text-gray-400'
          )}
        >
          Sell
        </button>
      </div>

      {/* Item Selection */}
      <div className="grid grid-cols-5 gap-2">
        {MARKET_ITEMS.map((item) => {
          const itemOwned = getOwned(item.type);
          const itemStock = getStock(item.type);
          const isSelected = selectedItem.key === item.key;

          return (
            <button
              key={item.key}
              onClick={() => {
                setSelectedItem(item);
                setAmount(0);
              }}
              className={clsx(
                'flex flex-col items-center p-2 rounded-lg border transition-all',
                isSelected
                  ? 'bg-game-card border-cyan-400 shadow-blue-glow'
                  : 'bg-game-dark border-game-border hover:border-gray-500'
              )}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm mt-1">{item.name}</span>
              <span className="text-xs text-text-muted">{formatNumber(itemOwned)}</span>
              {isShopPhase && mode === 'buy' && itemStock !== null && (
                <span className={clsx('text-xs', itemStock > 0 ? 'text-cyan-400' : 'text-red-400')}>
                  Stock: {formatNumber(itemStock)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Price Info */}
      <div className="bg-game-card rounded-lg p-3 border border-game-border">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Buy Price:</span>
          <span className="text-green-400">{formatNumber(currentPrice.buy)} gold</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Sell Price:</span>
          <span className="text-red-400">{formatNumber(currentPrice.sell)} gold</span>
        </div>
        {isShopPhase && mode === 'sell' && selectedItem.type !== 'food' && (
          <p className="text-sm text-text-muted mt-2">Sell limit: 50% of owned troops</p>
        )}
      </div>

      {/* Amount Selection */}
      <NumberInput
        value={amount}
        onChange={setAmount}
        min={0}
        max={maxAmount}
        steps={[1, 10, 100]}
        presets={['zero', 'quarter', 'half', 'max']}
        showMax={true}
        label="Amount"
      />

      {/* Transaction Summary */}
      <div className="bg-game-dark rounded-lg p-3 border border-game-border">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">
            {mode === 'buy' ? 'Total Cost:' : 'Total Revenue:'}
          </span>
          <span className={clsx('font-stats text-lg', mode === 'buy' ? 'text-red-400' : 'text-green-400')}>
            {mode === 'buy' ? '-' : '+'}
            {formatNumber(totalCost)} gold
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!embedded && (
          <button onClick={onClose} className="btn-secondary btn-lg flex-1">
            Close
          </button>
        )}
        <button
          onClick={handleTransaction}
          disabled={amount === 0 || processing}
          className={clsx('btn-lg', embedded ? 'w-full' : 'flex-1', mode === 'buy' ? 'btn-primary' : 'btn-gold')}
        >
          {processing ? 'Processing...' : mode === 'buy' ? 'Buy' : 'Sell'}
        </button>
      </div>
    </div>
  );
}
