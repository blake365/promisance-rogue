import { clsx } from 'clsx';
import type { SpellType, Era } from '@/types';
import { formatNumber } from '@/utils/format';

interface SpellInfo {
  type: SpellType;
  name: string;
  icon: string;
  description: string;
  runeCost: number;
  category: 'self' | 'offensive';
}

const SPELLS: SpellInfo[] = [
  // Self spells
  { type: 'shield', name: 'Magic Shield', icon: '🛡️', description: 'Block damage for 1 round', runeCost: 500, category: 'self' },
  { type: 'food', name: 'Cornucopia', icon: '🌾', description: 'Conjure food', runeCost: 200, category: 'self' },
  { type: 'cash', name: "Midas' Touch", icon: '💰', description: 'Conjure gold', runeCost: 250, category: 'self' },
  { type: 'runes', name: 'Arcane Well', icon: '✨', description: 'Conjure runes', runeCost: 100, category: 'self' },
  { type: 'gate', name: 'Time Gate', icon: '🌀', description: 'Attack any era this round', runeCost: 1000, category: 'self' },
  { type: 'advance', name: 'Time Warp', icon: '⏩', description: 'Advance to next era', runeCost: 2000, category: 'self' },
  { type: 'regress', name: 'Regression', icon: '⏪', description: 'Return to previous era', runeCost: 1500, category: 'self' },
  // Offensive spells
  { type: 'spy', name: 'Spy', icon: '👁️', description: 'Reveal enemy stats', runeCost: 100, category: 'offensive' },
  { type: 'blast', name: 'Fireball', icon: '🔥', description: 'Destroy enemy troops', runeCost: 250, category: 'offensive' },
  { type: 'storm', name: 'Lightning Storm', icon: '⚡', description: 'Destroy food & gold', runeCost: 500, category: 'offensive' },
  { type: 'struct', name: 'Earthquake', icon: '🏚️', description: 'Destroy buildings', runeCost: 1200, category: 'offensive' },
  { type: 'steal', name: 'Gold Theft', icon: '💎', description: 'Steal enemy gold', runeCost: 1800, category: 'offensive' },
  { type: 'fight', name: 'Magical Assault', icon: '⚔️', description: 'Take land magically', runeCost: 1500, category: 'offensive' },
];

const SELF_SPELLS = SPELLS.filter((s) => s.category === 'self');
const OFFENSIVE_SPELLS = SPELLS.filter((s) => s.category === 'offensive');

interface SpellListProps {
  runes: number;
  wizards: number;
  era: Era;
  eraChangedRound: number;
  currentRound: number;
  mode: 'self' | 'offensive';
  onSelect: (spell: SpellType) => void;
  onCancel: () => void;
}

