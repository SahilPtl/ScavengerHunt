CREATE TABLE IF NOT EXISTS users (
 id SERIAL PRIMARY KEY, name VARCHAR(60) NOT NULL, email VARCHAR(254) UNIQUE NOT NULL,
 password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'player', simulated BOOLEAN NOT NULL DEFAULT false,
 demo_account BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS hunts (
 id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL, difficulty TEXT NOT NULL DEFAULT 'Medium', active BOOLEAN NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS checkpoints (
 id SERIAL PRIMARY KEY, hunt_id INTEGER NOT NULL REFERENCES hunts(id), name TEXT NOT NULL,
 clue TEXT NOT NULL, hint TEXT NOT NULL, latitude DOUBLE PRECISION NOT NULL, longitude DOUBLE PRECISION NOT NULL,
 radius INTEGER NOT NULL DEFAULT 80, sequence_number INTEGER NOT NULL, score_reward INTEGER NOT NULL DEFAULT 100,
 UNIQUE(hunt_id,sequence_number)
);
CREATE TABLE IF NOT EXISTS hunt_participants (
 id SERIAL PRIMARY KEY, hunt_id INTEGER NOT NULL REFERENCES hunts(id), user_id INTEGER NOT NULL REFERENCES users(id),
 team_name VARCHAR(60) NOT NULL, score INTEGER NOT NULL DEFAULT 0, current_checkpoint INTEGER NOT NULL DEFAULT 1,
 started_at TIMESTAMPTZ NOT NULL DEFAULT now(), completed_at TIMESTAMPTZ, UNIQUE(hunt_id,user_id)
);
CREATE TABLE IF NOT EXISTS checkpoint_completions (
 participant_id INTEGER NOT NULL REFERENCES hunt_participants(id) ON DELETE CASCADE,
 checkpoint_id INTEGER NOT NULL REFERENCES checkpoints(id), completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 points_awarded INTEGER NOT NULL, PRIMARY KEY(participant_id,checkpoint_id)
);
CREATE TABLE IF NOT EXISTS hints_used (
 participant_id INTEGER NOT NULL REFERENCES hunt_participants(id) ON DELETE CASCADE,
 checkpoint_id INTEGER NOT NULL REFERENCES checkpoints(id), PRIMARY KEY(participant_id,checkpoint_id)
);
CREATE TABLE IF NOT EXISTS player_locations (
 participant_id INTEGER PRIMARY KEY REFERENCES hunt_participants(id) ON DELETE CASCADE,
 latitude DOUBLE PRECISION NOT NULL CHECK(latitude BETWEEN -90 AND 90),
 longitude DOUBLE PRECISION NOT NULL CHECK(longitude BETWEEN -180 AND 180),
 mode TEXT NOT NULL CHECK(mode IN ('gps','demo')), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS leaderboard_hunt_score ON hunt_participants(hunt_id,score DESC);
-- Additive migration: existing password accounts and runs remain unchanged.
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT UNIQUE;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
CREATE TABLE IF NOT EXISTS oauth_attempts (
 state_hash TEXT PRIMARY KEY, nonce TEXT NOT NULL, verifier TEXT NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL DEFAULT now()+interval '10 minutes'
);
CREATE TABLE IF NOT EXISTS oauth_tickets (
 ticket_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at TIMESTAMPTZ NOT NULL DEFAULT now()+interval '1 minute'
);
