# Game Logic

This directory will contain the core game logic copied from `/server/src/game/`.

The following files should be copied with minimal modifications:

## Files to Copy

- `constants.ts` - Game balance values (no changes needed)
- `empire.ts` - Empire creation and management (no changes)
- `turns.ts` - Turn action processing (no changes)
- `combat.ts` - Attack resolution (no changes)
- `spells.ts` - Spell casting (no changes)
- `shop.ts` - Draft and market system (no changes)
- `bank.ts` - Savings/loan operations (no changes)
- `rng.ts` - Random number generation (no changes)
- `stats.ts` - Statistics calculations (no changes)
- `run.ts` - GameRun lifecycle (**NEEDS MODIFICATION** - replace D1 calls with Redis)
- `bonuses/` - All bonus definitions (no changes)
- `bot/` - AI bot system (no changes to logic)

## Required Modifications

### run.ts
- Replace D1 database calls with Redis operations
- Update `createGameRun()` to use Redis
- Update `executePlayerPhase()` to save to Redis
- Update `executeShopPhase()` to save to Redis
- Update `executeBotPhase()` to save to Redis

### index.ts
- Update imports if needed
- Remove Cloudflare-specific code

## Migration Checklist

- [ ] Copy all TypeScript files from `/server/src/game/`
- [ ] Update `run.ts` to use Redis operations
- [ ] Test game logic independently
- [ ] Verify bot AI still works
- [ ] Ensure RNG consistency
