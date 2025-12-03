# Promisance Rogue - Game Guide

Quick reference for game mechanics and strategies.

---

## Game Overview

- **Rounds**: 10 total
- **Turns per round**: 50
- **Opponents**: 4 AI bots
- **Goal**: Highest networth or eliminate all opponents

### Starting Resources

| Resource | Amount |
|----------|--------|
| Land | 2,000 |
| Gold | 50,000 |
| Food | 10,000 |
| Runes | 500 |
| Peasants | 500 |
| Health | 100 |

### Starting Buildings

| Building | Count |
|----------|-------|
| Markets | 50 |
| Barracks | 50 |
| Exchanges | 25 |
| Farms | 100 |
| Wizard Towers | 25 |

### Starting Troops

| Unit | Count |
|------|-------|
| Infantry | 100 |
| Land | 20 |
| Air | 10 |
| Sea | 5 |
| Wizards | 10 |

---

## Races

| Race | Off | Def | Build | Exps | Magic | Ind | Inc | Expl | Mkt | Food+ | Food- | Rune |
|------|-----|-----|-------|------|-------|-----|-----|------|-----|-------|-------|------|
| Human | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Elf | -14 | -2 | -10 | 0 | +18 | -12 | +2 | +12 | 0 | -6 | 0 | +12 |
| Dwarf | +6 | +16 | +16 | -8 | -16 | +12 | 0 | -18 | -8 | 0 | 0 | 0 |
| Troll | +24 | -10 | +8 | 0 | -12 | 0 | +4 | +14 | -12 | -8 | 0 | -8 |
| Gnome | -16 | +10 | 0 | +6 | 0 | -10 | +10 | -12 | +24 | 0 | 0 | -12 |
| Gremlin | +10 | -6 | 0 | 0 | -10 | -14 | -20 | 0 | +8 | +18 | +14 | 0 |
| Orc | +16 | 0 | +4 | -14 | -4 | +8 | 0 | +22 | 0 | -8 | -10 | -14 |
| Drow | +14 | +6 | -12 | -10 | +18 | 0 | 0 | -16 | 0 | -6 | 0 | +6 |
| Goblin | -18 | -16 | 0 | +18 | 0 | +14 | 0 | 0 | -6 | 0 | +8 | 0 |

**Legend**: Off=Offense, Def=Defense, Build=Building cost, Exps=Expenses, Ind=Industry, Inc=Income, Expl=Explore, Mkt=Market, Food+=Production, Food-=Consumption, Rune=Rune production

---

## Eras

| Era | Explore | Industry | Rune Production |
|-----|---------|----------|-----------------|
| Past | 0% | -5% | +20% |
| Present | +40% | 0% | 0% |
| Future | +80% | +15% | 0% |

- Can only attack empires in the **same era** (unless using Gate spell)
- Era change has 1-round cooldown

---

## Units

### Cost & Upkeep

| Unit | Buy Price | Upkeep/turn |
|------|-----------|-------------|
| Infantry | 500 | 1.0 |
| Land | 1,000 | 2.5 |
| Air | 2,000 | 4.0 |
| Sea | 3,000 | 7.0 |
| Wizard | - | 0.5 |

### Combat Stats by Era [Offense, Defense]

| Unit | Past | Present | Future |
|------|------|---------|--------|
| Infantry | [1, 2] | [2, 1] | [1, 2] |
| Land | [3, 2] | [2, 6] | [5, 2] |
| Air | [7, 5] | [5, 3] | [6, 3] |
| Sea | [7, 6] | [6, 8] | [7, 7] |
| Wizard | [3, 3] | [3, 3] | [3, 3] |

---

## Buildings

| Building | Function | Production |
|----------|----------|------------|
| Markets | Gold income | 500 gold/turn |
| Barracks | Troop production | Enables industry |
| Exchanges | Reduce expenses | Better market prices |
| Farms | Food production | 85 food/turn |
| Wizard Towers | Rune production | Spell power |

**Building Cost**: 1,500 + (land × 0.05) gold

