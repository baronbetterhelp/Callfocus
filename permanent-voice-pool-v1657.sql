-- CallFocus V16.57: ONE-TIME, BACKUP FIRST. Run ONLY on callfocus-wallet D1.
-- Do not run V16.54 again. Pause new bookings and voice creation during migration.
-- Enables automatic additional account pools and tracks administrative releases.
-- Original rows preserved, and prior table retained as v1656_backup.
CREATE TABLE cf_permanent_voice_slots_v1657 (
 user_id TEXT PRIMARY KEY NOT NULL,
 booked_at TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'booked' CHECK(state IN ('booked','creating','verification','ready','failed')),
 voice_id TEXT,voice_name TEXT,create_token TEXT,create_started_at TEXT,created_at TEXT,
 updated_at TEXT NOT NULL,
 provider_pool TEXT NOT NULL DEFAULT 'primary' CHECK(provider_pool IN ('primary','secondary','tertiary','pool4','pool5','pool6','pool7','pool8','pool9','pool10')),
 release_id TEXT
);
INSERT INTO cf_permanent_voice_slots_v1657
(user_id,booked_at,state,voice_id,voice_name,create_token,create_started_at,created_at,updated_at,provider_pool,release_id)
SELECT user_id,booked_at,state,voice_id,voice_name,create_token,create_started_at,created_at,updated_at,provider_pool,NULL
FROM cf_permanent_voice_slots;
ALTER TABLE cf_permanent_voice_slots RENAME TO cf_permanent_voice_slots_v1656_backup;
ALTER TABLE cf_permanent_voice_slots_v1657 RENAME TO cf_permanent_voice_slots;
CREATE UNIQUE INDEX cf_permanent_voice_ids_v1657 ON cf_permanent_voice_slots(voice_id) WHERE voice_id IS NOT NULL;
CREATE INDEX cf_permanent_voice_states_v1657 ON cf_permanent_voice_slots(state);
CREATE INDEX cf_permanent_voice_slots_pool_idx_v1657 ON cf_permanent_voice_slots(provider_pool,state);
CREATE INDEX cf_permanent_voice_release_idx_v1657 ON cf_permanent_voice_slots(release_id);
CREATE TABLE IF NOT EXISTS cf_permanent_voice_release_audit(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 release_id TEXT NOT NULL,
 user_id TEXT NOT NULL,
 booked_at TEXT NOT NULL,
 provider_pool TEXT NOT NULL,
 released_at TEXT NOT NULL,
 UNIQUE(release_id,user_id)
);
CREATE INDEX IF NOT EXISTS cf_permanent_voice_release_by_user ON cf_permanent_voice_release_audit(user_id,release_id);
-- Verify row counts and saved voice IDs match exactly before deploying:
SELECT 'active' AS source,COUNT(*) AS bookings,COUNT(voice_id) AS saved_voice_ids FROM cf_permanent_voice_slots
UNION ALL
SELECT 'backup',COUNT(*),COUNT(voice_id) FROM cf_permanent_voice_slots_v1656_backup;
