-- CallFocus V16.37: enable multiple selectable affiliate withdrawal days.
-- RUN in the existing callfocus-affiliates D1 Console AFTER the V16.36 tables exist.
-- Safe to run more than once. Preserves your existing selected weekday.
-- Bit 0=Sunday, 1=Monday, ... 6=Saturday.
CREATE TABLE IF NOT EXISTS affiliate_withdrawal_days (
  id INTEGER PRIMARY KEY CHECK (id=1),
  days_mask INTEGER NOT NULL CHECK (days_mask BETWEEN 1 AND 127),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO affiliate_withdrawal_days (id,days_mask,updated_at)
SELECT 1, (1 << weekday), CURRENT_TIMESTAMP FROM affiliate_settings WHERE id=1;
