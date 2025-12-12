import { Devvit } from '@devvit/public-api';

// Import all API handlers
import * as api from './server/api.js';

// Configure app
Devvit.configure({
  redditAPI: true,
  redis: true,
  http: false,
});

// ============================================
// REGISTER API HANDLERS (21 total)
// ============================================

// TODO: Check Devvit API docs for correct handler registration method
// Devvit.addHandler() doesn't exist in the current Devvit API
// These handlers will need to be called from webview message handlers or custom post actions

// Handlers are implemented and exported from './server/api.js':
// - api.getPlayer, api.createGame, api.abandonGame, api.getCurrentGame, api.getGame
// - api.executeTurnAction, api.updateSettings, api.getCombatPreviewHandler, api.endPlayerPhaseHandler
// - api.marketTransaction, api.getBankInfoHandler, api.bankTransaction
// - api.selectDraftHandler, api.getRerollInfoHandler, api.rerollDraftHandler
// - api.dismissAdvisorHandler, api.endShopPhaseHandler
// - api.executeBotPhaseHandler
// - api.getLeaderboard, api.getPlayerRank, api.getHistory

// TODO: Import webview
// import { WebviewApp } from './webview/index.js';

// Main app component
Devvit.addCustomPostType({
  name: 'Promisance Rogue',
  description: 'A roguelike turn-based strategy game',
  height: 'tall',
  render: (context) => {
    return (
      <vstack height="100%" width="100%" alignment="center middle">
        <text size="xxlarge" weight="bold">
          🏰 Promisance Rogue
        </text>
        <text>Loading game...</text>
      </vstack>
    );
  },
});

// Menu action to create new game post
Devvit.addMenuItem({
  label: 'Start New Promisance Game',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { reddit, ui } = context;
    const subreddit = await reddit.getCurrentSubreddit();

    await reddit.submitPost({
      title: '🏰 Promisance Rogue - Start Your Empire',
      subredditName: subreddit.name,
      preview: (
        <vstack padding="medium" alignment="center middle">
          <text size="xlarge" weight="bold">
            New Promisance Rogue Game
          </text>
          <text>Click to begin your conquest!</text>
        </vstack>
      ),
    });

    ui.showToast({ text: 'Game post created!' });
  },
});

// Export the app
export default Devvit;
