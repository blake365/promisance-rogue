import { Devvit } from '@devvit/public-api';

// Configure app
Devvit.configure({
  redditAPI: true,
  redis: true,
  http: false,
});

// TODO: Import API handlers
// import { registerHandlers } from './server/api.js';

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
