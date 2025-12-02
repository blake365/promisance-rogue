-- Promisance Rogue Database Schema for Cloudflare D1

-- Players table (accounts)
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  display_name TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  last_login INTEGER,
  total_runs INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0
);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_players_email ON players(email);

-- Game runs table (active and completed games)
CREATE TABLE IF NOT EXISTS game_runs (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  seed INTEGER NOT NULL,

  -- Current state
  round_number INTEGER NOT NULL DEFAULT 1,
  turns_remaining INTEGER NOT NULL DEFAULT 50,
  phase TEXT NOT NULL DEFAULT 'player', -- 'player', 'shop', 'bot', 'complete'

  -- Serialized game state (JSON)
  player_empire TEXT NOT NULL,
  bot_empires TEXT NOT NULL,
  market_prices TEXT,
  shop_stock TEXT,
  draft_options TEXT,
  intel TEXT DEFAULT '{}',
  modifiers TEXT DEFAULT '[]',

  -- Game over state
  player_defeated TEXT, -- 'no_land', 'no_peasants', 'excessive_loan', or NULL if not defeated

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  completed_at INTEGER,

  -- Final score (set when game completes)
  final_score INTEGER,

  FOREIGN KEY (player_id) REFERENCES players(id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_game_runs_player ON game_runs(player_id);
CREATE INDEX IF NOT EXISTS idx_game_runs_phase ON game_runs(phase);
CREATE INDEX IF NOT EXISTS idx_game_runs_score ON game_runs(final_score DESC);

-- Leaderboard entries (completed games summary)
CREATE TABLE IF NOT EXISTS leaderboard (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  race TEXT NOT NULL,
  final_networth INTEGER NOT NULL,
  rounds_completed INTEGER NOT NULL,
  modifiers TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),

  FOREIGN KEY (player_id) REFERENCES players(id)
);

-- Create indexes for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(final_networth DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_player ON leaderboard(player_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_date ON leaderboard(created_at DESC);

-- Daily leaderboard view (for filtering)
CREATE INDEX IF NOT EXISTS idx_leaderboard_daily ON leaderboard(created_at, final_networth DESC);

-- Sessions table (for auth)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  expires_at INTEGER NOT NULL,

  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_player ON sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Unlocks table (meta-progression)
CREATE TABLE IF NOT EXISTS unlocks (
  player_id TEXT NOT NULL,
  unlock_type TEXT NOT NULL, -- 'race', 'advisor', 'modifier', 'bot'
  unlock_id TEXT NOT NULL,
  unlocked_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),

  PRIMARY KEY (player_id, unlock_type, unlock_id),
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE INDEX IF NOT EXISTS idx_unlocks_player ON unlocks(player_id);
