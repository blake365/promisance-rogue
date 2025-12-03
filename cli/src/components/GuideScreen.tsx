import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

type GuideSection =
  | 'menu'
  | 'basics'
  | 'races'
  | 'eras'
  | 'units'
  | 'buildings'
  | 'resources'
  | 'spells'
  | 'advisors'
  | 'masteries'
  | 'combat'
  | 'tips';

interface SectionInfo {
  id: GuideSection;
  title: string;
  key: string;
}

const SECTIONS: SectionInfo[] = [
  { id: 'basics', title: 'Game Basics', key: '1' },
  { id: 'races', title: 'Races', key: '2' },
  { id: 'eras', title: 'Eras', key: '3' },
  { id: 'units', title: 'Units', key: '4' },
  { id: 'buildings', title: 'Buildings', key: '5' },
  { id: 'resources', title: 'Resources', key: '6' },
  { id: 'spells', title: 'Spells', key: '7' },
  { id: 'advisors', title: 'Advisors', key: '8' },
  { id: 'masteries', title: 'Masteries', key: '9' },
  { id: 'combat', title: 'Combat', key: '0' },
  { id: 'tips', title: 'Tips', key: 't' },
];

interface Props {
  onClose: () => void;
}

// Get max pages for sections that have multiple pages
function getMaxPages(section: GuideSection): number {
  switch (section) {
    case 'races': return 3;
    case 'spells': return 2;
    case 'advisors': return 4;
    default: return 1;
  }
}

export function GuideScreen({ onClose }: Props) {
  const [section, setSection] = useState<GuideSection>('menu');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [page, setPage] = useState(0);

  // Get current section index
  const currentSectionIndex = SECTIONS.findIndex((s) => s.id === section);

  useInput((input, key) => {
    if (key.escape) {
      if (section === 'menu') {
        onClose();
      } else {
        setSection('menu');
        setPage(0);
      }
    } else if (section === 'menu') {
      // Menu navigation
      if (key.upArrow) {
        setSelectedIndex((i) => (i > 0 ? i - 1 : SECTIONS.length - 1));
      } else if (key.downArrow) {
        setSelectedIndex((i) => (i < SECTIONS.length - 1 ? i + 1 : 0));
      } else if (key.return) {
        setSection(SECTIONS[selectedIndex].id);
        setPage(0);
      } else {
        // Hotkey selection
        const idx = SECTIONS.findIndex((s) => s.key === input);
        if (idx !== -1) {
          setSection(SECTIONS[idx].id);
          setPage(0);
        }
      }
    } else {
      // Section navigation - left/right moves between sections
      if (key.leftArrow) {
        const newIndex = currentSectionIndex > 0 ? currentSectionIndex - 1 : SECTIONS.length - 1;
        setSection(SECTIONS[newIndex].id);
        setPage(0);
      } else if (key.rightArrow) {
        const newIndex = currentSectionIndex < SECTIONS.length - 1 ? currentSectionIndex + 1 : 0;
        setSection(SECTIONS[newIndex].id);
        setPage(0);
      } else if (key.upArrow) {
        // Page up within multi-page sections
        setPage((p) => Math.max(0, p - 1));
      } else if (key.downArrow) {
        // Page down within multi-page sections
        const maxPages = getMaxPages(section);
        setPage((p) => Math.min(maxPages - 1, p + 1));
      } else {
        // Hotkey to jump to section
        const idx = SECTIONS.findIndex((s) => s.key === input);
        if (idx !== -1) {
          setSection(SECTIONS[idx].id);
          setPage(0);
        }
      }
    }
  });

  if (section === 'menu') {
    return <GuideMenu selectedIndex={selectedIndex} />;
  }

  const maxPages = getMaxPages(section);
  const hasMultiplePages = maxPages > 1;

  // Get prev/next section names for hints
  const prevSection = currentSectionIndex > 0
    ? SECTIONS[currentSectionIndex - 1].title
    : SECTIONS[SECTIONS.length - 1].title;
  const nextSection = currentSectionIndex < SECTIONS.length - 1
    ? SECTIONS[currentSectionIndex + 1].title
    : SECTIONS[0].title;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Box justifyContent="space-between">
        <Text bold color="cyan">
          Guide: {SECTIONS.find((s) => s.id === section)?.title}
          {hasMultiplePages && <Text color="gray"> ({page + 1}/{maxPages})</Text>}
        </Text>
        <Text color="gray">[Esc] menu</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        {section === 'basics' && <BasicsSection />}
        {section === 'races' && <RacesSection page={page} />}
        {section === 'eras' && <ErasSection />}
        {section === 'units' && <UnitsSection />}
        {section === 'buildings' && <BuildingsSection />}
        {section === 'resources' && <ResourcesSection />}
        {section === 'spells' && <SpellsSection page={page} />}
        {section === 'advisors' && <AdvisorsSection page={page} />}
        {section === 'masteries' && <MasteriesSection />}
        {section === 'combat' && <CombatSection />}
        {section === 'tips' && <TipsSection />}
      </Box>
      <Box marginTop={1} justifyContent="space-between">
        <Text color="gray">[←] {prevSection}</Text>
        {hasMultiplePages && <Text color="yellow">[↑/↓] page</Text>}
        <Text color="gray">[→] {nextSection}</Text>
      </Box>
    </Box>
  );
}

