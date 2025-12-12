import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';
import { EmpireStatus } from '@/components/game/EmpireStatus';

export function OverviewPage() {
  const navigate = useNavigate();
  const { game, checkActiveGame } = useGameStore();
  const { playerEmpire, round } = game;

  // Check for active game on mount
  useEffect(() => {
    checkActiveGame();
  }, [checkActiveGame]);

  // Redirect if no active game
  useEffect(() => {
    if (!game.gameId) {
      navigate('/');
    }
  }, [game.gameId, navigate]);

  if (!playerEmpire || !round) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-cyan-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 p-4 overflow-auto">
        <EmpireStatus
          empire={playerEmpire}
          round={round}
          expanded
          onClose={() => navigate('/game')}
        />
      </main>
    </div>
  );
}
