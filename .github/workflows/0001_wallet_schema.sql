-- CallFocus wallet D1 migration scaffold — NOT FOR CURRENT PRODUCTION ACTIVATION.
-- Execute only against a newly created dedicated CallFocus D1 database.
-- Creating these tables does not import or alter any existing Cloudflare KV wallets.
-- A future cutover must route ALL wallet mutations through this database atomically.
-- Do not treat this schema as an implemented payment receiver.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS wallet_accounts (
  user_id TEXT PRIMARY KEY,
  balance_seconds INTEGER NOT NULL CHECK (balance_seconds >= 0),
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  migrated_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wallet_journal (
  entry_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES wallet_accounts(user_id),
  entry_kind TEXT NOT NULL CHECK (entry_kind IN (
    'purchase','manual_purchase','referral_reward','admin_grant','admin_reset',
    'live_call','voice_note','video_charge','video_refund','wallet_adjustment'
  )),
  provider TEXT NOT NULL DEFAULT '',
  provider_reference TEXT,
  amount_kobo INTEGER,
  delta_seconds INTEGER NOT NULL,
  balance_after_seconds INTEGER NOT NULL CHECK (balance_after_seconds >= 0),
  happened_at TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}'
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_wallet_provider_reference
  ON wallet_journal(provider, provider_reference)
  WHERE provider_reference IS NOT NULL AND provider_reference != '';
CREATE INDEX IF NOT EXISTS idx_wallet_journal_user ON wallet_journal(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_journal_kind ON wallet_journal(entry_kind, recorded_at DESC);

CREATE TABLE IF NOT EXISTS pocketfi_account_mappings (
  account_number TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  merchant_business_id TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pocketfi_map_user ON pocketfi_account_mappings(user_id);

CREATE TABLE IF NOT EXISTS pocketfi_funding_intents (
  intent_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_number TEXT NOT NULL,
  expected_amount_kobo INTEGER NOT NULL CHECK (expected_amount_kobo > 0),
  base_credits_tenths INTEGER NOT NULL CHECK (base_credits_tenths > 0),
  bonus_credits_tenths INTEGER NOT NULL DEFAULT 0 CHECK (bonus_credits_tenths >= 0),
  total_seconds INTEGER NOT NULL CHECK (total_seconds > 0),
  state TEXT NOT NULL CHECK (state IN ('pending','matched','expired','review','cancelled')),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  matched_reference TEXT
);
CREATE INDEX IF NOT EXISTS idx_pocketfi_intent_account ON pocketfi_funding_intents(account_number, state, created_at DESC);

CREATE TABLE IF NOT EXISTS pocketfi_webhook_inbox (
  provider_reference TEXT PRIMARY KEY,
  payload_sha256 TEXT NOT NULL,
  account_number TEXT NOT NULL,
  amount_kobo INTEGER NOT NULL CHECK (amount_kobo > 0),
  merchant_business_id TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  delivery_count INTEGER NOT NULL DEFAULT 1,
  state TEXT NOT NULL CHECK (state IN ('received','matched','posted','review','duplicate')),
  matched_user_id TEXT,
  matched_intent_id TEXT,
  review_reason TEXT,
  posted_entry_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_pocketfi_inbox_state ON pocketfi_webhook_inbox(state, first_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_pocketfi_inbox_account ON pocketfi_webhook_inbox(account_number, first_seen_at DESC);

CREATE TABLE IF NOT EXISTS wallet_migration_audit (
  user_id TEXT PRIMARY KEY,
  kv_balance_seconds INTEGER NOT NULL,
  kv_revision INTEGER NOT NULL,
  imported_balance_seconds INTEGER,
  import_state TEXT NOT NULL CHECK (import_state IN ('pending','imported','verified','review')),
  observed_at TEXT NOT NULL,
  verified_at TEXT,
  review_reason TEXT
);

-- Future transaction rule (not implemented by SQL alone):
-- 1. Validate incoming signed payment against a unique mapping and stored quote.
-- 2. In one D1 transaction, insert unique provider reference + journal entry and
--    increment wallet_accounts.balance_seconds, with retry-safe idempotency.
-- 3. On a duplicate reference, return the existing posting without incrementing.
-- 4. ALL debits, grants, manual approvals, refunds and call settlements MUST share
--    the same authoritative D1 balance and journal. Do not dual-author KV/D1.