function GuideMenu({ selectedIndex }: { selectedIndex: number }) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Text bold color="cyan">Game Guide</Text>
      <Text color="gray">Navigate with arrows, Enter to select, or press hotkey</Text>
      <Box marginTop={1} flexDirection="column">
        {SECTIONS.map((s, i) => (
          <Box key={s.id}>
            <Text color={selectedIndex === i ? 'cyan' : 'gray'}>
              {selectedIndex === i ? '▶ ' : '  '}
            </Text>
            <Text color="yellow">[{s.key}]</Text>
            <Text> </Text>
            <Text color={selectedIndex === i ? 'white' : 'gray'} bold={selectedIndex === i}>
              {s.title}
            </Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text color="gray">[Esc] close guide</Text>
      </Box>
    </Box>
  );
}

function BasicsSection() {
  return (
    <Box flexDirection="column">
      <Text bold color="yellow">Game Structure</Text>
      <Text>• 10 rounds, 50 turns per round</Text>
      <Text>• 4 AI bot opponents</Text>
      <Text>• Goal: Highest networth or eliminate all enemies</Text>
      <Text></Text>
      <Text bold color="yellow">Starting Resources</Text>
      <Text>• Land: 2,000 | Gold: 50,000 | Food: 10,000</Text>
      <Text>• Runes: 500 | Peasants: 500 | Health: 100</Text>
      <Text></Text>
      <Text bold color="yellow">Game Flow</Text>
      <Text>• Player Phase → Shop Phase → Bot Phase → Repeat</Text>
      <Text>• Shop appears after each round</Text>
      {/* <Text>• Final round (10) has no bot phase</Text> */}
    </Box>
  );
}

interface RaceData {
  name: string;
  off: number;
  def: number;
  bld: number;
  exp: number;
  mag: number;
  ind: number;
  inc: number;
  expl: number;
  mkt: number;
  fpro: number;
  fcon: number;
  rune: number;
}

const ALL_RACES: RaceData[] = [
  { name: 'Human', off: 0, def: 0, bld: 0, exp: 0, mag: 0, ind: 0, inc: 0, expl: 0, mkt: 0, fpro: 0, fcon: 0, rune: 0 },
  { name: 'Elf', off: -14, def: -2, bld: -10, exp: 0, mag: 18, ind: -12, inc: 2, expl: 12, mkt: 0, fpro: -6, fcon: 0, rune: 12 },
  { name: 'Dwarf', off: 6, def: 16, bld: 16, exp: -8, mag: -16, ind: 12, inc: 0, expl: -18, mkt: -8, fpro: 0, fcon: 0, rune: 0 },
  { name: 'Troll', off: 24, def: -10, bld: 8, exp: 0, mag: -12, ind: 0, inc: 4, expl: 14, mkt: -12, fpro: -8, fcon: 0, rune: -8 },
  { name: 'Gnome', off: -16, def: 10, bld: 0, exp: 6, mag: 0, ind: -10, inc: 10, expl: -12, mkt: 24, fpro: 0, fcon: 0, rune: -12 },
  { name: 'Gremlin', off: 10, def: -6, bld: 0, exp: 0, mag: -10, ind: -14, inc: -20, expl: 0, mkt: 8, fpro: 18, fcon: 14, rune: 0 },
  { name: 'Orc', off: 16, def: 0, bld: 4, exp: -14, mag: -4, ind: 8, inc: 0, expl: 22, mkt: 0, fpro: -8, fcon: -10, rune: -14 },
  { name: 'Drow', off: 14, def: 6, bld: -12, exp: -10, mag: 18, ind: 0, inc: 0, expl: -16, mkt: 0, fpro: -6, fcon: 0, rune: 6 },
  { name: 'Goblin', off: -18, def: -16, bld: 0, exp: 18, mag: 0, ind: 14, inc: 0, expl: 0, mkt: -6, fpro: 0, fcon: 8, rune: 0 },
];

function formatStat(val: number): string {
  if (val === 0) return '  -';
  return (val > 0 ? '+' : '') + val.toString().padStart(2);
}

function RaceStat({ label, val }: { label: string; val: number }) {
  return (
    <Text>
      <Text color="gray">{label}: </Text>
      <Text color={val > 0 ? 'green' : val < 0 ? 'red' : 'gray'}>{formatStat(val)}</Text>
    </Text>
  );
}

function RaceCard({ race }: { race: RaceData }) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="white">{race.name}</Text>
      <Box gap={2}>
        <Box flexDirection="column">
          <RaceStat label="Offense " val={race.off} />
          <RaceStat label="Defense " val={race.def} />
          <RaceStat label="Magic   " val={race.mag} />
          <RaceStat label="Explore " val={race.expl} />
        </Box>
        <Box flexDirection="column">
          <RaceStat label="Industry" val={race.ind} />
          <RaceStat label="Income  " val={race.inc} />
          <RaceStat label="Building" val={race.bld} />
          <RaceStat label="Expenses" val={race.exp} />
        </Box>
        <Box flexDirection="column">
          <RaceStat label="Market  " val={race.mkt} />
          <RaceStat label="Food Pro" val={race.fpro} />
          <RaceStat label="Food Con" val={race.fcon} />
          <RaceStat label="Rune Pro" val={race.rune} />
        </Box>
      </Box>
    </Box>
  );
}