---

## Resources

### Income
- **Gold**: (PCI × tax% × health% × peasants) + (markets × 500)
- **PCI**: 25 × (1 + markets/land)
- **Food**: (freeland × 10) + (farms × 85)
- **Runes**: Based on wizard towers + magic modifier

### Food Consumption (per unit/turn)
| Unit | Rate |
|------|------|
| Peasant | 0.01 |
| Infantry | 0.05 |
| Land | 0.03 |
| Air | 0.02 |
| Sea | 0.01 |
| Wizard | 0.25 |

### Bank
- Savings interest: 4%/round
- Loan interest: 7.5%/round

---

## Spells

### Self Spells (2 turns each)

| Spell | Cost× | Effect |
|-------|-------|--------|
| Shield | 4.9 | Block spell damage until end of round |
| Food | 17 | Generate food (wizards × magic × 50) |
| Cash | 15 | Generate gold (wizards × magic × 100) |
| Runes | 12 | Generate runes (20 + towers×0.5) × magic |
| Gate | 20 | Attack any era this round |
| Advance | 47.5 | Move to next era |
| Regress | 20 | Move to previous era |

### Offensive Spells (2 turns each, -5 health)

| Spell | Cost× | Threshold | Effect | Shielded |
|-------|-------|-----------|--------|----------|
| Spy | 1.0 | 1.0 | Reveal target stats | Same |
| Blast | 2.5 | 1.15 | 3% troops destroyed | 1% |
| Storm | 7.25 | 1.21 | 9% food, 13% gold | 3% food, 4% gold |
| Struct | 18 | 1.70 | 3% buildings destroyed | 1% |
| Steal | 25.75 | 1.75 | 10-15% gold stolen | 3-5% |
| Fight | 22.5 | 2.20 | Buildings + land taken | Reduced |

**Spell Cost**: (land×0.1 + 100 + towers×0.2) × Cost×

**Threshold**: Wizard power ratio needed for success. Failure = lose 1-5% wizards.

---

## Advisors

Maximum 3 advisors per game.

### Common (60% drop rate)

| Advisor | Effect |
|---------|--------|
| Grain Merchant | +10% food production |
| Tax Collector | +10% gold income |
| Drill Sergeant | +10% troop production |
| Land Surveyor | +10% land from exploring |
| Fertile Frontier | +15% food per Exploration mastery |
| Trade Routes | +15% income per Exploration mastery |
| Mystic Forges | +15% troops per Mysticism mastery |
| Arcane Agriculture | +15% food per Mysticism mastery |
| Dabbler's Luck | +10% all if 2+ unique masteries |

### Uncommon (25% drop rate)

| Advisor | Effect |
|---------|--------|
| War Council | +15% attack power |
| Stone Mason | -15% building costs |
| Wizard Conclave | -20% spell rune costs |
| Market Insider | +20% market prices |
| Mactalon | -25% wizard ratio for spells |
| Bella of Doublehomes | 3× peasants per land |
| Frontier Scout | 2× land from exploring |
| Royal Banker | 2× bank interest |
| War Economist | +10% offense per Commerce mastery |
| Mercenary Captain | +15% troops per Commerce mastery |
| Battle Mages | +10% spell power per Industry mastery |
| Polymath | +5% all per unique mastery owned |
| Ground Commander | +1 off (inf/land), -2 def (air/sea) |
| Sky Marshal | +1 off (air/sea), -2 def (inf/land) |
| Blitzkrieg Tactician | +1 off (inf/air), -2 def (land/sea) |
| Heavy Arms Dealer | +1 off (land/sea), -2 def (inf/air) |
| Amphibious Admiral | +1 off (inf/sea), -2 def (land/air) |
| Mechanized General | +1 off (land/air), -2 def (inf/sea) |

### Rare (12% drop rate)

