import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useGameStore } from '@/stores/gameStore';
import { Panel, ThemeToggle } from '@/components/ui';
import type { Race } from '@/types';

type Stage = 'menu' | 'login' | 'new_game_name' | 'new_game_race' | 'confirm_abandon';

interface RaceInfo {
  value: Race;
  name: string;
  description: string;
  bonuses: string[];
  penalties: string[];
}

const RACES: RaceInfo[] = [
  {
    value: 'human',
    name: 'Human',
    description: 'Balanced empire with no special traits',
    bonuses: [],
    penalties: [],
  },
  {
    value: 'elf',
    name: 'Elf',
    description: 'Magical beings focused on the arcane',
    bonuses: ['+10% Magic', '+10% Runes'],
    penalties: ['-10% Military', '-5% Food'],
  },
  {
    value: 'dwarf',
    name: 'Dwarf',
    description: 'Master builders with strong defenses',
    bonuses: ['+15% Defense', '-10% Build Cost'],
    penalties: ['-10% Exploration'],
  },
  {
    value: 'troll',
    name: 'Troll',
    description: 'Aggressive warriors and explorers',
    bonuses: ['+15% Offense', '+10% Exploration'],
    penalties: ['-10% Income'],
  },
  {
    value: 'gnome',
    name: 'Gnome',
    description: 'Shrewd merchants and traders',
    bonuses: ['+15% Income', '+10% Market'],
    penalties: ['-10% Military'],
  },
  {
    value: 'gremlin',
    name: 'Gremlin',
    description: 'Agricultural specialists',
    bonuses: ['+20% Food', '+5% Peasants'],
    penalties: ['-5% Magic'],
  },
  {
    value: 'orc',
    name: 'Orc',
    description: 'Aggressive expansion focused',
    bonuses: ['+15% Exploration', '+10% Offense'],
    penalties: ['-15% Defense'],
  },
  {
    value: 'drow',
    name: 'Drow',
    description: 'Dark elves blending magic and military',
    bonuses: ['+10% Magic', '+10% Offense'],
    penalties: ['-5% Food', '-5% Defense'],
  },
  {
    value: 'goblin',
    name: 'Goblin',
    description: 'Industrial powerhouse',
    bonuses: ['+15% Industry', '+5% Exploration'],
    penalties: ['-10% Defense'],
  },
];

function getRandomRace(): Race {
  const index = Math.floor(Math.random() * RACES.length);
  return RACES[index].value;
}

