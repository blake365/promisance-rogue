import { clsx } from 'clsx';
import type { SpellType, Era, SpellCosts } from '@/types';
import { formatNumber } from '@/utils/format';

interface SpellInfo {
  type: SpellType;
  name: string;
  icon: string;
  description: string;
  costMultiplier: number;
  category: 'self' | 'offensive';
}

// Cost multipliers from server constants.ts
const SPELLS: SpellInfo[] = [
  // Self spells
  { type: 'shield', name: 'Magic Shield', icon: '🛡️', description: 'Block damage for 1 round', costMultiplier: 4.9, category: 'self' },
  { type: 'food', name: 'Cornucopia', icon: '🌾', description: 'Conjure food', costMultiplier: 17, category: 'self' },
  { type: 'cash', name: "Midas' Touch", icon: '💰', description: 'Conjure gold', costMultiplier: 15, category: 'self' },
  { type: 'runes', name: 'Arcane Well', icon: '✨', description: 'Conjure runes', costMultiplier: 12, category: 'self' },
  { type: 'gate', name: 'Time Gate', icon: '🌀', description: 'Attack any era this round', costMultiplier: 20, category: 'self' },
  { type: 'advance', name: 'Time Warp', icon: '⏩', description: 'Advance to next era', costMultiplier: 47.5, category: 'self' },
  { type: 'regress', name: 'Regression', icon: '⏪', description: 'Return to previous era', costMultiplier: 20, category: 'self' },
  // Offensive spells
  { type: 'spy', name: 'Spy', icon: '👁️', description: 'Reveal enemy stats', costMultiplier: 1.0, category: 'offensive' },
  { type: 'blast', name: 'Fireball', icon: '🔥', description: 'Destroy enemy troops', costMultiplier: 2.5, category: 'offensive' },
  { type: 'storm', name: 'Lightning Storm', icon: '⚡', description: 'Destroy food & gold', costMultiplier: 7.25, category: 'offensive' },
  { type: 'struct', name: 'Earthquake', icon: '🏚️', description: 'Destroy buildings', costMultiplier: 18.0, category: 'offensive' },
  { type: 'steal', name: 'Gold Theft', icon: '💎', description: 'Steal enemy gold', costMultiplier: 25.75, category: 'offensive' },
  { type: 'fight', name: 'Magical Assault', icon: '⚔️', description: 'Take land magically', costMultiplier: 22.5, category: 'offensive' },
];

const SELF_SPELLS = SPELLS.filter((s) => s.category === 'self');
const OFFENSIVE_SPELLS = SPELLS.filter((s) => s.category === 'offensive');

interface SpellListProps {
  runes: number;
  wizards: number;
  era: Era;
  eraChangedRound: number;
  currentRound: number;
  health: number;
  spellCosts?: SpellCosts;
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
  health,
  spellCosts,
  mode,
  onSelect,
  onCancel,
}: SpellListProps) {
  const canChangeEra = currentRound > eraChangedRound;
  const MIN_HEALTH_TO_ACT = 20; // Must match server constant

  const getSpellCost = (spell: SpellInfo): number => {
    // Use server-provided costs if available, otherwise return 0 (shouldn't happen)
    if (spellCosts) {
      return spellCosts[spell.type] ?? 0;
    }
    return 0;
  };

  const checkSpell = (spell: SpellInfo): { canCast: boolean; reason?: string } => {
    if (health < MIN_HEALTH_TO_ACT) return { canCast: false, reason: 'Health too low' };
    if (wizards <= 0) return { canCast: false, reason: 'No wizards' };
    const cost = getSpellCost(spell);
    if (runes < cost) return { canCast: false, reason: 'Need more runes' };

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

      {health < MIN_HEALTH_TO_ACT && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
          ⚠️ Health too low to cast spells! Need at least {MIN_HEALTH_TO_ACT} health.
        </div>
      )}

      {wizards === 0 && health >= MIN_HEALTH_TO_ACT && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
          ⚠️ You need wizards to cast spells! Build Wizard Towers to train wizards.
        </div>
      )}

      {/* Spell Grid */}
      <div className="space-y-2">
        {spells.map((spell) => {
          const { canCast, reason } = checkSpell(spell);
          const cost = getSpellCost(spell);

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
                  {formatNumber(cost)}
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
  attacksRemaining: number;
  maxAttacks: number;
  onSelect: (attackType: 'standard' | 'trparm' | 'trplnd' | 'trpfly' | 'trpsea') => void;
  onSpell: () => void;
  onCancel: () => void;
}

export function AttackTypeSelector({ attacksRemaining, maxAttacks, onSelect, onSpell, onCancel }: AttackTypeSelectorProps) {
  const attackTypes = [
    { type: 'standard', name: 'Standard Attack', icon: '⚔️', description: 'All units (+15% land bonus)', extra: '-6 health' },
    { type: 'trparm', name: 'Infantry Only', icon: '🗡️', description: 'Infantry units only', extra: '-5 health' },
    { type: 'trplnd', name: 'Cavalry Only', icon: '🐎', description: 'Cavalry units only', extra: '-5 health' },
    { type: 'trpfly', name: 'Air Only', icon: '✈️', description: 'Aircraft units only', extra: '-5 health' },
    { type: 'trpsea', name: 'Naval Only', icon: '🚢', description: 'Naval units only', extra: '-5 health' },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-red-400">⚔️ Choose Attack Type</h2>
        <span className="text-sm text-gray-400">
          <span className="font-stats text-white">{attacksRemaining}</span>/{maxAttacks} attacks left
        </span>
      </div>

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
