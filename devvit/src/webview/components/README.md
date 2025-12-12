# Webview Components

React components for the game UI, adapted from `/web/src/`.

## Components to Copy

From `/web/src/components/`:
- Game board/grid components
- Empire status displays
- Action panels
- Shop/market interfaces
- Leaderboard views
- Attack/spell selectors

## Required Modifications

1. **API Calls**: Replace direct HTTP calls with Devvit webview messaging
   ```typescript
   // Before (web):
   const response = await fetch('/api/turn', { ... });

   // After (devvit):
   const response = await window.devvit.sendMessage('game-action', {
     action: 'execute-turn',
     payload: { ... }
   });
   ```

2. **Authentication**: Use Devvit user context instead of custom auth
   ```typescript
   // Before: localStorage token
   // After: Provided by Devvit context
   ```

3. **Styling**: Ensure Tailwind CSS is bundled or use inline styles

## Migration Checklist

- [ ] Copy React components from `/web/src/`
- [ ] Update API calls to use webview messaging
- [ ] Remove authentication logic
- [ ] Test all components in Devvit webview
- [ ] Verify responsive design
