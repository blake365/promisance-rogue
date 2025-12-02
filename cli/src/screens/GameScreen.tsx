import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import Spinner from 'ink-spinner';
import type {
  Empire,
  GameRound,
  TurnAction,
  TurnActionRequest,
  TurnActionResult,
  DraftOption,
  BotSummary,
  SpellType,
  IndustryAllocation,
  ShopTransaction,
  MarketPrices,
  ShopStock,
  BankTransaction,
  BankInfo,
} from '../api/client.js';
import { EmpireStatus } from '../components/EmpireStatus.js';
import { ActionMenu } from '../components/ActionMenu.js';
import { TurnsInput } from '../components/TurnsInput.js';
import { BotList } from '../components/BotList.js';
import { EmpireOverview } from '../components/EmpireOverview.js';
import { DraftPicker } from '../components/DraftPicker.js';
import { BuildingSelector } from '../components/BuildingSelector.js';
import { SpellSelector } from '../components/SpellSelector.js';
import { AttackTypeSelector, type AttackType, type CombatChoice } from '../components/AttackTypeSelector.js';
import { IndustryAllocationSelector } from '../components/IndustryAllocationSelector.js';
import { TaxRateInput } from '../components/TaxRateInput.js';
import { MarketView } from '../components/MarketView.js';
import { BankView } from '../components/BankView.js';

type ViewMode =
  | 'main'
  | 'turns_input'
  | 'building_select'
  | 'overview'
  | 'bots'
  | 'target_select'
  | 'attack_type_select'
  | 'spell_select'
  | 'spell_target_select'
  | 'industry_allocation'
  | 'tax_rate'
  | 'market'
  | 'bank'
  | 'action_result'
  | 'shop'
  | 'draft'
  | 'bot_phase';

interface Props {
  empire: Empire;
  round: GameRound;
  bots: BotSummary[];
  draftOptions: DraftOption[] | null;
  marketPrices: MarketPrices | null;
  shopStock: ShopStock | null;
  bankInfo: BankInfo | null;
  loading: boolean;
  error: string | null;
  onAction: (action: TurnActionRequest) => Promise<TurnActionResult | null>;
  onEndPlayerPhase: () => Promise<boolean>;
  onSelectDraft: (index: number) => Promise<boolean>;
  onEndShopPhase: () => Promise<boolean>;
  onMarketTransaction: (transaction: ShopTransaction) => Promise<boolean>;
  onBankTransaction: (transaction: BankTransaction) => Promise<boolean>;
  onExecuteBotPhase: () => Promise<any>;
  onQuit: () => void;
}

