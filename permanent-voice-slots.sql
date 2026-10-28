-- Run ONCE in the existing CALLFOCUS_WALLET_DB (callfocus-wallet) D1 database.
-- Does not modify wallet balances, purchase tables, or any current system.
CREATE TABLE IF NOT EXISTS cf_permanent_voice_slots (
 user_id TEXT PRIMARY KEY NOT NULL,
 booked_at TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'booked' CHECK(state IN ('booked','creating','verification','ready','failed')),
 voice_id TEXT,
 voice_name TEXT,
 create_token TEXT,
 create_started_at TEXT,
 created_at TEXT,
 updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS cf_permanent_voice_ids ON cf_permanent_voice_slots(voice_id) WHERE voice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS cf_permanent_voice_states ON cf_permanent_voice_slots(state);