export function TitlePage() {
  const navigate = useNavigate();
  const {
    player,
    game,
    loading,
    error,
    clearError,
    login,
    restoreSession,
    checkActiveGame,
    newGame,
    abandonGame,
  } = useGameStore();

  const [stage, setStage] = useState<Stage>('menu');
  const [displayName, setDisplayName] = useState('');
  const [empireName, setEmpireName] = useState('');
  const [seedInput, setSeedInput] = useState('');
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);

  const hasSession = !!player.sessionId;
  const hasActiveGame = !!game.gameId;

  // On mount, try to restore session and check for active game
  useEffect(() => {
    const init = async () => {
      const restored = await restoreSession();
      if (restored) {
        await checkActiveGame();
      }
    };
    init();
  }, [restoreSession, checkActiveGame]);

  // Navigate to game if we have an active game and we're at menu
  useEffect(() => {
    if (hasActiveGame && stage === 'menu') {
      // Don't auto-navigate, let user choose to continue
    }
  }, [hasActiveGame, stage]);

  const handleMenuAction = async (action: string) => {
    clearError();

    switch (action) {
      case 'continue':
        navigate('/game');
        break;
      case 'new_game':
        if (hasSession) {
          setStage('new_game_name');
        } else {
          setStage('login');
        }
        break;
      case 'abandon':
        setStage('confirm_abandon');
        break;
      case 'leaderboard':
        navigate('/leaderboard');
        break;
      case 'guide':
        navigate('/guide');
        break;
    }
  };

  const handleLogin = async () => {
    if (!displayName.trim()) return;

    const success = await login(displayName.trim());
    if (success) {
      setStage('new_game_name');
    }
  };

  const handleNameSubmit = () => {
    if (!empireName.trim()) return;
    setStage('new_game_race');
  };

  const handleRaceSelect = async () => {
    if (!selectedRace || !empireName.trim()) return;

    // Parse seed if provided
    const seed = seedInput.trim() ? parseInt(seedInput.trim(), 10) : undefined;
    const validSeed = seed && !isNaN(seed) ? seed : undefined;

    const success = await newGame(empireName.trim(), selectedRace, validSeed);
    if (success) {
      navigate('/game');
    }
  };

  const handleAbandon = async () => {
    await abandonGame();
    setStage('menu');
  };

  const handleBack = () => {
    clearError();
    if (stage === 'new_game_race') {
      setStage('new_game_name');
    } else if (stage === 'new_game_name') {
      setStage(hasSession ? 'menu' : 'login');
    } else {
      setStage('menu');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-bg-primary">
      {/* Logo/Title */}
      <div className="text-center mb-8">
        <h1 className="font-display text-4xl md:text-6xl text-gold text-glow-gold mb-2">
          Promisance
        </h1>
        <div className="flex items-center justify-center gap-3">
          <h2 className="font-display text-2xl md:text-3xl text-accent text-glow-blue">
            Rogue
          </h2>
          <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/50 rounded animate-pulse">
            Alpha
          </span>
        </div>
        <p className="text-text-muted mt-4 font-mono text-sm">
          A Roguelike Turn-Based Strategy Game
        </p>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-2 mb-4 text-red-400 text-sm max-w-sm w-full text-center">
          {error}
          <button onClick={clearError} className="ml-2 text-red-300 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-accent animate-pulse mb-4">Loading...</div>
      )}

      {/* Main Menu */}
      {stage === 'menu' && !loading && (
        <Panel className="w-full max-w-sm">
          <div className="flex flex-col gap-3">
            {hasActiveGame ? (
              <>
                <button
                  onClick={() => handleMenuAction('continue')}
                  className="btn-gold btn-lg w-full"
                >
                  Continue Game
                </button>
                <button
                  onClick={() => handleMenuAction('abandon')}
                  className="btn-danger btn-lg w-full"
                >
                  Abandon Game
                </button>
              </>
            ) : (
              <button
                onClick={() => handleMenuAction('new_game')}
                className="btn-gold btn-lg w-full"
              >
                New Game
              </button>
            )}

            <button
              onClick={() => handleMenuAction('leaderboard')}
              className="btn-secondary btn-lg w-full"
            >
              Leaderboard
            </button>

            <button
              onClick={() => handleMenuAction('guide')}
              className="btn-secondary btn-lg w-full"
            >
              Game Guide
            </button>
          </div>

          {hasSession && (
            <p className="text-text-muted text-xs text-center mt-4">
              Playing as: {player.displayName}
            </p>
          )}
        </Panel>
      )}

      {/* Login Stage */}
      {stage === 'login' && !loading && (
        <Panel className="w-full max-w-sm">
          <h3 className="font-display text-lg text-accent mb-4 text-center">
            Enter Your Name
          </h3>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Your display name"
            className="w-full bg-bg-primary border border-border-theme rounded px-4 py-3 text-text-primary placeholder-text-muted focus:border-accent focus:outline-none mb-4"
            autoFocus
            maxLength={20}
          />
          <div className="flex gap-2">
            <button onClick={handleBack} className="btn-secondary btn-lg flex-1">
              Back
            </button>
            <button
              onClick={handleLogin}
              disabled={!displayName.trim()}
              className="btn-primary btn-lg flex-1"
            >
              Continue
            </button>
          </div>
        </Panel>
      )}

      {/* Empire Name Stage */}
      {stage === 'new_game_name' && !loading && (
        <Panel className="w-full max-w-sm">
          <h3 className="font-display text-lg text-accent mb-4 text-center">
            Name Your Empire
          </h3>
          <input
            type="text"
            value={empireName}
            onChange={(e) => setEmpireName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            placeholder="Empire name"
            className="w-full bg-bg-primary border border-border-theme rounded px-4 py-3 text-text-primary placeholder-text-muted focus:border-accent focus:outline-none mb-3"
            autoFocus
            maxLength={24}
          />
          <div className="mb-4">
            <label className="text-text-muted text-xs mb-1 block">
              Seed (optional - for reproducible games)
            </label>
            <input
              type="text"
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Leave empty for random"
              className="w-full bg-bg-primary border border-border-theme rounded px-4 py-2 text-text-primary placeholder-text-muted focus:border-accent focus:outline-none text-sm"
              maxLength={10}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleBack} className="btn-secondary btn-lg flex-1">
              Back
            </button>
            <button
              onClick={handleNameSubmit}
              disabled={!empireName.trim()}
              className="btn-primary btn-lg flex-1"
            >
              Choose Race
            </button>
          </div>
        </Panel>
      )}

      {/* Race Selection Stage */}
      {stage === 'new_game_race' && !loading && (
        <div className="w-full max-w-lg">
          <Panel className="mb-4">
            <h3 className="font-display text-lg text-accent mb-2 text-center">
              Choose Your Race
            </h3>
            <p className="text-text-muted text-sm text-center">
              Empire: <span className="text-gold">{empireName}</span>
            </p>
          </Panel>

          {/* Random Race Button */}
          <button
            onClick={() => setSelectedRace(getRandomRace())}
            className="w-full p-3 mb-4 rounded-lg border-2 border-dashed border-gold/50 bg-gold/5 hover:border-gold hover:bg-gold/10 transition-all text-center"
          >
            <div className="font-display text-gold mb-1">🎲 Random Race</div>
            <div className="text-xs text-text-muted">Let fate decide your destiny</div>
          </button>

          {/* Race Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4 max-h-[50vh] overflow-y-auto">
            {RACES.map((race) => (
              <button
                key={race.value}
                onClick={() => setSelectedRace(race.value)}
                className={clsx(
                  'p-3 rounded-lg border-2 text-left transition-all',
                  selectedRace === race.value
                    ? 'border-accent bg-accent/10 shadow-blue-glow'
                    : 'border-border-theme bg-bg-card hover:border-highlight'
                )}
              >
                <div className="font-display text-text-primary mb-1">{race.name}</div>
                <div className="text-xs text-text-muted mb-2">{race.description}</div>
                {race.bonuses.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {race.bonuses.map((bonus, i) => (
                      <span key={i} className="text-xs text-green-400 bg-green-400/10 px-1 rounded">
                        {bonus}
                      </span>
                    ))}
                  </div>
                )}
                {race.penalties.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {race.penalties.map((penalty, i) => (
                      <span key={i} className="text-xs text-red-400 bg-red-400/10 px-1 rounded">
                        {penalty}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Selected Race Preview */}
          {selectedRace && (
            <Panel className="mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-text-secondary">Selected: </span>
                  <span className="font-display text-gold">
                    {RACES.find((r) => r.value === selectedRace)?.name}
                  </span>
                </div>
              </div>
            </Panel>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button onClick={handleBack} className="btn-secondary btn-lg flex-1">
              Back
            </button>
            <button
              onClick={handleRaceSelect}
              disabled={!selectedRace}
              className="btn-gold btn-lg flex-1"
            >
              Start Game
            </button>
          </div>
        </div>
      )}

      {/* Abandon Confirmation */}
      {stage === 'confirm_abandon' && !loading && (
        <Panel className="w-full max-w-sm">
          <h3 className="font-display text-lg text-red-400 mb-4 text-center">
            Abandon Game?
          </h3>
          <p className="text-text-muted text-sm text-center mb-4">
            Are you sure you want to abandon your current game? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setStage('menu')} className="btn-secondary btn-lg flex-1">
              Cancel
            </button>
            <button onClick={handleAbandon} className="btn-danger btn-lg flex-1">
              Abandon
            </button>
          </div>
        </Panel>
      )}

      {/* Theme Toggle */}
      <ThemeToggle className="mt-8" />

      {/* Terminal CTA */}
      <div className="mt-6 text-center">
        <p className="text-text-muted text-xs mb-2">for real freaks, play in your terminal:</p>
        <code className="bg-bg-card border border-border-theme rounded px-3 py-1.5 text-accent font-mono text-sm select-all">
          npx promisance-rogue
        </code>
      </div>

      {/* Footer */}
      <div className="text-center mt-4">
        <p className="text-text-muted text-xs font-mono">
          Based on QM Promisance • 10 Rounds to Glory
        </p>
        <p className="text-orange-400 text-xs mt-1">
          Early Alpha - Expect bugs & balance changes
        </p>
      </div>
    </div>
  );
}
