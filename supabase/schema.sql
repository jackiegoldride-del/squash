-- ================================================================
-- SQUASH MATCH — database schema
-- Run all of this in: Supabase -> SQL Editor -> New Query -> Run
-- ================================================================

CREATE TABLE IF NOT EXISTS players (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  phone          TEXT NOT NULL UNIQUE,
  gender         TEXT NOT NULL,            -- 'male' | 'female'
  rating         NUMERIC NOT NULL,         -- precise internal USR (2.00 - 5.50)
  initial_rating NUMERIC NOT NULL,         -- rating from the quiz, never changes
  rating_history JSONB NOT NULL DEFAULT '[]',  -- [{t: ISO date, r: rating}]
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_a         UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,  -- reporter
  player_b         UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,  -- opponent
  winner           UUID NOT NULL,
  reported_by      UUID NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'confirmed' | 'rejected'
  rated            BOOLEAN,                          -- false when weekly same-opponent limit hit
  rating_change_a  NUMERIC DEFAULT 0,
  rating_change_b  NUMERIC DEFAULT 0,
  rating_a_before  NUMERIC,
  rating_b_before  NUMERIC,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS match_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_player UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  to_player   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'accepted' | 'declined'
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience   TEXT NOT NULL,   -- 'all' | 'level' | 'private'
  level      NUMERIC,         -- display rating (used when audience = 'level')
  to_player  UUID REFERENCES players(id) ON DELETE CASCADE,  -- used when audience = 'private'
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- Row Level Security — open policies (the app manages permissions
-- in code; admin auth is client-side via env var password)
-- ================================================================
ALTER TABLE players        ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches        ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_players"  ON players        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_matches"  ON matches        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_requests" ON match_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_messages" ON messages       FOR ALL USING (true) WITH CHECK (true);
