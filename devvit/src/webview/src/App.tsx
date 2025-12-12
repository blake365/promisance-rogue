import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { TitlePage } from './pages/TitlePage';
import { GamePage } from './pages/GamePage';
import { OverviewPage } from './pages/OverviewPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { GuidePage } from './pages/GuidePage';
import { useThemeStore } from '@/stores/themeStore';

function App() {
  const { theme, initTheme } = useThemeStore();

  // Initialize theme from localStorage on mount
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  // Apply theme to document when it changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary transition-colors duration-200">
      <Routes>
        <Route path="/" element={<TitlePage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
