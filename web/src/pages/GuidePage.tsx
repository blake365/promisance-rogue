import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Panel } from '@/components/ui';

interface Section {
  id: string;
  title: string;
  icon: string;
  content: React.ReactNode;
}

export function GuidePage() {
  const navigate = useNavigate();
  const [openSection, setOpenSection] = useState<string | null>('overview');

  const sections: Section[] = [
    {
      id: 'overview',
      title: 'Game Overview',
      icon: '🎮',
      content: (
        <div className="space-y-3 text-sm text-gray-300">
          <p>
            <strong className="text-gold">Promisance Rogue</strong> is a roguelike turn-based
            strategy game where you build and manage an empire across 10 rounds.
          </p>
          <div className="bg-game-dark rounded p-3 space-y-2">
            <p>
              <span className="text-cyan-400">Goal:</span> Build the most powerful
              empire by maximizing your networth, or eliminate all opponents.
            </p>
            <p>
              <span className="text-cyan-400">Turns:</span> You have 50 turns per
              round to take actions - explore, build, farm, and fight.
            </p>
            <p>
              <span className="text-cyan-400">Opponents:</span> 4 AI-controlled
              empires compete against you with unique personalities.
            </p>
          </div>
          <p className="text-gray-400 text-xs">
            Each game is unique - bot strategies, market prices, and draft options change every run.
          </p>
        </div>
      ),
    },
    {
      id: 'phases',
      title: 'Game Phases',
      icon: '🔄',
      content: (
        <div className="space-y-3 text-sm text-gray-300">
          <p>Each round consists of three phases:</p>
          <div className="space-y-2">
            <div className="bg-game-dark rounded p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-cyan-400 font-display">1. Player Phase</span>
                <span className="text-xs text-gray-500">(50 turns)</span>
              </div>
              <p className="text-gray-400 text-xs">
                Use your turns to take actions: explore land, collect resources,
                build structures, train troops, and attack enemies.
              </p>
            </div>
            <div className="bg-game-dark rounded p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-gold font-display">2. Shop Phase</span>
              </div>
              <p className="text-gray-400 text-xs">
                Trade at the market and choose a bonus from the draft. Buy/sell
                resources and recruit powerful advisors or unlock technologies.
              </p>
            </div>
            <div className="bg-game-dark rounded p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-red-400 font-display">3. Bot Phase</span>
              </div>
              <p className="text-gray-400 text-xs">
                AI empires take their turns. They may attack you! Check the news
                to see what happened and prepare for the next round.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'actions',
      title: 'Turn Actions',
      icon: '⚡',
      content: (
        <div className="space-y-2 text-sm">
          <p className="text-gray-400 mb-3">Each action costs turns. Choose wisely!</p>

          <div className="grid gap-2">
            <div className="flex items-start gap-2 bg-game-dark rounded p-2">
              <span className="text-land">🗺️</span>
              <div>
                <span className="text-land font-display">Explore</span>
                <span className="text-gray-500 text-xs ml-2">(1 turn)</span>
                <p className="text-gray-400 text-xs">Discover new land for your empire</p>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-game-dark rounded p-2">
              <span className="text-food">🌾</span>
              <div>
                <span className="text-food font-display">Farm</span>
                <span className="text-gray-500 text-xs ml-2">(1 turn)</span>
                <p className="text-gray-400 text-xs">Boost food production this turn</p>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-game-dark rounded p-2">
              <span className="text-gold">💰</span>
              <div>
                <span className="text-gold font-display">Cash</span>
                <span className="text-gray-500 text-xs ml-2">(1 turn)</span>
                <p className="text-gray-400 text-xs">Collect taxes from your population</p>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-game-dark rounded p-2">
              <span className="text-blue-400">🏗️</span>
              <div>
                <span className="text-blue-400 font-display">Build</span>
                <span className="text-gray-500 text-xs ml-2">(1 turn)</span>
                <p className="text-gray-400 text-xs">Construct buildings on free land</p>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-game-dark rounded p-2">
              <span className="text-cyan-400">🔨</span>
              <div>
                <span className="text-cyan-400 font-display">Industry</span>
                <span className="text-gray-500 text-xs ml-2">(1 turn)</span>
                <p className="text-gray-400 text-xs">Produce military troops</p>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-game-dark rounded p-2">
              <span className="text-runes">🔮</span>
              <div>
                <span className="text-runes font-display">Meditate</span>
                <span className="text-gray-500 text-xs ml-2">(1 turn)</span>
                <p className="text-gray-400 text-xs">Generate magical runes</p>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-game-dark rounded p-2">
              <span className="text-red-400">⚔️</span>
              <div>
                <span className="text-red-400 font-display">Attack</span>
                <span className="text-gray-500 text-xs ml-2">(2 turns)</span>
                <p className="text-gray-400 text-xs">Assault enemy empires to capture land</p>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-game-dark rounded p-2">
              <span className="text-runes">✨</span>
              <div>
                <span className="text-runes font-display">Spell</span>
                <span className="text-gray-500 text-xs ml-2">(2 turns)</span>
                <p className="text-gray-400 text-xs">Cast magical spells on yourself or enemies</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'buildings',
      title: 'Buildings',
      icon: '🏛️',
      content: (
        <div className="space-y-2 text-sm text-gray-300">
          <p className="text-gray-400 mb-3">Buildings require free land and gold to construct.</p>

          <div className="space-y-2">
            <div className="bg-game-dark rounded p-2">
              <span className="text-white font-display">Homes</span>
              <p className="text-gray-400 text-xs">House population (peasants) who pay taxes</p>
            </div>
            <div className="bg-game-dark rounded p-2">
              <span className="text-white font-display">Markets</span>
              <p className="text-gray-400 text-xs">Generate income each turn</p>
            </div>
            <div className="bg-game-dark rounded p-2">
              <span className="text-white font-display">Barracks</span>
              <p className="text-gray-400 text-xs">Produce military troops during Industry</p>
            </div>
            <div className="bg-game-dark rounded p-2">
              <span className="text-white font-display">Forges</span>
              <p className="text-gray-400 text-xs">Reduce building costs</p>
            </div>
            <div className="bg-game-dark rounded p-2">
              <span className="text-white font-display">Farms</span>
              <p className="text-gray-400 text-xs">Produce food to feed your population</p>
            </div>
            <div className="bg-game-dark rounded p-2">
              <span className="text-white font-display">Towers</span>
              <p className="text-gray-400 text-xs">Train wizards and boost magic power</p>
            </div>
            <div className="bg-game-dark rounded p-2">
              <span className="text-white font-display">Walls</span>
              <p className="text-gray-400 text-xs">Defensive fortifications against attacks</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'eras',
      title: 'Eras',
      icon: '⏳',
      content: (
        <div className="space-y-3 text-sm text-gray-300">
          <p>Eras represent different time periods with unique bonuses:</p>

          <div className="space-y-2">
            <div className="bg-era-past/10 border border-era-past/30 rounded p-3">
              <span className="text-era-past font-display">Past Era</span>
              <div className="text-xs text-gray-400 mt-1 space-y-1">
                <p className="text-green-400">+20% magic power, +10% rune production</p>
                <p className="text-red-400">-5% economy, -10% industry</p>
              </div>
            </div>

            <div className="bg-era-present/10 border border-era-present/30 rounded p-3">
              <span className="text-era-present font-display">Present Era</span>
              <div className="text-xs text-gray-400 mt-1 space-y-1">
                <p className="text-green-400">+15% food, +5% industry, +20% exploration</p>
                <p className="text-gray-400">Balanced starting era</p>
              </div>
            </div>

            <div className="bg-era-future/10 border border-era-future/30 rounded p-3">
              <span className="text-era-future font-display">Future Era</span>
              <div className="text-xs text-gray-400 mt-1 space-y-1">
                <p className="text-green-400">+15% economy, +15% industry, +40% exploration</p>
                <p className="text-red-400">-10% magic power</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2 text-xs">
            <span className="text-yellow-400">Important:</span> You can only attack empires
            in the same era unless you use the Gate spell!
          </div>
        </div>
      ),
    },
    {
      id: 'combat',
      title: 'Combat',
      icon: '⚔️',
      content: (
        <div className="space-y-3 text-sm text-gray-300">
          <p>Attacks cost 2 turns and 5-6 health.</p>

          <div className="bg-game-dark rounded p-3 space-y-2">
            <p className="text-cyan-400 font-display text-xs">HOW COMBAT WORKS</p>
            <p className="text-gray-400 text-xs">
              Your offensive power must exceed the defender's defensive power by 5% to win.
              On victory, you capture land and buildings from the defender.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-gray-400 text-xs">Attack Types:</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-game-dark rounded p-2 text-xs">
                <span className="text-white">Standard</span>
                <p className="text-gray-500">All units, +15% land</p>
              </div>
              <div className="bg-game-dark rounded p-2 text-xs">
                <span className="text-white">Infantry</span>
                <p className="text-gray-500">Ground troops only</p>
              </div>
              <div className="bg-game-dark rounded p-2 text-xs">
                <span className="text-white">Cavalry</span>
                <p className="text-gray-500">Mounted units only</p>
              </div>
              <div className="bg-game-dark rounded p-2 text-xs">
                <span className="text-white">Air</span>
                <p className="text-gray-500">Flying units only</p>
              </div>
              <div className="bg-game-dark rounded p-2 text-xs">
                <span className="text-white">Naval</span>
                <p className="text-gray-500">Sea units only</p>
              </div>
            </div>
          </div>

          <p className="text-red-400 text-xs">
            Warning: Losing attacks damages your health. At 0 health you'll be weaker!
          </p>
        </div>
      ),
    },
    {
      id: 'spells',
      title: 'Spells',
      icon: '✨',
      content: (
        <div className="space-y-3 text-sm text-gray-300">
          <p>Spells cost runes and require wizards. Cast on yourself or enemies.</p>

          <div className="space-y-2">
            <p className="text-cyan-400 font-display text-xs">SELF SPELLS</p>
            <div className="grid gap-1 text-xs">
              <div className="bg-game-dark rounded p-2 flex justify-between">
                <span className="text-white">Shield</span>
                <span className="text-gray-500">Block incoming spell damage</span>
              </div>
              <div className="bg-game-dark rounded p-2 flex justify-between">
                <span className="text-white">Food/Cash/Runes</span>
                <span className="text-gray-500">Generate resources</span>
              </div>
              <div className="bg-game-dark rounded p-2 flex justify-between">
                <span className="text-white">Gate</span>
                <span className="text-gray-500">Attack any era this round</span>
              </div>
              <div className="bg-game-dark rounded p-2 flex justify-between">
                <span className="text-white">Advance/Regress</span>
                <span className="text-gray-500">Change your era</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-red-400 font-display text-xs">OFFENSIVE SPELLS</p>
            <div className="grid gap-1 text-xs">
              <div className="bg-game-dark rounded p-2 flex justify-between">
                <span className="text-white">Spy</span>
                <span className="text-gray-500">Reveal enemy stats</span>
              </div>
              <div className="bg-game-dark rounded p-2 flex justify-between">
                <span className="text-white">Blast</span>
                <span className="text-gray-500">Destroy enemy troops</span>
              </div>
              <div className="bg-game-dark rounded p-2 flex justify-between">
                <span className="text-white">Storm</span>
                <span className="text-gray-500">Destroy food and gold</span>
              </div>
              <div className="bg-game-dark rounded p-2 flex justify-between">
                <span className="text-white">Struct</span>
                <span className="text-gray-500">Destroy buildings</span>
              </div>
              <div className="bg-game-dark rounded p-2 flex justify-between">
                <span className="text-white">Steal</span>
                <span className="text-gray-500">Take enemy gold</span>
              </div>
              <div className="bg-game-dark rounded p-2 flex justify-between">
                <span className="text-white">Fight</span>
                <span className="text-gray-500">Magical assault for land</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'races',
      title: 'Races',
      icon: '👥',
      content: (
        <div className="space-y-2 text-sm text-gray-300">
          <p className="text-gray-400 mb-3">Each race has unique bonuses and penalties:</p>

          <div className="grid gap-2">
            <div className="bg-game-dark rounded p-2">
              <span className="text-gray-300 font-display">Human</span>
              <p className="text-gray-500 text-xs">Balanced, no modifiers</p>
            </div>
            <div className="bg-game-dark rounded p-2">
              <span className="text-runes font-display">Elf</span>
              <p className="text-xs">
                <span className="text-green-400">+10% Magic, +10% Runes</span>
                {' • '}
                <span className="text-red-400">-10% Military, -5% Food</span>
              </p>
            </div>
            <div className="bg-game-dark rounded p-2">
              <span className="text-amber-400 font-display">Dwarf</span>
              <p className="text-xs">
                <span className="text-green-400">+15% Defense, -10% Build Cost</span>
                {' • '}
                <span className="text-red-400">-10% Explore</span>
              </p>
            </div>
            <div className="bg-game-dark rounded p-2">
              <span className="text-red-400 font-display">Troll</span>
              <p className="text-xs">
                <span className="text-green-400">+15% Offense, +10% Explore</span>
                {' • '}
                <span className="text-red-400">-10% Income</span>
              </p>
            </div>
            <div className="bg-game-dark rounded p-2">
              <span className="text-gold font-display">Gnome</span>
              <p className="text-xs">
                <span className="text-green-400">+15% Income, +10% Market</span>
                {' • '}
                <span className="text-red-400">-10% Military</span>
              </p>
            </div>
            <div className="bg-game-dark rounded p-2">
              <span className="text-food font-display">Gremlin</span>
              <p className="text-xs">
                <span className="text-green-400">+20% Food, +5% Peasants</span>
                {' • '}
                <span className="text-red-400">-5% Magic</span>
              </p>
            </div>
            <div className="bg-game-dark rounded p-2">
              <span className="text-orange-400 font-display">Orc</span>
              <p className="text-xs">
                <span className="text-green-400">+15% Explore, +10% Offense</span>
                {' • '}
                <span className="text-red-400">-15% Defense</span>
              </p>
            </div>
            <div className="bg-game-dark rounded p-2">
              <span className="text-purple-400 font-display">Drow</span>
              <p className="text-xs">
                <span className="text-green-400">+10% Magic, +10% Offense</span>
                {' • '}
                <span className="text-red-400">-5% Food, -5% Defense</span>
              </p>
            </div>
            <div className="bg-game-dark rounded p-2">
              <span className="text-lime-400 font-display">Goblin</span>
              <p className="text-xs">
                <span className="text-green-400">+15% Industry, +5% Explore</span>
                {' • '}
                <span className="text-red-400">-10% Defense</span>
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'tips',
      title: 'Strategy Tips',
      icon: '💡',
      content: (
        <div className="space-y-3 text-sm text-gray-300">
          <div className="bg-game-dark rounded p-3 space-y-2">
            <p className="text-gold font-display text-xs">EARLY GAME</p>
            <ul className="text-gray-400 text-xs space-y-1 list-disc list-inside">
              <li>Focus on exploring to gain land quickly</li>
              <li>Build homes first to grow your population</li>
              <li>Don't neglect farms - you need food to survive</li>
              <li>Use the market to buy what you need</li>
            </ul>
          </div>

          <div className="bg-game-dark rounded p-3 space-y-2">
            <p className="text-cyan-400 font-display text-xs">MID GAME</p>
            <ul className="text-gray-400 text-xs space-y-1 list-disc list-inside">
              <li>Balance economy buildings with military</li>
              <li>Use Spy spell to scout targets before attacking</li>
              <li>Pick advisors that match your strategy</li>
              <li>Watch out for aggressive bots!</li>
            </ul>
          </div>

          <div className="bg-game-dark rounded p-3 space-y-2">
            <p className="text-red-400 font-display text-xs">LATE GAME</p>
            <ul className="text-gray-400 text-xs space-y-1 list-disc list-inside">
              <li>Attack weakened enemies to steal their land</li>
              <li>Stack defensive bonuses if you're ahead</li>
              <li>Convert resources to networth efficiently</li>
              <li>Don't forget about era restrictions!</li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col p-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl text-gold">Game Guide</h1>
        <button onClick={() => navigate('/')} className="btn-secondary btn-sm">
          Back
        </button>
      </div>

      {/* Quick navigation */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setOpenSection(section.id)}
            className={clsx(
              'px-3 py-1 rounded whitespace-nowrap text-sm transition-all',
              openSection === section.id
                ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/50'
                : 'bg-game-card text-gray-400 border border-game-border hover:text-white'
            )}
          >
            {section.icon} {section.title}
          </button>
        ))}
      </div>

      {/* Accordion Sections */}
      <div className="space-y-2 flex-1">
        {sections.map((section) => (
          <Panel key={section.id} className="overflow-hidden">
            <button
              onClick={() =>
                setOpenSection(openSection === section.id ? null : section.id)
              }
              className={clsx(
                'w-full text-left font-display uppercase tracking-wider',
                'flex justify-between items-center',
                openSection === section.id ? 'text-cyan-400' : 'text-gray-300'
              )}
            >
              <span>
                {section.icon} {section.title}
              </span>
              <span className="text-sm">{openSection === section.id ? '▼' : '▶'}</span>
            </button>
            {openSection === section.id && (
              <div className="mt-3 pt-3 border-t border-game-border">
                {section.content}
              </div>
            )}
          </Panel>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 text-center">
        <p className="text-gray-500 text-xs">
          Press any section to expand • Swipe horizontally for quick navigation
        </p>
      </div>
    </div>
  );
}