function RacesSection({ page }: { page: number }) {
  const racesPerPage = 3;
  const startIdx = page * racesPerPage;
  const pageRaces = ALL_RACES.slice(startIdx, startIdx + racesPerPage);

  return (
    <Box flexDirection="column">
      <Text bold color="yellow">Race Modifiers (% bonus/penalty)</Text>
      <Box marginTop={1} flexDirection="column">
        {pageRaces.map((race) => (
          <RaceCard key={race.name} race={race} />
        ))}
      </Box>
    </Box>
  );
}

function ErasSection() {
  return (
    <Box flexDirection="column">
      <Text bold color="yellow">Era Bonuses</Text>
      <Box marginTop={1} flexDirection="column">
        <Text color="gray">Era      Explore  Industry  Runes</Text>
        <Text color="gray">{'─'.repeat(35)}</Text>
        <Text><Text color="white">Past    </Text><Text color="gray">  0%</Text><Text color="red">     -5%</Text><Text color="green">     +20%</Text></Text>
        <Text><Text color="white">Present </Text><Text color="green"> +40%</Text><Text color="gray">      0%</Text><Text color="gray">       0%</Text></Text>
        <Text><Text color="white">Future  </Text><Text color="green"> +80%</Text><Text color="green">    +15%</Text><Text color="gray">       0%</Text></Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text bold color="yellow">Era Rules</Text>
        <Text>• Can only attack empires in same era</Text>
        <Text>• Gate spell allows cross-era attacks</Text>
        <Text>• Era change has 1-round cooldown</Text>
      </Box>
    </Box>
  );
}

function UnitsSection() {
  return (
    <Box flexDirection="column">
      <Text bold color="yellow">Unit Costs</Text>
      <Box marginTop={1} flexDirection="column">
        <Text color="gray">Unit       Cost    Upkeep</Text>
        <Text color="gray">{'─'.repeat(30)}</Text>
        <Text><Text color="white">Infantry  </Text><Text color="yellow"> 500</Text><Text color="red">     1.0</Text></Text>
        <Text><Text color="white">Land      </Text><Text color="yellow">1000</Text><Text color="red">     2.5</Text></Text>
        <Text><Text color="white">Air       </Text><Text color="yellow">2000</Text><Text color="red">     4.0</Text></Text>
        <Text><Text color="white">Sea       </Text><Text color="yellow">3000</Text><Text color="red">     7.0</Text></Text>
        <Text><Text color="white">Wizard    </Text><Text color="gray">   -</Text><Text color="red">     0.5</Text></Text>
      </Box>
      <Box marginTop={1}>
        <Text bold color="yellow">Combat Stats [Off/Def] by Era</Text>
      </Box>
      <Box flexDirection="column">
        <Text color="gray">Unit      Past    Present  Future</Text>
        <Text color="gray">{'─'.repeat(35)}</Text>
        <Text><Text color="white">Infantry </Text><Text> [1,2]   [2,1]    [1,2]</Text></Text>
        <Text><Text color="white">Land     </Text><Text> [3,2]   [2,6]    [5,2]</Text></Text>
        <Text><Text color="white">Air      </Text><Text> [7,5]   [5,3]    [6,3]</Text></Text>
        <Text><Text color="white">Sea      </Text><Text> [7,6]   [6,8]    [7,7]</Text></Text>
        <Text><Text color="white">Wizard   </Text><Text color="magenta"> [3,3]   [3,3]    [3,3]</Text></Text>
      </Box>
    </Box>
  );
}

