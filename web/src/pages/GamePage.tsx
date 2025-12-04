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
} from '@/components/game';
import type { TurnAction, SpellType, AttackType, Buildings } from '@/types';

type ViewMode =
  | 'main'
  | 'turns_input'
  | 'building'
  | 'market'
  | 'bank'
  | 'enemies'
  | 'spell_select'
  | 'attack_type'
  | 'target_select'
  | 'action_result'
  | 'overview'
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
    lastBotPhaseResult,
    clearError,
    clearLastResult,
    checkActiveGame,
    executeAction,
    endPlayerPhase,
    selectDraft,
    rerollDraft,
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
  const [activeTab, setActiveTab] = useState<'status' | 'actions' | 'market' | 'enemies'>('actions');

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
    if (game.round?.phase === 'shop' && game.draftOptions) {
      setViewMode('draft');
    } else if (game.round?.phase === 'bot') {
      setViewMode('bot_phase');
    } else if (game.round?.phase === 'player') {
      setViewMode('main');
    } else if (game.isComplete || game.playerDefeated) {
      setViewMode('game_over');
    }
  }, [game.round?.phase, game.draftOptions, game.isComplete, game.playerDefeated]);

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

  const { playerEmpire, round, botEmpires, intel, marketPrices, shopStock, draftOptions, rerollInfo } = game;

  // Handle action selection
  const handleAction = (action: TurnAction | 'market' | 'bank' | 'overview' | 'enemies' | 'guide' | 'end_phase') => {
    clearError();

    if (action === 'market') {
      setViewMode('market');
    } else if (action === 'bank') {
      setViewMode('bank');
    } else if (action === 'overview') {
      setActiveTab('status');
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
      setViewMode('turns_input');
    }
  };

  // Execute turn action
  const handleExecuteAction = async (turns: number) => {
    if (!pendingAction) return;

    await executeAction({
      action: pendingAction,
      turns,
    });

    setPendingAction(null);
  };

  // Handle building
  const handleBuild = async (allocation: Partial<Buildings>) => {
    await executeAction({
      action: 'build',
      turns: 1,
      buildingAllocation: allocation,
    });
    setViewMode('main');
  };

  const handleDemolish = async (allocation: Partial<Buildings>) => {
    await executeAction({
      action: 'demolish',
      turns: 1,
      demolishAllocation: allocation,
    });
    setViewMode('main');
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
        turns: 2,
        spell: pendingSpell,
        spellTargetId: targetId,
      });
      setPendingSpell(null);
    }
    setViewMode('main');
  };

  // Handle spell casting
  const handleSelfSpell = async (spell: SpellType) => {
    await executeAction({
      action: 'spell',
      turns: 2,
      spell,
    });
    setViewMode('main');
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

  const handleSkipDraft = async () => {
    await endShopPhase();
    // The useEffect watching game.round?.phase will handle viewMode transition
  };

  // Execute bot phase
  const handleBotPhase = async () => {
    await executeBotPhase();
  };

  // Continue after bot phase
  const handleContinueAfterBotPhase = () => {
    clearLastResult();
    if (game.isComplete || game.playerDefeated) {
      setViewMode('game_over');
    } else {
      setViewMode('main');
      setActiveTab('actions');
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
            onConfirm={handleExecuteAction}
            onCancel={() => {
              setPendingAction(null);
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
            shopStock={shopStock}
            onTransaction={marketTransaction}
            onClose={() => setViewMode('main')}
          />
        );

      case 'bank':
        return bankInfo ? (
          <BankPanel
            empire={playerEmpire}
            bankInfo={bankInfo}
            onTransaction={bankTransaction}
            onClose={() => setViewMode('main')}
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
            mode="self"
            onSelect={handleSelfSpell}
            onCancel={() => setViewMode('main')}
          />
        );

      case 'attack_type':
        return (
          <AttackTypeSelector
            onSelect={handleAttackTypeSelect}
            onSpell={() => {
              setViewMode('spell_select');
              // Actually show offensive spells
            }}
            onCancel={() => setViewMode('main')}
          />
        );

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
              setPendingAttackType(null);
              setPendingSpell(null);
              setViewMode('main');
            }}
          />
        );

      case 'action_result':
        return lastActionResult && pendingAction === null ? (
          <ActionResult
            result={lastActionResult}
            action={lastActionResult.combatResult ? 'attack' : lastActionResult.spellResult ? 'spell' : 'explore'}
            onClose={() => {
              clearLastResult();
              setViewMode('main');
            }}
          />
        ) : null;

      case 'draft':
        return draftOptions ? (
          <DraftCarousel
            options={draftOptions}
            rerollInfo={rerollInfo}
            masteryLevels={playerEmpire.techs}
            extraPicks={playerEmpire.extraDraftPicks}
            onSelect={handleSelectDraft}
            onReroll={rerollDraft}
            onSkip={handleSkipDraft}
            onMarket={() => setViewMode('market')}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">Shop phase complete</p>
            <button onClick={handleSkipDraft} className="btn-primary btn-lg">
              Continue to Bot Phase
            </button>
          </div>
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
            <h2 className="font-display text-xl text-gold mb-4">Bot Phase</h2>
            <p className="text-gray-400 mb-6">
              The other empires will now take their turns.
            </p>
            <button
              onClick={handleBotPhase}
              disabled={loading}
              className="btn-primary btn-lg"
            >
              {loading ? 'Processing...' : 'Execute Bot Phase'}
            </button>
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

      {/* Bottom Navigation - Only show in main view during player phase */}
      {viewMode === 'main' && round.phase === 'player' && (
        <ActionBar
          onAction={(action) => {
            if (action === 'overview') setActiveTab('status');
            else if (action === 'explore') setActiveTab('actions');
            else if (action === 'market') setViewMode('market');
            else if (action === 'enemies') setViewMode('enemies');
          }}
          activeAction={activeTab === 'status' ? 'overview' : activeTab === 'actions' ? 'explore' : undefined}
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
