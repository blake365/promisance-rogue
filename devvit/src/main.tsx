import { Devvit, Context } from '@devvit/public-api';
import * as api from './server/api.js';

// Configure app
Devvit.configure({
  redditAPI: true,
  redis: true,
  http: false,
});

// Type for webview messages
interface WebviewMessage {
  type: string;
  data: {
    requestId: number;
    sessionId?: string | null;
    payload?: any;
  };
}

// Message handler
async function handleWebviewMessage(msg: WebviewMessage, context: Context) {
  const { type, data } = msg;
  const { requestId, payload } = data;

  try {
    let result;

    switch (type) {
      // Auth handlers
      case 'auth.createPlayer':
        result = await api.getPlayer(context);
        break;

      case 'auth.getMe':
        result = await api.getPlayer(context);
        break;

      // Game handlers
      case 'game.new':
        result = await api.createGame(context, payload);
        break;

      case 'game.current':
        result = await api.getCurrentGame(context);
        break;

      case 'game.get':
        result = await api.getGame(context, payload);
        break;

      case 'game.abandon':
        result = await api.abandonGame(context);
        break;

      // Action handlers
      case 'game.action':
        result = await api.executeTurnAction(context, payload);
        break;

      case 'game.combatPreview':
        result = await api.getCombatPreviewHandler(context, payload);
        break;

      case 'game.endPlayerPhase':
        result = await api.endPlayerPhaseHandler(context, payload);
        break;

      // Shop handlers
      case 'game.market':
        result = await api.marketTransaction(context, payload);
        break;

      case 'game.draft':
        result = await api.selectDraftHandler(context, payload);
        break;

      case 'game.rerollInfo':
        result = await api.getRerollInfoHandler(context, payload);
        break;

      case 'game.reroll':
        result = await api.rerollDraftHandler(context, payload);
        break;

      case 'game.dismissAdvisor':
        result = await api.dismissAdvisorHandler(context, payload);
        break;

      case 'game.endShopPhase':
        result = await api.endShopPhaseHandler(context, payload);
        break;

      // Bank handlers
      case 'game.bankInfo':
        result = await api.getBankInfoHandler(context, payload);
        break;

      case 'game.bank':
        result = await api.bankTransaction(context, payload);
        break;

      // Settings handler
      case 'game.settings':
        result = await api.updateSettings(context, payload);
        break;

      // Bot phase handler
      case 'game.botPhase':
        result = await api.executeBotPhaseHandler(context, payload);
        break;

      // Leaderboard handlers
      case 'leaderboard.get':
        result = await api.getLeaderboard(context, payload);
        break;

      case 'leaderboard.rank':
        result = await api.getPlayerRank(context);
        break;

      // Health check
      case 'health':
        result = { status: 'ok', timestamp: Date.now() };
        break;

      default:
        return {
          type: 'devvit-response',
          data: {
            requestId,
            success: false,
            error: `Unknown message type: ${type}`,
            data: null,
          },
        };
    }

    return {
      type: 'devvit-response',
      data: {
        requestId,
        success: true,
        data: result,
        error: null,
      },
    };
  } catch (error) {
    return {
      type: 'devvit-response',
      data: {
        requestId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      },
    };
  }
}

// Main app component - renders webview
Devvit.addCustomPostType({
  name: 'Promisance Rogue',
  description: 'A roguelike turn-based strategy game',
  height: 'tall',
  render: (context) => {
    return (
      <vstack height="100%" width="100%">
        <webview
          id="game-webview"
          url="webview.html"
          width="100%"
          height="100%"
          onMessage={async (msg) => {
            const response = await handleWebviewMessage(msg as unknown as WebviewMessage, context);
            context.ui.webView.postMessage('game-webview', response);
          }}
        />
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