function BuildingsSection() {
  return (
    <Box flexDirection="column">
      <Text bold color="yellow">Building Types</Text>
      <Box marginTop={1} flexDirection="column">
        <Text color="gray">Building     Function          Output</Text>
        <Text color="gray">{'─'.repeat(45)}</Text>
        <Text><Text color="yellow">Markets     </Text><Text>Gold income       </Text><Text color="green">500 gold/turn</Text></Text>
        <Text><Text color="red">Barracks    </Text><Text>Troop production  </Text><Text color="cyan">Enables industry</Text></Text>
        <Text><Text color="cyan">Exchanges   </Text><Text>Reduce expenses   </Text><Text color="green">Better prices</Text></Text>
        <Text><Text color="green">Farms       </Text><Text>Food production   </Text><Text color="green">85 food/turn</Text></Text>
        <Text><Text color="magenta">Wiz Towers  </Text><Text>Rune production   </Text><Text color="green">Spell power</Text></Text>
      </Box>
      <Box marginTop={1}>
        <Text bold color="yellow">Building Cost</Text>
      </Box>
      <Text>1,500 + (land × 0.05) gold per building</Text>
      <Box marginTop={1}>
        <Text bold color="yellow">Starting Buildings</Text>
      </Box>
      <Text>Markets: 50 | Barracks: 50 | Exchanges: 25</Text>
      <Text>Farms: 100 | Wizard Towers: 25</Text>
    </Box>
  );
}

function ResourcesSection() {
  return (
    <Box flexDirection="column">
      <Text bold color="yellow">Income Sources</Text>
      <Text>• Gold: Peasants (tax) + Markets (500/each)</Text>
      <Text>• Food: Free land (10/acre) + Farms (85/each)</Text>
      <Text>• Runes: Wizard towers + magic modifier</Text>
      <Box marginTop={1}>
        <Text bold color="yellow">Food Consumption (per unit/turn)</Text>
      </Box>
      <Text color="gray">Peasant: 0.01 | Infantry: 0.05 | Land: 0.03</Text>
      <Text color="gray">Air: 0.02 | Sea: 0.01 | Wizard: 0.25</Text>
      <Box marginTop={1}>
        <Text bold color="yellow">Banking</Text>
      </Box>
      <Text>• Savings: <Text color="green">+4%</Text> interest per round</Text>
      <Text>• Loans: <Text color="red">+7.5%</Text> interest per round</Text>
      <Text>• Loan payment: Automatic each turn</Text>
      <Box marginTop={1}>
        <Text bold color="yellow">Population</Text>
      </Box>
      <Text>Capacity: 100 + (land × 0.5) peasants</Text>
    </Box>
  );
}

