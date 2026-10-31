ALTER TABLE cf_permanent_voice_slots ADD COLUMN purchase_id TEXT;
CREATE UNIQUE INDEX cf_permanent_voice_purchase_id_idx_v1658 ON cf_permanent_voice_slots(purchase_id) WHERE purchase_id IS NOT NULL;
CREATE TABLE cf_permanent_voice_slot_purchases (
 purchase_id TEXT PRIMARY KEY NOT NULL,
 user_id TEXT NOT NULL,
 price_credits INTEGER NOT NULL CHECK(price_credits=1000),
 price_seconds INTEGER NOT NULL CHECK(price_seconds=600),
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','charging','paid','cancelled')),
 created_at TEXT NOT NULL,
 claim_at TEXT,
 paid_at TEXT
);
CREATE INDEX cf_permanent_voice_slot_purchases_user_idx_v1658 ON cf_permanent_voice_slot_purchases(user_id,state);
SELECT COUNT(*) AS reservations, COUNT(voice_id) AS saved_voices FROM cf_permanent_voice_slots;
