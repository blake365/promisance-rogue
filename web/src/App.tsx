import { Routes, Route, Navigate } from 'react-router-dom';
import { TitlePage } from './pages/TitlePage';
import { GamePage } from './pages/GamePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { GuidePage } from './pages/GuidePage';

function App() {
  return (
    <div className="min-h-screen bg-game-dark">
      <Routes>
        <Route path="/" element={<TitlePage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