export function GameScreen({
  empire,
  round,
  bots,
  draftOptions,
  marketPrices,
  shopStock,
  bankInfo,
  loading,
  error,
  onAction,
  onEndPlayerPhase,
  onSelectDraft,
  onEndShopPhase,
  onMarketTransaction,
  onBankTransaction,
  onExecuteBotPhase,
  onQuit,
}: Props) {
  const { exit } = useApp();
  const [view, setView] = useState<ViewMode>('main');
  const [pendingAction, setPendingAction] = useState<TurnAction | null>(null);
  const [lastResult, setLastResult] = useState<TurnActionResult | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [selectedTargetName, setSelectedTargetName] = useState<string | null>(null);
  const [selectedAttackType, setSelectedAttackType] = useState<AttackType | null>(null);
  const [selectedSpell, setSelectedSpell] = useState<SpellType | null>(null);

  // Handle global keys
  useInput((input, key) => {
    if (key.escape && view === 'action_result') {
      setLastResult(null);
      // Return to attack view if we still have a target, otherwise main
      if (selectedTargetId) {
        setView('attack_type_select');
      } else {
        setView('main');
      }
    }
    if (input === 'q' && view === 'main') {
      exit();
    }
  });

  // Handle action selection from menu
  const handleActionSelect = useCallback(
    async (action: TurnAction | 'end_phase' | 'status' | 'overview' | 'bots' | 'market' | 'bank') => {
      if (action === 'overview') {
        setView('overview');
      } else if (action === 'bots') {
        setView('bots');
      } else if (action === 'market') {
        setView('market');
      } else if (action === 'bank') {
        setView('bank');
      } else if (action === 'end_phase') {
        await onEndPlayerPhase();
        if (round.phase === 'shop') {
          setView('shop');
        }
      } else if (action === 'attack') {
        setPendingAction('attack');
        setView('target_select');
      } else if (action === 'build') {
        setView('building_select');
      } else if (action === 'spell') {
        setView('spell_select');
      } else if (action === 'industry') {
        setView('industry_allocation');
      } else if (action === 'cash') {
        setView('tax_rate');
      } else {
        setPendingAction(action as TurnAction);
        setView('turns_input');
      }
    },
    [onEndPlayerPhase, round.phase]
  );

  // Handle turns input confirmation
  const handleTurnsConfirm = useCallback(
    async (turns: number) => {
      if (!pendingAction) return;

      const request: TurnActionRequest = {
        action: pendingAction,
        turns,
        targetId: selectedTargetId ?? undefined,
        attackType: pendingAction === 'attack' ? selectedAttackType ?? 'standard' : undefined,
        spell: selectedSpell ?? undefined,
        spellTargetId: pendingAction === 'spell' ? selectedTargetId ?? undefined : undefined,
      };

      const result = await onAction(request);
      if (result) {
        setLastResult(result);
        setView('action_result');
      } else {
        setView('main');
      }
      setPendingAction(null);
      setSelectedTargetId(null);
      setSelectedTargetName(null);
      setSelectedAttackType(null);
      setSelectedSpell(null);
    },
    [pendingAction, selectedTargetId, selectedAttackType, selectedSpell, onAction]
  );

  // Handle target selection for attack
  const handleTargetSelect = useCallback(
    (targetId: string) => {
      const target = bots.find((b) => b.id === targetId);
      setSelectedTargetId(targetId);
      setSelectedTargetName(target?.name || 'Unknown');
      setView('attack_type_select');
    },
    [bots]
  );

  // Handle attack type selection (military or magic) - immediately execute with 1 action
  const handleAttackTypeSelect = useCallback(
    async (choice: CombatChoice) => {
      const request: TurnActionRequest = choice.kind === 'military'
        ? {
            action: 'attack',
            turns: 1,
            targetId: selectedTargetId ?? undefined,
            attackType: choice.attackType,
          }
        : {
            action: 'spell',
            turns: 1,
            targetId: selectedTargetId ?? undefined,
            spell: choice.spell,
            spellTargetId: selectedTargetId ?? undefined,
          };

      const result = await onAction(request);
      if (result) {
        setLastResult(result);
        setView('action_result');
        // Keep target selected so we return to attack_type_select after viewing result
      } else {
        setView('attack_type_select');
      }
    },
    [selectedTargetId, onAction]
  );

  // Handle spell selection (self spells only - offensive spells go through attack flow)
  // Self spells allow selecting number of casts
  const handleSpellSelect = useCallback((spell: SpellType) => {
    setSelectedSpell(spell);
    setPendingAction('spell');
    setView('turns_input');
  }, []);

  // Handle spell target selection
  const handleSpellTargetSelect = useCallback(
    (targetId: string) => {
      const target = bots.find((b) => b.id === targetId);
      setSelectedTargetId(targetId);
      setSelectedTargetName(target?.name || 'Unknown');
      setPendingAction('spell');
      setView('turns_input');
    },
    [bots]
  );

  // Handle industry allocation confirmation
  const handleIndustryConfirm = useCallback(
    async (allocation: IndustryAllocation, turns: number) => {
      const request: TurnActionRequest = {
        action: 'industry',
        turns,
        industryAllocation: allocation,
      };

      const result = await onAction(request);
      if (result) {
        setLastResult(result);
        setView('action_result');
      } else {
        setView('main');
      }
    },
    [onAction]
  );

  // Handle tax rate and cash action confirmation
  const handleTaxRateConfirm = useCallback(
    async (taxRate: number, turns: number) => {
      const request: TurnActionRequest = {
        action: 'cash',
        turns,
        taxRate,
      };

      const result = await onAction(request);
      if (result) {
        setLastResult(result);
        setView('action_result');
      } else {
        setView('main');
      }
    },
    [onAction]
  );

  // Handle building selection confirmation
  const handleBuildingConfirm = useCallback(
    async (allocation: Partial<typeof empire.buildings>) => {
      const request: TurnActionRequest = {
        action: 'build',
        turns: 0, // Server calculates turns automatically
        buildingAllocation: allocation,
      };

      const result = await onAction(request);
      if (result) {
        setLastResult(result);
        setView('action_result');
      } else {
        setView('main');
      }
    },
    [onAction]
  );

  // Handle draft selection
  const handleDraftSelect = useCallback(
    async (index: number) => {
      await onSelectDraft(index);
    },
    [onSelectDraft]
  );

  // Handle shop phase completion
  const handleShopDone = useCallback(async () => {
    await onEndShopPhase();
    setView('bot_phase');
  }, [onEndShopPhase]);

  // Handle bot phase
  const handleBotPhase = useCallback(async () => {
    await onExecuteBotPhase();
    setView('main');
  }, [onExecuteBotPhase]);

  // Auto-transition based on phase changes
  useEffect(() => {
    if (round.phase === 'shop' && view === 'main') {
      setView('shop');
    }
    if (round.phase === 'bot' && view !== 'bot_phase') {
      setView('bot_phase');
    }
  }, [round.phase, view]);

  // Render loading state
  if (loading) {
    return (
      <Box flexDirection="column" alignItems="center" padding={2}>
        <Text color="cyan">
          <Spinner type="dots" />
          {' Processing...'}
        </Text>
      </Box>
    );
  }

  // Render error
  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">Error: {error}</Text>
        <Text color="gray">[any key] to continue</Text>
      </Box>
    );
  }

  // Player Phase views
  if (round.phase === 'player') {
    return (
      <Box flexDirection="column" padding={1}>
        <EmpireStatus empire={empire} round={round} />

        {view === 'main' && (
          <Box marginTop={1}>
            <ActionMenu onSelect={handleActionSelect} disabled={loading} />
          </Box>
        )}

        {view === 'turns_input' && pendingAction && (
          <Box marginTop={1}>
            <TurnsInput
              maxTurns={round.turnsRemaining}
              actionLabel={
                pendingAction === 'spell' && selectedSpell
                  ? `Cast ${selectedSpell.charAt(0).toUpperCase()}${selectedSpell.slice(1)}`
                  : `${pendingAction.charAt(0).toUpperCase()}${pendingAction.slice(1)}`
              }
              countLabel={pendingAction === 'spell' ? 'Casts' : 'Actions'}
              onConfirm={handleTurnsConfirm}
              onCancel={() => {
                setView('main');
                setPendingAction(null);
                setSelectedSpell(null);
              }}
            />
          </Box>
        )}

        {view === 'building_select' && (
          <Box marginTop={1}>
            <BuildingSelector
              freeLand={empire.resources.freeland}
              gold={empire.resources.gold}
              landTotal={empire.resources.land}
              onConfirm={handleBuildingConfirm}
              onCancel={() => setView('main')}
            />
          </Box>
        )}

        {view === 'overview' && (
          <Box marginTop={1}>
            <EmpireOverview empire={empire} round={round} onClose={() => setView('main')} />
          </Box>
        )}

        {view === 'bots' && (
          <Box marginTop={1}>
            <BotList bots={bots} onClose={() => setView('main')} />
          </Box>
        )}

        {view === 'target_select' && (
          <Box marginTop={1}>
            <BotList
              bots={bots}
              selectable
              onSelect={handleTargetSelect}
              onClose={() => {
                setView('main');
                setPendingAction(null);
              }}
            />
          </Box>
        )}

        {view === 'attack_type_select' && selectedTargetName && (
          <Box marginTop={1}>
            <AttackTypeSelector
              targetName={selectedTargetName}
              runes={empire.resources.runes}
              wizards={empire.troops.trpwiz}
              onSelect={handleAttackTypeSelect}
              onCancel={() => {
                setView('main');
                setSelectedTargetId(null);
                setSelectedTargetName(null);
              }}
            />
          </Box>
        )}

        {view === 'spell_select' && (
          <Box marginTop={1}>
            <SpellSelector
              runes={empire.resources.runes}
              wizards={empire.troops.trpwiz}
              onSelect={handleSpellSelect}
              onCancel={() => setView('main')}
            />
          </Box>
        )}

        {view === 'spell_target_select' && (
          <Box marginTop={1}>
            <BotList
              bots={bots}
              selectable
              onSelect={handleSpellTargetSelect}
              onClose={() => {
                setView('spell_select');
                setSelectedSpell(null);
              }}
            />
          </Box>
        )}

        {view === 'industry_allocation' && (
          <Box marginTop={1}>
            <IndustryAllocationSelector
              currentAllocation={empire.industryAllocation}
              maxTurns={round.turnsRemaining}
              onConfirm={handleIndustryConfirm}
              onCancel={() => setView('main')}
            />
          </Box>
        )}

        {view === 'tax_rate' && (
          <Box marginTop={1}>
            <TaxRateInput
              currentRate={empire.taxRate}
              maxTurns={round.turnsRemaining}
              onConfirm={handleTaxRateConfirm}
              onCancel={() => setView('main')}
            />
          </Box>
        )}

        {view === 'market' && (
          <Box marginTop={1}>
            <MarketView
              empire={empire}
              phase={round.phase}
              marketPrices={marketPrices}
              shopStock={shopStock}
              onTransaction={onMarketTransaction}
              onClose={() => setView('main')}
            />
          </Box>
        )}

        {view === 'bank' && bankInfo && (
          <Box marginTop={1}>
            <BankView
              empire={empire}
              bankInfo={bankInfo}
              onTransaction={onBankTransaction}
              onClose={() => setView('main')}
            />
          </Box>
        )}

        {view === 'action_result' && lastResult && (
          <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="green" paddingX={1}>
            <Text bold color="green">
              Action Complete - {lastResult.turnsSpent} turn{lastResult.turnsSpent !== 1 ? 's' : ''} spent
            </Text>
            <Text color="gray">Turns remaining: {lastResult.turnsRemaining}</Text>

            {/* Resources Section */}
            <Box marginTop={1} flexDirection="column">
              <Text bold color="yellow">━━ Resources ━━</Text>
              <Box>
                <Text color="yellow">Gold:  </Text>
                <Text color="green">+{lastResult.income.toLocaleString()}</Text>
                <Text color="red"> -{lastResult.expenses.toLocaleString()}</Text>
                <Text color="gray"> = </Text>
                <Text color={lastResult.income - lastResult.expenses >= 0 ? 'green' : 'red'}>
                  {lastResult.income - lastResult.expenses >= 0 ? '+' : ''}
                  {(lastResult.income - lastResult.expenses).toLocaleString()} net
                </Text>
              </Box>
              <Box>
                <Text color="yellow">Food:  </Text>
                <Text color="green">+{lastResult.foodProduction.toLocaleString()}</Text>
                <Text color="red"> -{lastResult.foodConsumption.toLocaleString()}</Text>
                <Text color="gray"> = </Text>
                <Text color={lastResult.foodProduction - lastResult.foodConsumption >= 0 ? 'green' : 'red'}>
                  {lastResult.foodProduction - lastResult.foodConsumption >= 0 ? '+' : ''}
                  {(lastResult.foodProduction - lastResult.foodConsumption).toLocaleString()} net
                </Text>
              </Box>
              {lastResult.runeChange !== 0 && (
                <Box>
                  <Text color="magenta">Runes: </Text>
                  <Text color={lastResult.runeChange >= 0 ? 'green' : 'red'}>
                    {lastResult.runeChange >= 0 ? '+' : ''}{lastResult.runeChange.toLocaleString()}
                  </Text>
                </Box>
              )}
            </Box>

            {/* Land Section */}
            {lastResult.landGained !== undefined && lastResult.landGained > 0 && (
              <Box marginTop={1} flexDirection="column">
                <Text bold color="green">━━ Land ━━</Text>
                <Text color="green">+{lastResult.landGained} acres explored</Text>
              </Box>
            )}

            {/* Troops Produced Section */}
            {lastResult.troopsProduced && Object.values(lastResult.troopsProduced).some((v) => v && v > 0) && (
              <Box marginTop={1} flexDirection="column">
                <Text bold color="cyan">━━ Troops Produced ━━</Text>
                {lastResult.troopsProduced.trparm !== undefined && lastResult.troopsProduced.trparm > 0 && (
                  <Text>  Infantry: <Text color="green">+{lastResult.troopsProduced.trparm.toLocaleString()}</Text></Text>
                )}
                {lastResult.troopsProduced.trplnd !== undefined && lastResult.troopsProduced.trplnd > 0 && (
                  <Text>  Cavalry:  <Text color="green">+{lastResult.troopsProduced.trplnd.toLocaleString()}</Text></Text>
                )}
                {lastResult.troopsProduced.trpfly !== undefined && lastResult.troopsProduced.trpfly > 0 && (
                  <Text>  Archers:  <Text color="green">+{lastResult.troopsProduced.trpfly.toLocaleString()}</Text></Text>
                )}
                {lastResult.troopsProduced.trpsea !== undefined && lastResult.troopsProduced.trpsea > 0 && (
                  <Text>  Catapults:<Text color="green">+{lastResult.troopsProduced.trpsea.toLocaleString()}</Text></Text>
                )}
                {lastResult.troopsProduced.trpwiz !== undefined && lastResult.troopsProduced.trpwiz > 0 && (
                  <Text>  Wizards:  <Text color="green">+{lastResult.troopsProduced.trpwiz.toLocaleString()}</Text></Text>
                )}
              </Box>
            )}

            {/* Buildings Constructed Section */}
            {lastResult.buildingsConstructed && Object.values(lastResult.buildingsConstructed).some((v) => v && v > 0) && (
              <Box marginTop={1} flexDirection="column">
                <Text bold color="blue">━━ Buildings Constructed ━━</Text>
                {lastResult.buildingsConstructed.bldcash !== undefined && lastResult.buildingsConstructed.bldcash > 0 && (
                  <Text>  Markets:  <Text color="green">+{lastResult.buildingsConstructed.bldcash}</Text></Text>
                )}
                {lastResult.buildingsConstructed.bldtrp !== undefined && lastResult.buildingsConstructed.bldtrp > 0 && (
                  <Text>  Barracks: <Text color="green">+{lastResult.buildingsConstructed.bldtrp}</Text></Text>
                )}
                {lastResult.buildingsConstructed.bldcost !== undefined && lastResult.buildingsConstructed.bldcost > 0 && (
                  <Text>  Exchanges:<Text color="green">+{lastResult.buildingsConstructed.bldcost}</Text></Text>
                )}
                {lastResult.buildingsConstructed.bldfood !== undefined && lastResult.buildingsConstructed.bldfood > 0 && (
                  <Text>  Farms:    <Text color="green">+{lastResult.buildingsConstructed.bldfood}</Text></Text>
                )}
                {lastResult.buildingsConstructed.bldwiz !== undefined && lastResult.buildingsConstructed.bldwiz > 0 && (
                  <Text>  Towers:   <Text color="green">+{lastResult.buildingsConstructed.bldwiz}</Text></Text>
                )}
              </Box>
            )}

            {/* Combat Result Section */}
            {lastResult.combatResult && (
              <Box marginTop={1} flexDirection="column">
                <Text bold color={lastResult.combatResult.won ? 'green' : 'red'}>
                  ━━ Combat: {lastResult.combatResult.won ? 'VICTORY!' : 'DEFEAT'} ━━
                </Text>
                {lastResult.combatResult.won && lastResult.combatResult.landGained > 0 && (
                  <Text color="green">Land captured: +{lastResult.combatResult.landGained} acres</Text>
                )}
                {lastResult.combatResult.attackerLosses && Object.values(lastResult.combatResult.attackerLosses).some((v) => v && v > 0) && (
                  <Box flexDirection="column">
                    <Text color="red">Your losses:</Text>
                    {lastResult.combatResult.attackerLosses.trparm !== undefined && lastResult.combatResult.attackerLosses.trparm > 0 && (
                      <Text color="red">  Infantry: -{lastResult.combatResult.attackerLosses.trparm}</Text>
                    )}
                    {lastResult.combatResult.attackerLosses.trplnd !== undefined && lastResult.combatResult.attackerLosses.trplnd > 0 && (
                      <Text color="red">  Cavalry: -{lastResult.combatResult.attackerLosses.trplnd}</Text>
                    )}
                    {lastResult.combatResult.attackerLosses.trpfly !== undefined && lastResult.combatResult.attackerLosses.trpfly > 0 && (
                      <Text color="red">  Archers: -{lastResult.combatResult.attackerLosses.trpfly}</Text>
                    )}
                    {lastResult.combatResult.attackerLosses.trpsea !== undefined && lastResult.combatResult.attackerLosses.trpsea > 0 && (
                      <Text color="red">  Catapults: -{lastResult.combatResult.attackerLosses.trpsea}</Text>
                    )}
                  </Box>
                )}
                {lastResult.combatResult.defenderLosses && Object.values(lastResult.combatResult.defenderLosses).some((v) => v && v > 0) && (
                  <Box flexDirection="column">
                    <Text color="cyan">Enemy losses:</Text>
                    {lastResult.combatResult.defenderLosses.trparm !== undefined && lastResult.combatResult.defenderLosses.trparm > 0 && (
                      <Text color="cyan">  Infantry: -{lastResult.combatResult.defenderLosses.trparm}</Text>
                    )}
                    {lastResult.combatResult.defenderLosses.trplnd !== undefined && lastResult.combatResult.defenderLosses.trplnd > 0 && (
                      <Text color="cyan">  Cavalry: -{lastResult.combatResult.defenderLosses.trplnd}</Text>
                    )}
                    {lastResult.combatResult.defenderLosses.trpfly !== undefined && lastResult.combatResult.defenderLosses.trpfly > 0 && (
                      <Text color="cyan">  Archers: -{lastResult.combatResult.defenderLosses.trpfly}</Text>
                    )}
                    {lastResult.combatResult.defenderLosses.trpsea !== undefined && lastResult.combatResult.defenderLosses.trpsea > 0 && (
                      <Text color="cyan">  Catapults: -{lastResult.combatResult.defenderLosses.trpsea}</Text>
                    )}
                  </Box>
                )}
              </Box>
            )}

            {/* Spell Result Section */}
            {lastResult.spellResult && (
              <Box marginTop={1} flexDirection="column">
                <Text bold color={lastResult.spellResult.success ? 'magenta' : 'red'}>
                  ━━ Spell: {lastResult.spellResult.success ? 'SUCCESS' : 'FAILED'}
                  {lastResult.spellResult.castCount && lastResult.spellResult.castCount > 1
                    ? ` (${lastResult.spellResult.castCount}x)`
                    : ''} ━━
                </Text>
                {lastResult.spellResult.resourcesGained && (
                  <Box flexDirection="column">
                    {lastResult.spellResult.resourcesGained.gold !== undefined && lastResult.spellResult.resourcesGained.gold > 0 && (
                      <Text color="yellow">  Gold: +{lastResult.spellResult.resourcesGained.gold.toLocaleString()}</Text>
                    )}
                    {lastResult.spellResult.resourcesGained.food !== undefined && lastResult.spellResult.resourcesGained.food > 0 && (
                      <Text color="yellow">  Food: +{lastResult.spellResult.resourcesGained.food.toLocaleString()}</Text>
                    )}
                    {lastResult.spellResult.resourcesGained.runes !== undefined && lastResult.spellResult.resourcesGained.runes > 0 && (
                      <Text color="magenta">  Runes: +{lastResult.spellResult.resourcesGained.runes.toLocaleString()}</Text>
                    )}
                  </Box>
                )}
                {lastResult.spellResult.effectApplied && (
                  <Text color="cyan">
                    Effect: {lastResult.spellResult.effectApplied}
                    {lastResult.spellResult.effectDuration && ` (${lastResult.spellResult.effectDuration} turns)`}
                  </Text>
                )}
                {lastResult.spellResult.goldStolen !== undefined && lastResult.spellResult.goldStolen > 0 && (
                  <Text color="yellow">Gold stolen: +{lastResult.spellResult.goldStolen.toLocaleString()}</Text>
                )}
                {lastResult.spellResult.foodDestroyed !== undefined && lastResult.spellResult.foodDestroyed > 0 && (
                  <Text color="red">Enemy food destroyed: {lastResult.spellResult.foodDestroyed.toLocaleString()}</Text>
                )}
                {lastResult.spellResult.wizardsLost !== undefined && lastResult.spellResult.wizardsLost > 0 && (
                  <Text color="red">Wizards lost: -{lastResult.spellResult.wizardsLost}</Text>
                )}
                {lastResult.spellResult.troopsDestroyed && Object.values(lastResult.spellResult.troopsDestroyed).some((v) => v && v > 0) && (
                  <Box flexDirection="column">
                    <Text color="cyan">Enemy troops destroyed:</Text>
                    {lastResult.spellResult.troopsDestroyed.trparm !== undefined && lastResult.spellResult.troopsDestroyed.trparm > 0 && (
                      <Text color="cyan">  Infantry: -{lastResult.spellResult.troopsDestroyed.trparm}</Text>
                    )}
                    {lastResult.spellResult.troopsDestroyed.trplnd !== undefined && lastResult.spellResult.troopsDestroyed.trplnd > 0 && (
                      <Text color="cyan">  Cavalry: -{lastResult.spellResult.troopsDestroyed.trplnd}</Text>
                    )}
                    {lastResult.spellResult.troopsDestroyed.trpfly !== undefined && lastResult.spellResult.troopsDestroyed.trpfly > 0 && (
                      <Text color="cyan">  Archers: -{lastResult.spellResult.troopsDestroyed.trpfly}</Text>
                    )}
                    {lastResult.spellResult.troopsDestroyed.trpsea !== undefined && lastResult.spellResult.troopsDestroyed.trpsea > 0 && (
                      <Text color="cyan">  Catapults: -{lastResult.spellResult.troopsDestroyed.trpsea}</Text>
                    )}
                  </Box>
                )}
                {lastResult.spellResult.buildingsDestroyed && Object.values(lastResult.spellResult.buildingsDestroyed).some((v) => v && v > 0) && (
                  <Box flexDirection="column">
                    <Text color="red">Enemy buildings destroyed:</Text>
                    {lastResult.spellResult.buildingsDestroyed.bldcash !== undefined && lastResult.spellResult.buildingsDestroyed.bldcash > 0 && (
                      <Text color="red">  Markets: -{lastResult.spellResult.buildingsDestroyed.bldcash}</Text>
                    )}
                    {lastResult.spellResult.buildingsDestroyed.bldtrp !== undefined && lastResult.spellResult.buildingsDestroyed.bldtrp > 0 && (
                      <Text color="red">  Barracks: -{lastResult.spellResult.buildingsDestroyed.bldtrp}</Text>
                    )}
                    {lastResult.spellResult.buildingsDestroyed.bldcost !== undefined && lastResult.spellResult.buildingsDestroyed.bldcost > 0 && (
                      <Text color="red">  Exchanges: -{lastResult.spellResult.buildingsDestroyed.bldcost}</Text>
                    )}
                    {lastResult.spellResult.buildingsDestroyed.bldfood !== undefined && lastResult.spellResult.buildingsDestroyed.bldfood > 0 && (
                      <Text color="red">  Farms: -{lastResult.spellResult.buildingsDestroyed.bldfood}</Text>
                    )}
                    {lastResult.spellResult.buildingsDestroyed.bldwiz !== undefined && lastResult.spellResult.buildingsDestroyed.bldwiz > 0 && (
                      <Text color="red">  Towers: -{lastResult.spellResult.buildingsDestroyed.bldwiz}</Text>
                    )}
                  </Box>
                )}
              </Box>
            )}

            <Box marginTop={1}>
              <Text color="gray">
                [Esc] {selectedTargetId ? 'attack again' : 'continue'}
              </Text>
            </Box>
          </Box>
        )}

        <Box marginTop={1}>
          <Text color="gray">[q] quit game</Text>
        </Box>
      </Box>
    );
  }

  // Shop Phase
  if (round.phase === 'shop') {
    // Show market in shop phase
    if (view === 'market') {
      return (
        <Box flexDirection="column" padding={1}>
          <EmpireStatus empire={empire} round={round} />
          <Box marginTop={1}>
            <MarketView
              empire={empire}
              phase={round.phase}
              marketPrices={marketPrices}
              shopStock={shopStock}
              onTransaction={onMarketTransaction}
              onClose={() => setView('shop')}
            />
          </Box>
        </Box>
      );
    }

    return (
      <Box flexDirection="column" padding={1}>
        <EmpireStatus empire={empire} round={round} />

        <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
          <Text bold color="yellow">Shop Phase - Round {round.number}</Text>

          {draftOptions && draftOptions.length > 0 ? (
            <DraftPicker
              options={draftOptions}
              onSelect={handleDraftSelect}
              onSkip={handleShopDone}
              onMarket={() => setView('market')}
            />
          ) : (
            <Box flexDirection="column" marginTop={1}>
              <Text color="gray">No draft options remaining.</Text>
              <ShopDonePrompt onDone={handleShopDone} onMarket={() => setView('market')} />
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  // Bot Phase
  if (round.phase === 'bot') {
    return (
      <Box flexDirection="column" padding={1} alignItems="center">
        <Text bold color="red">Bot Phase - Round {round.number}</Text>
        <Box marginTop={1}>
          <Text color="gray">The enemy empires are taking their turns...</Text>
        </Box>
        <Box marginTop={1}>
          <BotPhasePrompt onExecute={handleBotPhase} />
        </Box>
      </Box>
    );
  }

  // Complete phase
  return (
    <Box flexDirection="column" padding={1} alignItems="center">
      <Text bold color="yellow">Game Complete!</Text>
      <Text>Final Networth: {empire.networth.toLocaleString()}</Text>
      <Text color="gray">[q] to quit</Text>
    </Box>
  );
}

// Helper component for shop done
function ShopDonePrompt({ onDone, onMarket }: { onDone: () => void; onMarket: () => void }) {
  useInput((input, key) => {
    if (key.return) {
      onDone();
    } else if (input === 'p' || input === 'm') {
      onMarket();
    }
  });

  return (
    <Box flexDirection="column">
      <Text color="gray">[p] market (better prices!) • [Enter] proceed to bot phase</Text>
    </Box>
  );
}

// Helper component for bot phase
function BotPhasePrompt({ onExecute }: { onExecute: () => void }) {
  useInput((_, key) => {
    if (key.return) {
      onExecute();
    }
  });

  return <Text color="cyan">[Enter] execute bot turns</Text>;
}
