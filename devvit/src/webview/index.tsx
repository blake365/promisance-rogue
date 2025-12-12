/**
 * Devvit Webview Entry Point
 *
 * Loads the React app from /web/src/ into a Devvit webview
 */

import { Devvit } from '@devvit/public-api';

// TODO: Import React app components
// import App from './App.js';

/**
 * Webview component
 */
export const WebviewApp = () => {
  return (
    <webview
      id="game-webview"
      url="index.html"
      width="100%"
      height="100%"
    />
  );
};

/**
 * Webview message handler
 * Handles communication between React app and Devvit backend
 */
Devvit.addWebviewHandler('game-action', async (event, context) => {
  const { redis } = context;
  const { action, payload } = event;

  try {
    switch (action) {
      case 'create-game':
        // TODO: Call createGame API
        return { success: true, gameId: 'new-game-id' };

      case 'execute-turn':
        // TODO: Call executeTurn API
        return { success: true, result: {} };

      case 'shop-phase':
        // TODO: Call shopPhase API
        return { success: true };

      case 'get-leaderboard':
        // TODO: Call getLeaderboard API
        return { success: true, leaderboard: [] };

      default:
        return { success: false, error: 'Unknown action' };
    }
  } catch (error) {
    console.error('Webview handler error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});
