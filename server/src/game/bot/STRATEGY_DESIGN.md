# Bot Strategy Design Document

## Human Player Strategy Patterns

Based on analysis of experienced Promisance players, here are the core patterns that drive successful play:

### 1. The Core Game Loop

Every strategy follows the same fundamental loop:

```
ATTACK → BUILD → PRODUCE → REPEAT
```

1. **Attack Phase**: Use attacks to gain land (the primary growth resource)
   - Continue attacking until health drops below ~70%
   - Or until attacks start failing (opponent too strong)

2. **Build Phase**: Convert new land into buildings
   - Each strategy has specific building ratios
   - Buildings enable production

3. **Produce Phase**: Use turns for primary economic activity
   - Farm (food), Cash (gold), Industry (troops), or Meditate (runes)
   - Production recovers health over time

4. **Repeat**: When health recovers, attack again

### 2. Strategy Archetypes

Human players pick a strategy at game start and commit to it. Each has:
- **Optimal Race**: Race bonuses align with strategy
- **Optimal Era**: Era bonuses maximize production
- **Building Ratio**: Specific building distribution
- **Turn Usage**: Primary turn action

| Strategy | Best Races | Best Era | Primary Buildings | Turn Action |
|----------|------------|----------|-------------------|-------------|
| Farmer | Gremlin (+18% food) | Any | 90% Farms, 10% Towers | Farm |
| Casher | Gnome (+10% income, +24% market) | Any | 60% Markets, 30% Farms | Cash |
| Indy | Dwarf (+12%), Goblin (+14%) | Future (+15% industry) | 85% Barracks, 15% Farms | Industry |
| Mage | Elf (+18%), Drow (+18% magic) | Past (+20% runes) | 80% Towers, 20% Farms | Meditate |
| Attacker | Orc (+16% off, +22% explore), Troll (+24% off) | Future (+80% explore) | 60% Barracks, 30% Farms | Explore + Attack |

### 3. Land is the Foundation

**Key insight**: Every strategy guide starts with "you need a lot of land."

Land enables everything:
- More buildings → more production
- More production → more resources
- More resources → more troops → more attacks → more land

**Two ways to gain land:**

| Method | Effect | Best When |
|--------|--------|-----------|
| **Attack** | Takes land FROM opponent (zero-sum) | Strong enough to win, want to weaken enemy |
| **Explore** | Creates NEW land (grows pool) | Not strong enough to attack, or want safe growth |

Both are important! Explore is:
- Safer (no risk of losing troops)
- Scales with era (Future = +80% explore!)
- Has diminishing returns (more land = slower explore)
- Should be used to supplement attacks, not replace them

Players prioritize land acquisition aggressively in early game through BOTH methods.

### 4. Health as a Tempo Resource

Health gates the attack cycle:
- Attacks cost health (5 per attack in Rogue)
- Below ~70% health, players switch to production
- Production turns regenerate health (2 per turn)
- When health is high again, resume attacking

This creates natural attack windows and recovery phases.

### 5. Building Ratios are Critical

Experienced players know exact ratios:
- Farmer: 95% farms is not arbitrary - it maximizes food/turn
- Casher: 45/45 huts/markets balances population and income
- Indy: 85% barracks maximizes troop production

**Buildings are the strategy**. A casher with 50% barracks is doing it wrong.

### 6. Era Advancement is Strategic

- Farmers need Present ASAP (+15% food)
- Cashers/Indys need Future ASAP (+15% income/industry)
- Mages stay in Past (+20% mana)

Era change costs runes and has a cooldown, so it's an early investment.

### 7. Defensive Minimum

Every guide mentions: "cast spell shield before you log off."

Players maintain a defensive baseline even in economic strategies.

---

## Promisance Rogue Differences

Rogue is single-player roguelike vs bots, with key differences:

| Aspect | Multiplayer | Rogue |
|--------|-------------|-------|
| Opponents | Other players | 4 AI bots |
| Sessions | Login whenever | 10 rounds, 50 turns each |
| Market | Player-driven economy | Fixed NPC shop |
| Attacks | 2x/day attack limits | 10 attacks/round |
| Strategy Lock | Permanent race | Permanent race |
| Progression | Networth ranking | Survive + maximize networth |
| Bonuses | None | Advisors, Techs, Edicts, Policies |

### Rogue Era Modifiers (DIFFERENT from standard Promisance)

| Era | Explore | Industry | Rune Production |
|-----|---------|----------|-----------------|
| Past | +0% | -5% | **+20%** |
| Present | **+40%** | +0% | +0% |
| Future | **+80%** | **+15%** | +0% |

**Key insight**: Future is the dominant era for military strategies (huge explore bonus + industry bonus). Past is only for dedicated mages.

### Rogue Buildings

| Building | Code | Effect |
|----------|------|--------|
| Farms | bldfood | Food production (85/farm with diminishing returns) |
| Markets | bldcash | Income (+500 gold/market, increases PCI) |
| Barracks | bldtrp | Troop production (industry action) |
| Exchanges | bldcost | Reduces expenses, better market prices |
| Towers | bldwiz | Rune production (+3/tower), wizard training |