function SpellsSection({ page }: { page: number }) {
  if (page === 0) {
    return (
      <Box flexDirection="column">
        <Text bold color="yellow">Self Spells (2 turns each)</Text>
        <Box marginTop={1} flexDirection="column">
          <Text color="gray">Spell    Cost×   Effect</Text>
          <Text color="gray">{'─'.repeat(45)}</Text>
          <Text><Text color="cyan">Shield  </Text><Text color="yellow"> 4.9×</Text><Text>  Block spell damage (1 round)</Text></Text>
          <Text><Text color="green">Food    </Text><Text color="yellow">17.0×</Text><Text>  Generate food (wiz × magic × 50)</Text></Text>
          <Text><Text color="yellow">Cash    </Text><Text color="yellow">15.0×</Text><Text>  Generate gold (wiz × magic × 100)</Text></Text>
          <Text><Text color="magenta">Runes   </Text><Text color="yellow">12.0×</Text><Text>  Generate runes</Text></Text>
          <Text><Text color="blue">Gate    </Text><Text color="yellow">20.0×</Text><Text>  Attack any era (1 round)</Text></Text>
          <Text><Text color="white">Advance </Text><Text color="yellow">47.5×</Text><Text>  Move to next era</Text></Text>
          <Text><Text color="white">Regress </Text><Text color="yellow">20.0×</Text><Text>  Move to previous era</Text></Text>
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Cost = (land×0.1 + 100 + towers×0.2) × multiplier</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold color="yellow">Offensive Spells (2 turns, -5 health)</Text>
      <Box marginTop={1} flexDirection="column">
        <Text color="gray">Spell   Cost×  Thresh  Effect          Shielded</Text>
        <Text color="gray">{'─'.repeat(55)}</Text>
        <Text><Text color="cyan">Spy    </Text><Text color="yellow"> 1.0×</Text><Text>  1.0   Reveal stats    Same</Text></Text>
        <Text><Text color="red">Blast  </Text><Text color="yellow"> 2.5×</Text><Text>  1.15  3% troops       1%</Text></Text>
        <Text><Text color="yellow">Storm  </Text><Text color="yellow"> 7.3×</Text><Text>  1.21  9%F 13%G        3%F 4%G</Text></Text>
        <Text><Text color="blue">Struct </Text><Text color="yellow">18.0×</Text><Text>  1.70  3% buildings    1%</Text></Text>
        <Text><Text color="green">Steal  </Text><Text color="yellow">25.8×</Text><Text>  1.75  10-15% gold     3-5%</Text></Text>
        <Text><Text color="magenta">Fight  </Text><Text color="yellow">22.5×</Text><Text>  2.20  Buildings+land  Reduced</Text></Text>
      </Box>
      <Box marginTop={1}>
        <Text bold color="yellow">Threshold</Text>
        <Text color="gray">: Wizard power ratio needed. Fail = lose 1-5% wizards.</Text>
      </Box>
    </Box>
  );
}

function AdvisorsSection({ page }: { page: number }) {
  if (page === 0) {
    return (
      <Box flexDirection="column">
        <Text bold color="yellow">Common Advisors (60% drop)</Text>
        <Box marginTop={1} flexDirection="column">
          <Text>• Grain Merchant: +10% food production</Text>
          <Text>• Tax Collector: +10% gold income</Text>
          <Text>• Drill Sergeant: +10% troop production</Text>
          <Text>• Land Surveyor: +10% land from exploring</Text>
          <Text>• Fertile Frontier: +15% food per Exploration mastery</Text>
          <Text>• Trade Routes: +15% income per Exploration mastery</Text>
          <Text>• Mystic Forges: +15% troops per Mysticism mastery</Text>
          <Text>• Dabbler's Luck: +10% all if 2+ unique masteries</Text>
        </Box>
      </Box>
    );
  }

  if (page === 1) {
    return (
      <Box flexDirection="column">
        <Text bold color="yellow">Uncommon Advisors (25% drop)</Text>
        <Box marginTop={1} flexDirection="column">
          <Text>• War Council: +15% attack power</Text>
          <Text>• Stone Mason: -15% building costs</Text>
          <Text>• Wizard Conclave: -20% spell costs</Text>
          <Text>• Market Insider: +20% market prices</Text>
          <Text>• Mactalon: -25% wizard ratio for spells</Text>
          <Text>• Bella of Doublehomes: 3× peasants per land</Text>
          <Text>• Frontier Scout: 2× land from exploring</Text>
          <Text>• Polymath: +5% all per unique mastery</Text>
        </Box>
      </Box>
    );
  }

  if (page === 2) {
    return (
      <Box flexDirection="column">
        <Text bold color="yellow">Rare Advisors (12% drop)</Text>
        <Box marginTop={1} flexDirection="column">
          <Text>• Grand General: +25% attack and defense</Text>
          <Text>• Archmage: +30% wizard power</Text>
          <Text>• Matthias: +25% attack power</Text>
          <Text>• Cregga: +25% defense power</Text>
          <Text>• Grumm: +50% food production</Text>
          <Text>• Methuselah: +50% rune production</Text>
          <Text>• Perigord: -50% troop losses</Text>
          <Text>• Warmaster: +1 extra attack per round</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold color="yellow">Legendary Advisors (3% drop)</Text>
      <Box marginTop={1} flexDirection="column">
        <Text>• Dragon Rider: +50% aircraft off, +25% all off</Text>
        <Text>• Time Weaver: Permanent Gate effect</Text>
        <Text>• Empire Builder: +5 actions per round</Text>
        <Text>• Martin the Warrior: +5% off per attack this round</Text>
        <Text>• Arcane Ward: Permanent magic shield</Text>
      </Box>
      <Box marginTop={1}>
        <Text bold color="yellow">Advisor Rules</Text>
        <Text>• Maximum 3 advisors per game</Text>
        <Text>• Can dismiss advisors in shop phase</Text>
      </Box>
    </Box>
  );
}

function MasteriesSection() {
  return (
    <Box flexDirection="column">
      <Text bold color="yellow">Mastery Types</Text>
      <Box marginTop={1} flexDirection="column">
        <Text color="gray">Mastery     Action    Bonus</Text>
        <Text color="gray">{'─'.repeat(35)}</Text>
        <Text><Text color="green">Farming    </Text><Text>Farm      Food production</Text></Text>
        <Text><Text color="yellow">Commerce   </Text><Text>Cash      Gold income</Text></Text>
        <Text><Text color="cyan">Exploration</Text><Text>Explore   Land gained</Text></Text>
        <Text><Text color="red">Industry   </Text><Text>Industry  Troop production</Text></Text>
        <Text><Text color="magenta">Mysticism  </Text><Text>Meditate  Rune production</Text></Text>
      </Box>
      <Box marginTop={1}>
        <Text bold color="yellow">Bonus Per Level</Text>
      </Box>
      <Text>• Levels 1-3: <Text color="green">+10%</Text> each</Text>
      <Text>• Levels 4-5: <Text color="green">+15%</Text> each</Text>
      <Text>• Maximum: <Text color="cyan">60%</Text> at level 5</Text>
      <Box marginTop={1}>
        <Text bold color="yellow">How to Level Up</Text>
      </Box>
      <Text>Select mastery in draft to increase by 1 level</Text>
      <Text>Same mastery can be picked multiple times</Text>
    </Box>
  );
}

function CombatSection() {
  return (
    <Box flexDirection="column">
      <Text bold color="yellow">Combat Basics</Text>
      <Text>• Win threshold: 5% more power than defender</Text>
      <Text>• Turns per attack: 2</Text>
      <Text>• Health cost: -5 per attack (net -3 after regen)</Text>
      <Text>• Max attacks per round: 10</Text>
      <Text>• No attacks allowed in round 1</Text>
      <Box marginTop={1}>
        <Text bold color="yellow">Attack Types</Text>
      </Box>
      <Text>• Standard: All units, higher losses</Text>
      <Text>• Single-unit (Inf/Land/Air/Sea): Lower losses</Text>
      <Box marginTop={1}>
        <Text bold color="yellow">Victory Rewards</Text>
      </Box>
      <Text>• 7-10% of defender's land captured</Text>
      <Text>• Buildings: 7% destroyed, 30-70% captured</Text>
      <Text>• Free land: 10% destroyed, 0% captured</Text>
      <Box marginTop={1}>
        <Text bold color="yellow">Power Calculation</Text>
      </Box>
      <Text>Power = Σ(units × stats) × modifier × health%</Text>
    </Box>
  );
}

function TipsSection() {
  return (
    <Box flexDirection="column">
      <Text bold color="yellow">Strategy Tips</Text>
      <Box marginTop={1} flexDirection="column">
        <Text color="green">1.</Text><Text> Early game: Focus on economy before military</Text>
        <Text color="green">2.</Text><Text> Era choice: Future for expansion, Past for magic</Text>
        <Text color="green">3.</Text><Text> Cast Shield before ending turn to block bot spells</Text>
        <Text color="green">4.</Text><Text> Stack same mastery for higher bonuses (up to 60%)</Text>
        <Text color="green">5.</Text><Text> Match units to era strengths (Sea=Present, Air=Past)</Text>
        <Text color="green">6.</Text><Text> Look for advisor-mastery synergies</Text>
        <Text color="green">7.</Text><Text> Keep health above 20 to act (regenerates +1/turn)</Text>
        <Text color="green">8.</Text><Text> Use Spy spell to scout before attacking</Text>
        <Text color="green">9.</Text><Text> Shop market has better prices than normal market</Text>
        <Text color="green">10.</Text><Text> Save bank interest is free money (4%/round)</Text>
      </Box>
    </Box>
  );
}
