-- CallFocus Earn Referrals / financial ledger. Apply ONLY to the dedicated AFFILIATE_DB.
CREATE TABLE IF NOT EXISTS affiliate_settings (
 id INTEGER PRIMARY KEY CHECK (id=1), rate_bps INTEGER NOT NULL DEFAULT 3000 CHECK(rate_bps BETWEEN 0 AND 10000),
 weekday INTEGER NOT NULL DEFAULT 5 CHECK(weekday BETWEEN 0 AND 6),
 min_withdraw_kobo INTEGER NOT NULL DEFAULT 500000 CHECK(min_withdraw_kobo >= 10000),
 notification_email TEXT NOT NULL DEFAULT '',
 enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO affiliate_settings(id) VALUES (1);
CREATE TABLE IF NOT EXISTS affiliate_members (
 user_id TEXT PRIMARY KEY,
 display_name TEXT NOT NULL DEFAULT '',
 email TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','suspended')),
 referral_code TEXT UNIQUE,
 created_at TEXT NOT NULL,
 reviewed_at TEXT,
 reviewed_note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS affiliate_members_status ON affiliate_members(status,created_at);
CREATE TABLE IF NOT EXISTS affiliate_signups (
 invited_user_id TEXT PRIMARY KEY,
 affiliate_id TEXT NOT NULL,
 referral_code TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS affiliate_signups_owner ON affiliate_signups(affiliate_id,created_at);
CREATE TABLE IF NOT EXISTS affiliate_commissions (
 id TEXT PRIMARY KEY,
 affiliate_id TEXT NOT NULL,
 invited_user_id TEXT NOT NULL,
 provider TEXT NOT NULL,
 payment_reference TEXT NOT NULL,
 gross_kobo INTEGER NOT NULL CHECK(gross_kobo > 0),
 rate_bps INTEGER NOT NULL,
 commission_kobo INTEGER NOT NULL CHECK(commission_kobo >= 0),
 status TEXT NOT NULL DEFAULT 'earned' CHECK(status IN ('earned','reversed')),
 created_at TEXT NOT NULL,
 UNIQUE(provider,payment_reference)
);
CREATE INDEX IF NOT EXISTS affiliate_commissions_owner ON affiliate_commissions(affiliate_id,created_at);
CREATE TABLE IF NOT EXISTS affiliate_withdrawals (
 id TEXT PRIMARY KEY,
 affiliate_id TEXT NOT NULL,
 amount_kobo INTEGER NOT NULL CHECK(amount_kobo > 0),
 bank_name TEXT NOT NULL,
 account_name TEXT NOT NULL,
 account_number TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','approved','paid','rejected')),
 requested_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 decision_note TEXT NOT NULL DEFAULT '',
 transfer_reference TEXT NOT NULL DEFAULT '',
 email_token_hash TEXT,
 email_token_expires INTEGER,
 notification_status TEXT NOT NULL DEFAULT 'pending'
);
CREATE UNIQUE INDEX IF NOT EXISTS affiliate_one_open_withdrawal ON affiliate_withdrawals(affiliate_id) WHERE status IN ('requested','approved');
CREATE INDEX IF NOT EXISTS affiliate_withdrawals_status ON affiliate_withdrawals(status,requested_at);
CREATE INDEX IF NOT EXISTS affiliate_withdrawals_owner ON affiliate_withdrawals(affiliate_id,requested_at);
CREATE TABLE IF NOT EXISTS affiliate_audit (
 id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, subject_id TEXT NOT NULL,
 details TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);