### Rogue Production Formulas

**Land Gain** (per explore turn):
```
(1 / (land * 0.00022 + 0.25)) * 20 * explore_modifier * era_modifier
```
At 2000 land: ~31 land/turn. At 10000 land: ~7 land/turn. Diminishing returns!

**Troop Production** (per industry turn):
```
barracks * 0.4 * industry_modifier * era_modifier * allocation%
```
Production rates: Infantry 1.2x, Cavalry 0.6x, Air 0.3x, Sea 0.2x

**Food Production** (per turn):
```
(10 * freeland) + (farms * 85 * sqrt(1 - 0.75 * farms/land)) * foodpro_modifier
```
Diminishing returns on farm density!

**Income** (per turn):
```
((PCI * tax% * health% * peasants) + (markets * 500)) / size_bonus
```
PCI = 25 * (1 + markets/land) * income_modifier

### Key Implications for Bots

1. **No Market Selling**: Bots can't sell to generate gold like human farmers/indys
   - Must use Cash action or rely on passive income
   - Shop buying is available but limited stock

2. **Compressed Timeline**: 10 rounds vs weeks-long games
   - Strategies must execute faster
   - Less room for "slow and steady"

3. **Attack Limits**: 10 attacks/round is generous
   - Bots should use most/all attacks when advantageous
   - Unlike multiplayer where attacks are precious

4. **Draft System**: Advisors/Techs change strategy viability
   - Bots don't draft (currently)
   - But player does, so bots face varied player builds

---

## Proposed Bot Strategy Framework

### Core Principle: Bots Should Play Like Humans

Instead of weighted random actions, bots should:
1. Have a committed strategy (race + building ratio + turn priority)
2. Execute the attack → build → produce loop
3. Make decisions based on game state, not random rolls

### Strategy Execution Model

```typescript
interface BotStrategy {
  // Identity
  name: string;
  preferredRaces: Race[];
  preferredEra: Era;

  // Building target ratios (must sum to 100)
  buildingRatio: {
    bldfood: number;  // Farms
    bldcash: number;  // Markets
    bldtrp: number;   // Barracks
    bldwiz: number;   // Towers
    bldcost: number;  // Exchanges
  };

  // Turn allocation priorities (in order of preference)
  turnPriority: TurnAction[];  // e.g., ['industry', 'cash', 'farm']

  // Land acquisition behavior
  attackHealthThreshold: number;  // Stop attacking below this (e.g., 70)
  minPowerRatioToAttack: number;  // Don't attack if weaker than this
  exploreTurnsPerRound: number;   // Base explore turns to use (5-15 typical)
  exploreBeforeAttack: boolean;   // Some bots explore first, others attack first

  // Industry allocation (troop production mix, must sum to 100)
  industryAllocation: IndustryAllocation;

  // Spell behavior
  maintainShield: boolean;        // Always keep shield up?
  useOffensiveSpells: boolean;    // Cast attack spells instead of physical?
  preferredOffensiveSpells: SpellType[];  // e.g., ['blast', 'storm']
}
```

**Explore turns** vary by strategy:
- **Locust**: 15-20 turns/round (land maximizer)
- **Vask**: 5-10 turns/round (prefers attacking)
- **Fortress/Merchant**: 10-15 turns/round (safer growth)
- **Mage**: 5 turns/round (needs turns for meditate)

### Phase-Based Decision Making

Each round, bot executes phases in order:

```
PHASE 1: ERA CHECK
  - If not in preferred era and can afford Gate spell → cast Gate

PHASE 2: LAND ACQUISITION PHASE
  - Goal: Gain as much land as possible this round

  ATTACK SUB-PHASE:
  - While health > threshold AND attacks remaining AND valid targets:
    - Select weakest viable target
    - Execute attack
    - If attack fails or health low, stop attacking

  EXPLORE SUB-PHASE:
  - Use some turns to explore (especially in Future era)
  - More aggressive explorers (Locust) use more explore turns
  - Defensive bots (Fortress, Merchant) rely more on explore than attack

PHASE 3: BUILD PHASE
  - Calculate current building ratios vs target ratios
  - Build toward target ratios using available freeland
  - Priority: Get buildings up BEFORE production phase

PHASE 4: PRODUCTION PHASE
  - Use remaining turns on primary turn action (industry/farm/cash/meditate)
  - Intersperse with secondary actions if resources critically low
  - Health regenerates during production (2 per turn)

PHASE 5: DEFENSE CHECK
  - If no shield active and have runes/wizards → cast Shield
```

**Key insight**: Land acquisition (attack + explore) should happen BEFORE building and production. More land → more buildings → more production per turn.

### Seven Bot Strategies (Rogue-Optimized)

Each strategy is optimized for Rogue's mechanics, especially the powerful Future era bonuses.

#### 1. General Vask (Aggressive Attacker)
- **Race**: Orc (+16% offense, +22% explore) or Troll (+24% offense)
- **Era**: Future (+80% explore, +15% industry)
- **Buildings**: 65% Barracks, 25% Farms, 10% Towers
- **Turns**: Attack (use all 10) → Explore (5-8) → Industry → Farm
- **Attack**: Aggressive (attacks at 60% health, 0.8x power ratio acceptable)
- **Explore**: 5-8 turns/round (supplement attacks, benefit from Future bonus)
- **Industry**: 45% Infantry, 45% Cavalry, 10% Air
- **Goal**: Dominate through military pressure, take player's land

