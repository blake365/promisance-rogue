import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';
import { Panel } from '@/components/ui';
import {
  EmpireStatus,
  ActionPanel,
  BuildingPanel,
  MarketPanel,
  BankPanel,
  EnemyList,
  SpellList,
  AttackTypeSelector,
  DraftCarousel,
  ActionResult,
  ActionToast,
  NewsLog,
  GameSummary,
  AdvisorPanel,
} from '@/components/game';
import type { TurnAction, SpellType, AttackType, Buildings, IndustryAllocation } from '@/types';

type ViewMode =
  | 'main'
  | 'building'
  | 'market'
  | 'bank'
  | 'enemies'
  | 'spell_select'
  | 'offensive_spell_select'
  | 'attack_type'
  | 'target_select'
  | 'action_result'
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
    abandonGame,
  } = useGameStore();

  const [viewMode, setViewMode] = useState<ViewMode>('main');
  const [pendingSpell, setPendingSpell] = useState<SpellType | null>(null);
  const [pendingAttackType, setPendingAttackType] = useState<AttackType | null>(null);
  const [lastAttackType, setLastAttackType] = useState<AttackType | null>(null);
  const [lastTargetId, setLastTargetId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [showFullResult, setShowFullResult] = useState(false);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

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

  // Show action result when available - use toast for simple actions, full view for combat/spell
  useEffect(() => {
    if (lastActionResult) {
      // Always show toast first
      setShowToast(true);
      setShowFullResult(false);
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

  // Handle unified action execution from ActionPanel
  const handleUnifiedAction = async (
    action: TurnAction,
    turns: number,
    options?: { taxRate?: number; industryAllocation?: IndustryAllocation }
  ) => {
    await executeAction({
      action,
      turns,
      taxRate: options?.taxRate,
      industryAllocation: options?.industryAllocation,
    });
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
      setLastAttackType(pendingAttackType);
      setLastTargetId(targetId);
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
  };

  const handleAdvanceToBotPhase = async () => {
    const newPhase = await endShopPhase();
    // Only execute bot phase if we transitioned to 'bot' phase
    // After round 0 shop, we go to 'player' phase instead
    if (newPhase === 'bot') {
      await executeBotPhase();
      // Manually set viewMode to show the NewsLog (useEffect would skip it since phase is now 'player')
      setViewMode('bot_phase');
    } else if (newPhase === 'player') {
      // After initial shop phase, go straight to main view for player phase
      setViewMode('main');
    }
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
      case 'building':
        return (
          <BuildingPanel
            freeLand={playerEmpire.resources.freeland}
            gold={playerEmpire.resources.gold}
            landTotal={playerEmpire.resources.land}
            turnsRemaining={round.turnsRemaining}
            currentBuildings={playerEmpire.buildings}
            empire={playerEmpire}
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
            era={playerEmpire.era}
            eraChangedRound={playerEmpire.eraChangedRound}
            currentRound={round.number}
            health={playerEmpire.health}
            spellCosts={playerEmpire.spellCosts}
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
            era={playerEmpire.era}
            eraChangedRound={playerEmpire.eraChangedRound}
            currentRound={round.number}
            health={playerEmpire.health}
            spellCosts={playerEmpire.spellCosts}
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
        // This case is now only used when showFullResult is true
        return lastActionResult && lastActionType ? (
          <ActionResult
            result={lastActionResult}
            action={lastActionType}
            onClose={() => {
              clearLastResult();
              setShowFullResult(false);
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

            <div className="space-y-6">
              {/* Draft Options (if available) */}
              {draftOptions && draftOptions.length > 0 && (
                <DraftCarousel
                  options={draftOptions}
                  rerollInfo={rerollInfo}
                  masteryLevels={playerEmpire.techs}
                  extraPicks={playerEmpire.extraDraftPicks}
                  onSelect={handleSelectDraft}
                  onReroll={rerollDraft}
                  onAdvisors={() => setViewMode('advisors')}
                />
              )}

              {/* No more draft picks message */}
              {(!draftOptions || draftOptions.length === 0) && (
                <div className="bg-game-card rounded-lg p-4 border border-game-border text-center">
                  <p className="text-gray-400">No more draft picks available</p>
                  <button
                    onClick={() => setViewMode('advisors')}
                    className="btn-secondary btn-sm mt-2"
                  >
                    👤 Manage Advisors
                  </button>
                </div>
              )}

              {/* Embedded Market - hide during initial shop (round 0) when turnsRemaining > 0 */}
              {round.turnsRemaining === 0 && (
                <div className="border-t border-game-border pt-4">
                  <MarketPanel
                    empire={playerEmpire}
                    phase={round.phase}
                    marketPrices={marketPrices}
                    effectivePrices={effectivePrices}
                    shopStock={shopStock}
                    onTransaction={marketTransaction}
                    onClose={() => {}} // No-op since it's embedded
                    embedded
                  />
                </div>
              )}

              {/* Advance Button - different text for initial shop vs later shops */}
              <button onClick={handleAdvanceToBotPhase} className="btn-secondary btn-lg w-full">
                {round.turnsRemaining > 0 ? '⏩ Start Player Phase' : '⏩ Advance to Bot Phase'}
              </button>
            </div>
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
            seed={game.seed}
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

      case 'main':
      default:
        return (
          <>
            <EmpireStatus empire={playerEmpire} round={round} />

            {round.phase === 'player' && (
              <div className="mt-4">
                <ActionPanel
                  turnsRemaining={round.turnsRemaining}
                  health={playerEmpire.health}
                  taxRate={playerEmpire.taxRate}
                  industryAllocation={playerEmpire.industryAllocation}
                  troops={playerEmpire.troops}
                  buildings={playerEmpire.buildings}
                  disabled={loading}
                  onExecute={handleUnifiedAction}
                  onBuild={() => setViewMode('building')}
                  onAttack={() => setViewMode('attack_type')}
                  onSpell={() => setViewMode('spell_select')}
                  onMarket={() => setViewMode('market')}
                  onBank={() => {
                    fetchBankInfo();
                    setViewMode('bank');
                  }}
                  onEnemies={() => setViewMode('enemies')}
                  onOverview={() => navigate('/overview')}
                  onGuide={() => navigate('/guide')}
                  onEndPhase={handleEndPhase}
                  onAbandon={() => setShowAbandonConfirm(true)}
                />
              </div>
            )}
          </>
        );
    }
  };

  // Handle toast dismiss
  const handleToastDismiss = () => {
    setShowToast(false);
    clearLastResult();
  };

  // Handle attack again from toast - same target
  const handleAttackSameTarget = async () => {
    if (lastAttackType && lastTargetId) {
      setShowToast(false);
      clearLastResult();
      await executeAction({
        action: 'attack',
        turns: 2,
        targetId: lastTargetId,
        attackType: lastAttackType,
      });
    }
  };

  // Handle attack again from toast - new target
  const handleAttackNewTarget = () => {
    setShowToast(false);
    clearLastResult();
    if (lastAttackType) {
      setPendingAttackType(lastAttackType);
      setViewMode('target_select');
    } else {
      setViewMode('attack_type');
    }
  };

  // Handle viewing full result details
  const handleViewDetails = () => {
    setShowToast(false);
    setShowFullResult(true);
    setViewMode('action_result');
  };

  // Handle abandon game confirmation
  const handleAbandonConfirm = async () => {
    await abandonGame();
    setShowAbandonConfirm(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Error Toast */}
      {error && (
        <div className="fixed top-0 left-0 right-0 z-50 p-4">
          <div className="bg-red-500/90 text-white px-4 py-3 rounded-lg flex justify-between items-center max-w-md mx-auto">
            <span>{error}</span>
            <button onClick={clearError} className="ml-2 text-xl">&times;</button>
          </div>
        </div>
      )}

      {/* Action Result Toast */}
      {showToast && lastActionResult && lastActionType && (() => {
        const canAttackAgain = lastActionType === 'attack' &&
          round.turnsRemaining >= 2 &&
          playerEmpire.attacksThisRound < (10 + playerEmpire.advisors.filter(a => a.effect.type === 'extra_attacks').reduce((sum, a) => sum + a.effect.modifier, 0));
        const targetStillAlive = lastTargetId && botEmpires.some(b => b.id === lastTargetId && b.land > 0);

        return (
          <ActionToast
            result={lastActionResult}
            action={lastActionType}
            onDismiss={handleToastDismiss}
            onViewDetails={handleViewDetails}
            onAttackSameTarget={canAttackAgain && targetStillAlive ? handleAttackSameTarget : undefined}
            onAttackNewTarget={canAttackAgain ? handleAttackNewTarget : undefined}
            autoHideMs={lastActionType === 'attack' || lastActionType === 'spell' ? 10000 : 5000}
          />
        );
      })()}

      {/* Full Result Modal (for combat/spell details) */}
      {showFullResult && lastActionResult && lastActionType && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-game-panel border border-game-border rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto p-4">
            <ActionResult
              result={lastActionResult}
              action={lastActionType}
              onClose={() => {
                clearLastResult();
                setShowFullResult(false);
                setViewMode('main');
              }}
            />
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

      {/* Abandon Confirmation Modal */}
      {showAbandonConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-game-card border-2 border-red-500/50 rounded-lg p-6 max-w-sm w-full text-center animate-in fade-in zoom-in duration-200">
            <div className="text-4xl mb-3">🏳️</div>
            <h3 className="font-display text-lg text-red-400 mb-2">Abandon Game?</h3>
            <p className="text-gray-400 text-sm mb-4">
              Your empire will be lost and this run will not be added to the leaderboard.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAbandonConfirm(false)}
                className="flex-1 py-2 px-4 rounded-lg bg-game-border text-gray-300 hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAbandonConfirm}
                className="flex-1 py-2 px-4 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors"
              >
                Abandon
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-2 sm:p-4 overflow-auto">
        {renderContent()}
      </main>
    </div>
  );
}
