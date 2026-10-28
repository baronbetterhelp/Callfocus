-- CallFocus V16.50: required ONE-TIME migration, callfocus-wallet D1.
-- Run BEFORE deploying V16.50. Do not run twice (SQLite ADD COLUMN is not idempotent).
-- Existing reservations are assigned to Account 1; existing saved voices never move accounts.
ALTER TABLE cf_permanent_voice_slots ADD COLUMN provider_pool TEXT NOT NULL DEFAULT 'primary' CHECK(provider_pool IN ('primary','secondary'));
CREATE INDEX IF NOT EXISTS cf_permanent_voice_slots_pool_idx ON cf_permanent_voice_slots(provider_pool,state);
-- Verification query (should show existing bookings in primary):
SELECT provider_pool,COUNT(*) AS bookings FROM cf_permanent_voice_slots GROUP BY provider_pool;