| Advisor | Effect |
|---------|--------|
| Grand General | +25% attack and defense |
| Archmage | +30% wizard power |
| Royal Architect | +1 building/turn, -25% cost |
| Grain Speculator | 2× food sell price |
| Matthias | +25% attack power |
| Cregga Rose Eyes | +25% defense power |
| Grumm the Farmer | +50% food production |
| Methuselah the Wise | +50% rune production |
| Brome the Healer | +2 health/turn |
| Perigord the Protector | -50% troop losses |
| Warmaster | +1 extra attack per round |
| War Profiteer | Troops during farm action |
| Generalist's Edge | +25% off/def if 3+ masteries |
| Jack of All Trades | +20% all if all 5 masteries |

### Legendary (3% drop rate)

| Advisor | Effect |
|---------|--------|
| Dragon Rider | +50% aircraft off, +25% all off |
| Time Weaver | Permanent Gate effect |
| Empire Builder | +5 actions per round |
| Martin the Warrior | +5% offense per attack this round |
| Arcane Ward | Permanent magic shield |

---

## Masteries

Stackable bonuses up to level 5. Select in draft to increase level.

| Mastery | Action | Bonus |
|---------|--------|-------|
| Farming | Farm | Food production |
| Commerce | Cash | Gold income |
| Exploration | Explore | Land gained |
| Industry | Industry | Troop production |
| Mysticism | Meditate | Rune production |

**Bonus per level**:
- Levels 1-3: +10% each
- Levels 4-5: +15% each
- **Maximum**: 60% at level 5

---

## Shop/Draft System

- Appears at game start and after rounds 1, 3, 5, 7, 9
- Draft offers: 1-2 advisors + 2-3 masteries/edicts
- **Reroll cost**: 20% of networth in gold
- **Max rerolls**: 2 per shop phase

### Shop Market Prices (better than normal)

| Item | Buy | Sell |
|------|-----|------|
| Food | 20 | 15 |
| Troops | 70% of base | 50% of base |
| Runes | 150 | 120 |

---

## Combat

- **Win threshold**: Attacker needs 5% more power
- **Turns per attack**: 2
- **Health cost**: -5 per attack (net -3 after regen)
- **Max attacks/round**: 10
- **No attacks**: Round 1

### Attack Types

| Type | Units Used | Loss Rate |
|------|------------|-----------|
| Standard | All | Higher |
| Infantry Only | Infantry | Lower |
| Land Only | Land | Lower |
| Air Only | Air | Lower |
| Sea Only | Sea | Lower |

### Building Capture (on victory)

| Building | Destroyed | Captured |
|----------|-----------|----------|
| Markets | 7% | 70% |
| Barracks | 7% | 50% |
| Exchanges | 7% | 70% |
| Farms | 7% | 30% |
| Wizard Towers | 7% | 60% |
| Free Land | 10% | 0% |

---

## Turn Actions

| Action | Turns | Effect |
|--------|-------|--------|
| Explore | 1 | Gain land (10 + bonuses) |
| Farm | 1 | Boost food production |
| Cash | 1 | Boost gold income |
| Meditate | 1 | Boost rune production |
| Industry | 1 | Boost troop production |
| Build | 1 | Construct buildings |
| Attack | 2 | Combat enemy empire |
| Spell | 2 | Cast spell |

---

## Networth Calculation

| Component | Value |
|-----------|-------|
| Infantry | ×1 |
| Land units | ×2 |
| Air units | ×4 |
| Sea units | ×6 |
| Wizards | ×2 |
| Peasants | ×3 |
| Land | ×500 |
| Free land | ×100 |
| Cash | (gold + bank/2 - loan×2) / 2500 |

---

## Quick Tips

1. **Early game**: Focus on economy (farms, markets) before military
2. **Era choice**: Future for expansion, Past for magic
3. **Shields**: Cast before ending your turn to block bot spells
4. **Mastery stacking**: Same mastery multiple times = higher bonus
5. **Unit composition**: Match your era's strengths (Sea in Present, Air in Past)
6. **Advisors**: Synergies with masteries can be powerful
7. **Health management**: Keep above 20 to act, regenerates +1/turn