#### 2. Grain Mother (Survival Farmer)
- **Race**: Gremlin (+18% food production, +14% food consumption reduction)
- **Era**: Present (+40% explore) - safe land growth
- **Buildings**: 85% Farms, 10% Towers, 5% Barracks
- **Turns**: Explore (10-12) → Farm → Cash
- **Attack**: Very conservative (only at 90% health, 1.5x advantage required)
- **Explore**: 10-12 turns/round (primary land source - avoids combat)
- **Industry**: 90% Infantry (cheap militia for defense)
- **Goal**: Survive through food surplus, grow via explore, build networth passively

#### 3. Archon Nyx (Battle Mage)
- **Race**: Elf (+18% magic, +12% runes) or Drow (+18% magic, +6% runes)
- **Era**: Past (+20% rune production)
- **Buildings**: 75% Towers, 20% Farms, 5% Barracks
- **Turns**: Meditate → Explore (5) → Farm → Spell attacks
- **Attack**: Prefers magical combat (Fight spell uses attack slot, Blast/Storm for damage)
- **Explore**: 5 turns/round (needs turns for meditate)
- **Industry**: 60% Air, 30% Infantry, 10% Cavalry
- **Goal**: Harass through spells, maintain spell shield, win through attrition

#### 4. Iron Baron (Industrial Tank)
- **Race**: Dwarf (+12% industry, +16% defense, +16% building) or Goblin (+14% industry)
- **Era**: Future (+15% industry, +80% explore)
- **Buildings**: 80% Barracks, 15% Farms, 5% Exchanges
- **Turns**: Explore (8-10) → Industry → Cash → Farm
- **Attack**: Patient (rounds 1-4: build. Rounds 5+: attack with overwhelming force)
- **Explore**: 8-10 turns/round (Future bonus makes this efficient)
- **Industry**: 70% Cavalry, 25% Infantry, 5% Air (tank-heavy)
- **Goal**: Build unstoppable army through land→barracks→industry, crush late game

#### 5. The Locust (Land Rush)
- **Race**: Orc (+22% explore, +16% offense) or Troll (+14% explore, +24% offense)
- **Era**: Future (+80% explore!)
- **Buildings**: 55% Barracks, 35% Farms, 10% Towers
- **Turns**: Explore (15-20!) → Attack → Industry
- **Attack**: Opportunistic (attacks weak targets for land, low threshold)
- **Explore**: 15-20 turns/round (PRIMARY land source - maximizes Future bonus)
- **Industry**: 50% Infantry, 30% Air, 20% Cavalry
- **Goal**: Maximize land through massive explore + raids, outgrow everyone

#### 6. Shadow Merchant (Economic)
- **Race**: Gnome (+10% income, +24% market, +6% expense reduction)
- **Era**: Present (+40% explore) or Future (+80% explore)
- **Buildings**: 55% Markets, 30% Farms, 10% Barracks, 5% Exchanges
- **Turns**: Explore (10-12) → Cash → Farm
- **Attack**: Minimal (only attacks if 2:1 advantage and needs building space)
- **Explore**: 10-12 turns/round (safe growth, avoids military conflict)
- **Industry**: 60% Infantry, 40% Cavalry
- **Goal**: Win through pure networth, avoid combat, grow via explore

#### 7. The Fortress (Defensive Wall)
- **Race**: Dwarf (+16% defense, +16% building) or Human (balanced)
- **Era**: Present (balanced bonuses)
- **Buildings**: 45% Barracks, 35% Farms, 15% Towers, 5% Exchanges
- **Turns**: Explore (8-10) → Industry → Farm → Meditate (for shields)
- **Attack**: Almost never (only retaliation or if vastly superior)
- **Explore**: 8-10 turns/round (safe growth, doesn't want to provoke)
- **Industry**: 40% Cavalry (high defense), 40% Infantry, 20% Sea
- **Goal**: Be too costly to attack, survive to end, win through sustained networth

---

## Implementation Phases

### Phase 1: Strategy Commitment
- Replace weighted random with committed strategies
- Each bot picks a strategy based on archetype
- Strategy determines all building/turn decisions

### Phase 2: Loop Execution
- Implement attack → build → produce loop
- Health-gated attack windows
- Building toward target ratios

### Phase 3: Situational Awareness
- Track player strength relative to self
- Adjust aggression based on standings
- Gang up on leader if far ahead

### Phase 4: Personality Variation
- Add variance within strategies (slightly different ratios)
- Some bots more patient, some more aggressive
- Create distinct "personalities" within same strategy

---

## Success Metrics

Bots should feel like:
1. **Purposeful**: Actions clearly work toward a goal
2. **Threatening**: Player should feel pressure from bot attacks
3. **Distinct**: Each bot plays noticeably differently
4. **Beatable**: Player skill should enable victory
5. **Unpredictable**: Not perfectly predictable patterns
