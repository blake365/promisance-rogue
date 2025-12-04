import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';
import { Panel } from '@/components/ui';
import {
  EmpireStatus,
  ActionGrid,
  ActionBar,
  TurnSlider,
  BuildingPanel,
  MarketPanel,
  BankPanel,
  EnemyList,
  SpellList,
  AttackTypeSelector,
  DraftCarousel,
  ActionResult,
  NewsLog,
  GameSummary,
  AdvisorPanel,
} from '@/components/game';
import { formatNumber } from '@/utils/format';
import type { TurnAction, SpellType, AttackType, Buildings, IndustryAllocation } from '@/types';

function TaxRateEditor({ value, onChange }: { value: number; onChange: (rate: number) => void }) {
  const taxEffect = value <= 20 ? 'Population grows faster'
    : value <= 40 ? 'Normal population growth'
    : value <= 60 ? 'Population grows slower'
    : 'Population is leaving!';

  const taxColor = value <= 20 ? 'text-green-400'
    : value <= 40 ? 'text-yellow-400'
    : 'text-red-400';

  const presets = [
    { label: 'Low', value: 20, color: 'text-green-400' },
    { label: 'Med', value: 40, color: 'text-yellow-400' },
    { label: 'High', value: 60, color: 'text-orange-400' },
    { label: 'Max', value: 80, color: 'text-red-400' },
  ];

  return (
    <div className="space-y-3">
      {/* Tax Rate Slider */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">Tax Rate:</span>
          <span className="font-stats text-gold text-xl">{value}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-game-dark border border-game-border
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-yellow-300"
        />
      </div>

      {/* Presets */}
      <div className="flex gap-2">
        {presets.map((preset) => (
          <button
            key={preset.value}
            onClick={() => onChange(preset.value)}
            className={`flex-1 py-1 px-2 rounded text-sm border ${
              value === preset.value
                ? 'border-gold bg-gold/20 text-gold'
                : 'border-game-border bg-game-card text-gray-400 hover:border-gray-500'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Effects */}
      <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-game-border">
        <div className="flex justify-between">
          <span className="text-gray-500">Income:</span>
          <span className="font-stats text-green-400">{value}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Effect:</span>
          <span className={`${taxColor}`}>{value <= 40 ? '👍' : value <= 60 ? '👎' : '💀'}</span>
        </div>
      </div>
      <div className={`text-xs ${taxColor} text-center`}>{taxEffect}</div>
    </div>
  );
}

function IndustryAllocationEditor({
  value,
  onChange,
  troops
}: {
  value: IndustryAllocation;
  onChange: (allocation: IndustryAllocation) => void;
  troops: { trparm: number; trplnd: number; trpfly: number; trpsea: number };
}) {
  const total = value.trparm + value.trplnd + value.trpfly + value.trpsea;
  const isValid = total === 100;

  const troopTypes: Array<{ key: keyof IndustryAllocation; name: string }> = [
    { key: 'trparm', name: 'Infantry' },
    { key: 'trplnd', name: 'Cavalry' },
    { key: 'trpfly', name: 'Aircraft' },
    { key: 'trpsea', name: 'Navy' },
  ];

  const adjustValue = (key: keyof IndustryAllocation, delta: number) => {
    const newVal = Math.max(0, Math.min(100, value[key] + delta));
    onChange({ ...value, [key]: newVal });
  };

  const setEqual = () => {
    onChange({ trparm: 25, trplnd: 25, trpfly: 25, trpsea: 25 });
  };

  const fillRemainder = (key: keyof IndustryAllocation) => {
    const others = Object.entries(value)
      .filter(([k]) => k !== key)
      .reduce((sum, [, v]) => sum + v, 0);
    const remainder = Math.max(0, 100 - others);
    onChange({ ...value, [key]: remainder });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500 uppercase tracking-wider">Troop Allocation</span>
        <span className={`font-stats text-sm ${isValid ? 'text-green-400' : 'text-red-400'}`}>
          {total}% {!isValid && `(need ${100 - total > 0 ? '+' : ''}${100 - total}%)`}
        </span>
      </div>

      {/* Allocation Controls */}
      <div className="space-y-2">
        {troopTypes.map(({ key, name }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-gray-400 w-16 text-sm">{name}</span>
            <button
              onClick={() => adjustValue(key, -10)}
              className="w-8 h-8 rounded bg-game-card border border-game-border text-red-400 hover:bg-red-500/20"
            >
              -
            </button>
            <div className="flex-1 relative">
              <div className="h-6 bg-game-dark rounded border border-game-border overflow-hidden">
                <div
                  className="h-full bg-cyan-500/30 transition-all"
                  style={{ width: `${value[key]}%` }}
                />
              </div>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-stats text-white">
                {value[key]}%
              </span>
            </div>
            <button
              onClick={() => adjustValue(key, 10)}
              className="w-8 h-8 rounded bg-game-card border border-game-border text-green-400 hover:bg-green-500/20"
            >
              +
            </button>
            <button
              onClick={() => fillRemainder(key)}
              className="text-xs text-gray-500 hover:text-cyan-400 px-1"
              title="Fill remainder"
            >
              Fill
            </button>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <button
          onClick={setEqual}
          className="flex-1 py-1 px-2 rounded text-sm border border-game-border bg-game-card text-gray-400 hover:border-cyan-500 hover:text-cyan-400"
        >
          Equal (25% each)
        </button>
        <button
          onClick={() => onChange({ trparm: 100, trplnd: 0, trpfly: 0, trpsea: 0 })}
          className="flex-1 py-1 px-2 rounded text-sm border border-game-border bg-game-card text-gray-400 hover:border-cyan-500 hover:text-cyan-400"
        >
          All Infantry
        </button>
      </div>

      {/* Current Troops */}
      <div className="text-xs text-gray-500 pt-2 border-t border-game-border">
        Current: {formatNumber(troops.trparm)} Inf, {formatNumber(troops.trplnd)} Cav, {formatNumber(troops.trpfly)} Air, {formatNumber(troops.trpsea)} Sea
      </div>
    </div>
  );
}

type ViewMode =
  | 'main'
  | 'turns_input'
  | 'building'
  | 'market'
  | 'bank'
  | 'enemies'
  | 'spell_select'
  | 'offensive_spell_select'
  | 'attack_type'
  | 'target_select'
  | 'action_result'
  | 'overview'
  | 'advisors'
  | 'draft'
  | 'bot_phase'
  | 'game_over';

export function GamePage() {
  const navigate = useNavigate();
  const {
    game,
    bankInfo,
    loading,
    error,
    lastActionResult,
    lastActionType,
    lastBotPhaseResult,
    lastEdictResult,
    clearError,
    clearLastResult,
    clearEdictResult,
    checkActiveGame,
    executeAction,
    endPlayerPhase,
    selectDraft,
    rerollDraft,
    dismissAdvisor,
    endShopPhase,
    marketTransaction,
    fetchBankInfo,
    bankTransaction,
    executeBotPhase,
    resetGame,
  } = useGameStore();

  const [viewMode, setViewMode] = useState<ViewMode>('main');
  const [pendingAction, setPendingAction] = useState<TurnAction | null>(null);
  const [pendingSpell, setPendingSpell] = useState<SpellType | null>(null);
  const [pendingAttackType, setPendingAttackType] = useState<AttackType | null>(null);
  const [editedTaxRate, setEditedTaxRate] = useState<number | null>(null);
  const [editedIndustryAllocation, setEditedIndustryAllocation] = useState<IndustryAllocation | null>(null);

  // Check for active game on mount
  useEffect(() => {
    checkActiveGame();
  }, [checkActiveGame]);

  // Fetch bank info when game loads
  useEffect(() => {
    if (game.gameId) {
      fetchBankInfo();
    }
  }, [game.gameId, fetchBankInfo]);

  // Handle game phase changes
  useEffect(() => {
    // Check for game over first (covers isComplete, playerDefeated, or phase === 'complete')
    if (game.isComplete || game.playerDefeated || game.round?.phase === 'complete') {
      setViewMode('game_over');
    } else if (game.round?.phase === 'shop' && game.draftOptions) {
      setViewMode('draft');
    } else if (game.round?.phase === 'bot') {
      setViewMode('bot_phase');
    } else if (game.round?.phase === 'player') {
      // Don't transition to main if we're showing bot phase results
      // (phase is 'player' after bot phase completes, but we want to show news first)
      if (!lastBotPhaseResult) {
        setViewMode('main');
      }
    }
  }, [game.round?.phase, game.draftOptions, game.isComplete, game.playerDefeated, lastBotPhaseResult]);

  // Show action result when available
  useEffect(() => {
    if (lastActionResult) {
      setViewMode('action_result');
    }
  }, [lastActionResult]);

  // No active game - redirect to title
  if (!game.gameId || !game.playerEmpire || !game.round) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Panel className="max-w-sm w-full text-center">
          <p className="text-gray-400 mb-4">No active game found.</p>
          <button onClick={() => navigate('/')} className="btn-primary btn-lg w-full">
            Go to Menu
          </button>
        </Panel>
      </div>
    );
  }

  const { playerEmpire, round, botEmpires, intel, marketPrices, effectivePrices, shopStock, draftOptions, rerollInfo } = game;

  // Handle action selection
  const handleAction = (action: TurnAction | 'market' | 'bank' | 'overview' | 'enemies' | 'guide' | 'end_phase') => {
    clearError();

    if (action === 'market') {
      setViewMode('market');
    } else if (action === 'bank') {
      setViewMode('bank');
    } else if (action === 'overview') {
      setViewMode('overview');
    } else if (action === 'enemies') {
      setViewMode('enemies');
    } else if (action === 'guide') {
      navigate('/guide');
    } else if (action === 'end_phase') {
      handleEndPhase();
    } else if (action === 'build' || action === 'demolish') {
      setViewMode('building');
    } else if (action === 'attack') {
      setViewMode('attack_type');
    } else if (action === 'spell') {
      setViewMode('spell_select');
    } else {
      // Simple turn actions: explore, farm, cash, meditate, industry
      setPendingAction(action);
      // Initialize editable values for cash and industry
      if (action === 'cash') {
        setEditedTaxRate(playerEmpire.taxRate);
      } else if (action === 'industry') {
        setEditedIndustryAllocation({ ...playerEmpire.industryAllocation });
      }
      setViewMode('turns_input');
    }
  };

  // Execute turn action
  const handleExecuteAction = async (turns: number) => {
    if (!pendingAction) return;

    await executeAction({
      action: pendingAction,
      turns,
      taxRate: pendingAction === 'cash' ? editedTaxRate ?? undefined : undefined,
      industryAllocation: pendingAction === 'industry' ? editedIndustryAllocation ?? undefined : undefined,
    });

    setPendingAction(null);
    setEditedTaxRate(null);
    setEditedIndustryAllocation(null);
  };

  // Handle building
  const handleBuild = async (allocation: Partial<Buildings>) => {
    await executeAction({
      action: 'build',
      turns: 1,
      buildingAllocation: allocation,
    });
    // useEffect will switch to action_result view when lastActionResult is set
  };

  const handleDemolish = async (allocation: Partial<Buildings>) => {
    await executeAction({
      action: 'demolish',
      turns: 1,
      demolishAllocation: allocation,
    });
    // useEffect will switch to action_result view when lastActionResult is set
  };

  // Handle attack flow
  const handleAttackTypeSelect = (type: AttackType) => {
    setPendingAttackType(type);
    setViewMode('target_select');
  };

  const handleTargetSelect = async (targetId: string) => {
    if (pendingAttackType) {
      await executeAction({
        action: 'attack',
        turns: 2,
        targetId,
        attackType: pendingAttackType,
      });
      setPendingAttackType(null);
    } else if (pendingSpell) {
      await executeAction({
        action: 'spell',
        turns: 1,
        spell: pendingSpell,
        spellTargetId: targetId,
      });
      setPendingSpell(null);
    }
    // useEffect will switch to action_result view when lastActionResult is set
  };

  // Handle spell casting (turns = number of casts, each cast costs 2 turns server-side)
  const handleSelfSpell = async (spell: SpellType) => {
    await executeAction({
      action: 'spell',
      turns: 1,
      spell,
    });
    // useEffect will switch to action_result view when lastActionResult is set
  };

  // Handle offensive spell selection - then need to pick target
  const handleOffensiveSpellSelect = (spell: SpellType) => {
    setPendingSpell(spell);
    setViewMode('target_select');
  };

  // End player phase
  const handleEndPhase = async () => {
    await endPlayerPhase();
  };

  // Handle draft
  const handleSelectDraft = async (index: number) => {
    await selectDraft(index);
    // If no more draft options, end shop phase
    if (!game.draftOptions || game.draftOptions.length === 0) {
      setViewMode('main');
    }
  };

  const handleAdvanceToBotPhase = async () => {
    await endShopPhase();
    // Immediately execute bot phase after ending shop
    await executeBotPhase();
    // Manually set viewMode to show the NewsLog (useEffect would skip it since phase is now 'player')
    setViewMode('bot_phase');
  };

  // Continue after bot phase
  const handleContinueAfterBotPhase = () => {
    clearLastResult();
    if (game.isComplete || game.playerDefeated) {
      setViewMode('game_over');
    } else {
      setViewMode('main');
    }
  };

  // Render current view
  const renderContent = () => {
    switch (viewMode) {
      case 'turns_input':
        return (
          <TurnSlider
            maxTurns={round.turnsRemaining}
            label={getActionLabel(pendingAction)}
            description={getActionDescription(pendingAction)}
            extraInfo={
              pendingAction === 'cash' && editedTaxRate !== null ? (
                <TaxRateEditor value={editedTaxRate} onChange={setEditedTaxRate} />
              ) : pendingAction === 'industry' && editedIndustryAllocation !== null ? (
                <IndustryAllocationEditor
                  value={editedIndustryAllocation}
                  onChange={setEditedIndustryAllocation}
                  troops={playerEmpire.troops}
                />
              ) : undefined
            }
            onConfirm={handleExecuteAction}
            onCancel={() => {
              setPendingAction(null);
              setEditedTaxRate(null);
              setEditedIndustryAllocation(null);
              setViewMode('main');
            }}
            disabled={loading}
          />
        );

      case 'building':
        return (
          <BuildingPanel
            freeLand={playerEmpire.resources.freeland}
            gold={playerEmpire.resources.gold}
            landTotal={playerEmpire.resources.land}
            currentBuildings={playerEmpire.buildings}
            onBuild={handleBuild}
            onDemolish={handleDemolish}
            onCancel={() => setViewMode('main')}
          />
        );

      case 'market':
        return (
          <MarketPanel
            empire={playerEmpire}
            phase={round.phase}
            marketPrices={marketPrices}
            effectivePrices={effectivePrices}
            shopStock={shopStock}
            onTransaction={marketTransaction}
            onClose={() => setViewMode(round.phase === 'shop' ? 'draft' : 'main')}
          />
        );

      case 'bank':
        return bankInfo ? (
          <BankPanel
            empire={playerEmpire}
            bankInfo={bankInfo}
            onTransaction={bankTransaction}
            onClose={() => setViewMode(round.phase === 'shop' ? 'draft' : 'main')}
          />
        ) : (
          <div className="text-center text-gray-400 py-8">Loading bank info...</div>
        );

      case 'enemies':
        return (
          <EnemyList
            bots={botEmpires}
            intel={intel}
            currentRound={round.number}
            playerEra={playerEmpire.era}
            hasActiveGate={playerEmpire.gateExpiresRound !== null && playerEmpire.gateExpiresRound >= round.number}
            onClose={() => setViewMode('main')}
          />
        );

      case 'spell_select':
        return (
          <SpellList
            runes={playerEmpire.resources.runes}
            wizards={playerEmpire.troops.trpwiz}
            land={playerEmpire.resources.land}
            wizardTowers={playerEmpire.buildings.bldwiz}
            era={playerEmpire.era}
            eraChangedRound={playerEmpire.eraChangedRound}
            currentRound={round.number}
            mode="self"
            onSelect={handleSelfSpell}
            onCancel={() => setViewMode('main')}
          />
        );

      case 'offensive_spell_select':
        return (
          <SpellList
            runes={playerEmpire.resources.runes}
            wizards={playerEmpire.troops.trpwiz}
            land={playerEmpire.resources.land}
            wizardTowers={playerEmpire.buildings.bldwiz}
            era={playerEmpire.era}
            eraChangedRound={playerEmpire.eraChangedRound}
            currentRound={round.number}
            mode="offensive"
            onSelect={handleOffensiveSpellSelect}
            onCancel={() => setViewMode('attack_type')}
          />
        );

      case 'attack_type': {
        // Calculate max attacks (base 10 + extra_attacks from advisors)
        const extraAttacks = playerEmpire.advisors
          .filter(a => a.effect.type === 'extra_attacks')
          .reduce((sum, a) => sum + a.effect.modifier, 0);
        const maxAttacks = 10 + extraAttacks;
        const attacksRemaining = maxAttacks - playerEmpire.attacksThisRound;
        return (
          <AttackTypeSelector
            attacksRemaining={attacksRemaining}
            maxAttacks={maxAttacks}
            onSelect={handleAttackTypeSelect}
            onSpell={() => setViewMode('offensive_spell_select')}
            onCancel={() => setViewMode('main')}
          />
        );
      }

      case 'target_select':
        return (
          <EnemyList
            bots={botEmpires}
            intel={intel}
            currentRound={round.number}
            playerEra={playerEmpire.era}
            hasActiveGate={playerEmpire.gateExpiresRound !== null && playerEmpire.gateExpiresRound >= round.number}
            selectable
            onSelect={handleTargetSelect}
            onClose={() => {
              if (pendingSpell) {
                setPendingSpell(null);
                setViewMode('offensive_spell_select');
              } else {
                setPendingAttackType(null);
                setViewMode('attack_type');
              }
            }}
          />
        );

      case 'action_result':
        return lastActionResult && lastActionType && pendingAction === null ? (
          <ActionResult
            result={lastActionResult}
            action={lastActionType}
            onClose={() => {
              clearLastResult();
              setViewMode('main');
            }}
          />
        ) : null;

      case 'advisors':
        return (
          <AdvisorPanel
            advisors={playerEmpire.advisors}
            maxAdvisors={3 + playerEmpire.bonusAdvisorSlots}
            onDismiss={dismissAdvisor}
            onClose={() => setViewMode(round.phase === 'shop' ? 'draft' : 'main')}
          />
        );

      case 'draft':
        return (
          <>
            {/* Edict Result Modal */}
            {lastEdictResult && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <div className="bg-game-card border-2 border-gold rounded-lg p-6 max-w-sm w-full text-center animate-in fade-in zoom-in duration-200">
                  <h3 className="font-display text-lg text-gold mb-2">
                    {lastEdictResult.edictName}
                  </h3>
                  <p className="text-white mb-4">{lastEdictResult.message}</p>
                  <button
                    onClick={clearEdictResult}
                    className="btn-primary btn-md"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {draftOptions ? (
              <DraftCarousel
                options={draftOptions}
                rerollInfo={rerollInfo}
                masteryLevels={playerEmpire.techs}
                extraPicks={playerEmpire.extraDraftPicks}
                onSelect={handleSelectDraft}
                onReroll={rerollDraft}
                onAdvance={handleAdvanceToBotPhase}
                onMarket={() => setViewMode('market')}
                onAdvisors={() => setViewMode('advisors')}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">Shop phase complete</p>
                <button onClick={handleAdvanceToBotPhase} className="btn-primary btn-lg">
                  Continue to Bot Phase
                </button>
              </div>
            )}
          </>
        );

      case 'bot_phase':
        return lastBotPhaseResult ? (
          <NewsLog
            news={lastBotPhaseResult.news}
            standings={lastBotPhaseResult.standings}
            playerId={playerEmpire.id}
            playerName={playerEmpire.name}
            onContinue={handleContinueAfterBotPhase}
          />
        ) : (
          <div className="text-center py-8">
            <div className="animate-pulse text-cyan-400 text-lg">Processing bot turns...</div>
          </div>
        );

      case 'game_over':
        return game.stats ? (
          <GameSummary
            stats={game.stats}
            finalNetworth={playerEmpire.networth}
            isVictory={game.isComplete && !game.playerDefeated}
            defeatReason={game.playerDefeated || undefined}
            onNewGame={() => {
              resetGame();
              navigate('/');
            }}
            onMenu={() => {
              resetGame();
              navigate('/');
            }}
          />
        ) : null;

      case 'overview':
        return <EmpireStatus empire={playerEmpire} round={round} expanded />;

      case 'main':
      default:
        return (
          <>
            <EmpireStatus empire={playerEmpire} round={round} />

            {round.phase === 'player' && (
              <div className="mt-4">
                <ActionGrid
                  turnsRemaining={round.turnsRemaining}
                  onAction={handleAction}
                  onEndPhase={handleEndPhase}
                  disabled={loading}
                />
              </div>
            )}
          </>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col pb-16">
      {/* Error Toast */}
      {error && (
        <div className="fixed top-0 left-0 right-0 z-50 p-4">
          <div className="bg-red-500/90 text-white px-4 py-3 rounded-lg flex justify-between items-center max-w-md mx-auto">
            <span>{error}</span>
            <button onClick={clearError} className="ml-2 text-xl">&times;</button>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && viewMode !== 'bot_phase' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
          <div className="bg-game-panel px-6 py-4 rounded-lg border border-game-border">
            <div className="animate-pulse text-cyan-400">Processing...</div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 overflow-auto">
        {renderContent()}
      </main>

      {/* Bottom Navigation - Show in main/overview view during player phase */}
      {(viewMode === 'main' || viewMode === 'overview') && round.phase === 'player' && (
        <ActionBar
          onAction={(action) => {
            if (action === 'overview') setViewMode('overview');
            else if (action === 'explore') setViewMode('main');
            else if (action === 'market') setViewMode('market');
            else if (action === 'enemies') setViewMode('enemies');
          }}
          activeAction={viewMode === 'overview' ? 'overview' : 'explore'}
        />
      )}
    </div>
  );
}

// Helper functions
function getActionLabel(action: TurnAction | null): string {
  const labels: Record<TurnAction, string> = {
    explore: 'Explore',
    farm: 'Farm',
    cash: 'Collect Taxes',
    meditate: 'Meditate',
    industry: 'Industry',
    build: 'Build',
    demolish: 'Demolish',
    attack: 'Attack',
    spell: 'Cast Spell',
  };
  return action ? labels[action] : 'Action';
}

function getActionDescription(action: TurnAction | null): string {
  const descriptions: Record<TurnAction, string> = {
    explore: 'Gain new land for your empire',
    farm: 'Boost food production this turn',
    cash: 'Collect taxes and generate income',
    meditate: 'Generate magical runes',
    industry: 'Produce military troops',
    build: 'Construct buildings',
    demolish: 'Tear down buildings for refund',
    attack: 'Attack enemy empire',
    spell: 'Cast a spell',
  };
  return action ? descriptions[action] : '';
}