export function SpellList({
  runes,
  wizards,
  era,
  eraChangedRound,
  currentRound,
  mode,
  onSelect,
  onCancel,
}: SpellListProps) {
  const canChangeEra = currentRound > eraChangedRound;

  const checkSpell = (spell: SpellInfo): { canCast: boolean; reason?: string } => {
    if (wizards <= 0) return { canCast: false, reason: 'No wizards' };
    if (runes < spell.runeCost) return { canCast: false, reason: 'Need more runes' };

    if (spell.type === 'advance') {
      if (era === 'future') return { canCast: false, reason: 'Already in Future' };
      if (!canChangeEra) return { canCast: false, reason: 'On cooldown' };
    }
    if (spell.type === 'regress') {
      if (era === 'past') return { canCast: false, reason: 'Already in Past' };
      if (!canChangeEra) return { canCast: false, reason: 'On cooldown' };
    }

    return { canCast: true };
  };

  const spells = mode === 'self' ? SELF_SPELLS : OFFENSIVE_SPELLS;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="font-display text-lg text-runes">
          {mode === 'self' ? '✨ Self Spells' : '⚔️ Offensive Spells'}
        </h2>
        <div className="text-right text-sm">
          <div className="text-gray-400">
            <span className="text-runes">{formatNumber(runes)}</span> runes
          </div>
          <div className="text-gray-400">
            <span className="text-cyan-400">{formatNumber(wizards)}</span> wizards
          </div>
        </div>
      </div>

      {wizards === 0 && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
          ⚠️ You need wizards to cast spells! Build Wizard Towers to train wizards.
        </div>
      )}

      {/* Spell Grid */}
      <div className="space-y-2">
        {spells.map((spell) => {
          const { canCast, reason } = checkSpell(spell);

          return (
            <button
              key={spell.type}
              onClick={() => canCast && onSelect(spell.type)}
              disabled={!canCast}
              className={clsx(
                'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                canCast
                  ? 'bg-game-card border-game-border hover:border-runes active:scale-[0.98]'
                  : 'bg-game-dark/50 border-game-border/50 opacity-60 cursor-not-allowed'
              )}
            >
              <span className="text-2xl">{spell.icon}</span>

              <div className="flex-1">
                <div className={clsx('font-display', canCast ? 'text-white' : 'text-gray-500')}>
                  {spell.name}
                </div>
                <div className="text-xs text-gray-500">{spell.description}</div>
              </div>

              <div className="text-right">
                <div className={clsx('font-stats', canCast ? 'text-runes' : 'text-gray-500')}>
                  {formatNumber(spell.runeCost)}
                </div>
                {!canCast && reason && (
                  <div className="text-xs text-red-400">{reason}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {mode === 'self' && (
        <p className="text-xs text-gray-500 text-center">
          Self spells buff your empire. Costs 2 turns to cast.
        </p>
      )}

      {mode === 'offensive' && (
        <p className="text-xs text-gray-500 text-center">
          Offensive spells target enemies. Select a spell, then choose a target. Costs 2 turns and 5 health.
        </p>
      )}

      <button onClick={onCancel} className="btn-secondary btn-lg w-full">
        Cancel
      </button>
    </div>
  );
}

// Attack type selector (for military attacks)
interface AttackTypeSelectorProps {
  onSelect: (attackType: 'standard' | 'trparm' | 'trplnd' | 'trpfly' | 'trpsea') => void;
  onSpell: () => void;
  onCancel: () => void;
}

export function AttackTypeSelector({ onSelect, onSpell, onCancel }: AttackTypeSelectorProps) {
  const attackTypes = [
    { type: 'standard', name: 'Standard Attack', icon: '⚔️', description: 'All units (+15% land bonus)', extra: '-6 health' },
    { type: 'trparm', name: 'Infantry Only', icon: '🗡️', description: 'Infantry units only', extra: '-5 health' },
    { type: 'trplnd', name: 'Cavalry Only', icon: '🐎', description: 'Cavalry units only', extra: '-5 health' },
    { type: 'trpfly', name: 'Air Only', icon: '✈️', description: 'Aircraft units only', extra: '-5 health' },
    { type: 'trpsea', name: 'Naval Only', icon: '🚢', description: 'Naval units only', extra: '-5 health' },
  ] as const;

  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg text-red-400">⚔️ Choose Attack Type</h2>

      <div className="space-y-2">
        {attackTypes.map((attack) => (
          <button
            key={attack.type}
            onClick={() => onSelect(attack.type)}
            className="w-full flex items-center gap-3 p-3 rounded-lg border bg-game-card border-game-border hover:border-red-400 active:scale-[0.98] transition-all text-left"
          >
            <span className="text-2xl">{attack.icon}</span>
            <div className="flex-1">
              <div className="font-display text-white">{attack.name}</div>
              <div className="text-xs text-gray-500">{attack.description}</div>
            </div>
            <span className="text-xs text-red-400">{attack.extra}</span>
          </button>
        ))}
      </div>

      <div className="border-t border-game-border pt-3">
        <button
          onClick={onSpell}
          className="w-full flex items-center gap-3 p-3 rounded-lg border bg-game-card border-runes/50 hover:border-runes active:scale-[0.98] transition-all text-left"
        >
          <span className="text-2xl">✨</span>
          <div className="flex-1">
            <div className="font-display text-runes">Offensive Spell</div>
            <div className="text-xs text-gray-500">Cast magic against enemy</div>
          </div>
        </button>
      </div>

      <button onClick={onCancel} className="btn-secondary btn-lg w-full">
        Cancel
      </button>
    </div>
  );
}
