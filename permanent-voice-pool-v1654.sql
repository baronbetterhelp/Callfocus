-- CallFocus V16.54 — ONE-TIME SQL migration on the EXISTING callfocus-wallet D1 database.
-- Prerequisite: V16.50's provider_pool column already exists.
-- Make a D1 backup first. The original table is retained as a safety backup after migration.
-- Do not run twice. Deploy V16.54 only AFTER successful migration.
-- This does NOT modify the wallet, affiliate, payments, or existing saved voice IDs.

CREATE TABLE cf_permanent_voice_slots_v1654 (
 user_id TEXT PRIMARY KEY NOT NULL,
 booked_at TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'booked'
   CHECK (state IN ('booked','creating','verification','ready','failed')),
 voice_id TEXT,
 voice_name TEXT,
 create_token TEXT,
 create_started_at TEXT,
 created_at TEXT,
 updated_at TEXT NOT NULL,
 provider_pool TEXT NOT NULL DEFAULT 'primary'
   CHECK (provider_pool IN ('primary','secondary','tertiary'))
);
INSERT INTO cf_permanent_voice_slots_v1654
 (user_id,booked_at,state,voice_id,voice_name,create_token,create_started_at,created_at,updated_at,provider_pool)
SELECT user_id,booked_at,state,voice_id,voice_name,create_token,create_started_at,created_at,updated_at,provider_pool
FROM cf_permanent_voice_slots;

-- Keep original rows in a separate backup table instead of deleting them.
ALTER TABLE cf_permanent_voice_slots RENAME TO cf_permanent_voice_slots_v1650_backup;
ALTER TABLE cf_permanent_voice_slots_v1654 RENAME TO cf_permanent_voice_slots;

CREATE UNIQUE INDEX cf_permanent_voice_ids_v1654
 ON cf_permanent_voice_slots(voice_id) WHERE voice_id IS NOT NULL;
CREATE INDEX cf_permanent_voice_states_v1654 ON cf_permanent_voice_slots(state);
CREATE INDEX cf_permanent_voice_slots_pool_idx_v1654
 ON cf_permanent_voice_slots(provider_pool,state);

-- Verify: both counts must match; all existing assignments should still be primary/secondary.
SELECT 'current' AS source, COUNT(*) AS reservations FROM cf_permanent_voice_slots
UNION ALL
SELECT 'backup' AS source, COUNT(*) AS reservations FROM cf_permanent_voice_slots_v1650_backup;
SELECT provider_pool,COUNT(*) AS reservations,
 SUM(CASE WHEN voice_id IS NOT NULL THEN 1 ELSE 0 END) AS stored_voice_ids
FROM cf_permanent_voice_slots GROUP BY provider_pool;
