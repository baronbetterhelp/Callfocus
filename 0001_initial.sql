PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  full_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  phone TEXT,
  country TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  preferred_theme TEXT,
  profile_image_key TEXT,
  email_verified_at TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled','deletion_requested')),
  deletion_requested_at TEXT,
  last_active_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  csrf_token TEXT NOT NULL,
  user_agent TEXT,
  ip_hint TEXT,
  device_label TEXT,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK(purpose IN ('verify_email','reset_password')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS apps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon_key TEXT,
  url TEXT,
  short_description TEXT NOT NULL DEFAULT '',
  long_description TEXT NOT NULL DEFAULT '',
  category_id INTEGER REFERENCES app_categories(id) ON DELETE SET NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','private')),
  subscription_required INTEGER NOT NULL DEFAULT 0,
  required_plan_id INTEGER,
  status TEXT NOT NULL DEFAULT 'online' CHECK(status IN ('online','maintenance','coming_soon','private','disabled')),
  maintenance_message TEXT,
  badge_new INTEGER NOT NULL DEFAULT 0,
  badge_beta INTEGER NOT NULL DEFAULT 0,
  badge_popular INTEGER NOT NULL DEFAULT 0,
  badge_featured INTEGER NOT NULL DEFAULT 0,
  accent_color TEXT NOT NULL DEFAULT '#7C5CFF',
  screenshots_json TEXT NOT NULL DEFAULT '[]',
  version_label TEXT,
  updated_note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(required_plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS app_favorites (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id, app_id)
);

CREATE TABLE IF NOT EXISTS app_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'open' CHECK(event_type IN ('open','view')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  price_minor INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  billing_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK(billing_frequency IN ('one_time','monthly','quarterly','yearly','custom')),
  billing_interval_days INTEGER,
  description TEXT NOT NULL DEFAULT '',
  features_json TEXT NOT NULL DEFAULT '[]',
  enabled_apps_json TEXT NOT NULL DEFAULT '[]',
  support_level TEXT NOT NULL DEFAULT 'standard',
  trial_days INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id INTEGER NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('trialing','active','past_due','cancelled','expired','gifted')),
  starts_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  current_period_start TEXT,
  current_period_end TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  provider TEXT,
  provider_subscription_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
  plan_id INTEGER REFERENCES subscription_plans(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  provider_reference TEXT NOT NULL UNIQUE,
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','success','failed','refunded','cancelled')),
  payment_method TEXT,
  provider_payload_json TEXT,
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  image_key TEXT,
  scope TEXT NOT NULL DEFAULT 'ecosystem' CHECK(scope IN ('ecosystem','single_app','multiple_apps')),
  app_ids_json TEXT NOT NULL DEFAULT '[]',
  priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('normal','important','urgent')),
  update_type TEXT NOT NULL DEFAULT 'announcement' CHECK(update_type IN ('new','important','maintenance','feature','security','announcement')),
  external_url TEXT,
  cta_label TEXT,
  pinned INTEGER NOT NULL DEFAULT 0,
  publish_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,
  send_notification INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft','published','archived')),
  created_by_admin_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS update_reads (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  update_id INTEGER NOT NULL REFERENCES updates(id) ON DELETE CASCADE,
  read_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id, update_id)
);

CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference_number TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  app_id INTEGER REFERENCES apps(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  initial_message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received' CHECK(status IN ('received','under_review','in_progress','resolved','closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),
  attachments_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS request_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK(sender_type IN ('user','admin','system')),
  sender_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  sender_admin_id INTEGER,
  message TEXT NOT NULL,
  attachments_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'announcement',
  importance TEXT NOT NULL DEFAULT 'normal' CHECK(importance IN ('normal','important','urgent')),
  destination_type TEXT,
  destination_value TEXT,
  audience_type TEXT NOT NULL DEFAULT 'all' CHECK(audience_type IN ('all','single_user','selected_users','plan','app_users')),
  audience_value_json TEXT NOT NULL DEFAULT '[]',
  created_by_admin_id INTEGER,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delivered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at TEXT,
  dismissed_at TEXT,
  UNIQUE(notification_id, user_id)
);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK(role IN ('owner','admin','support','billing','editor','viewer')),
  enabled INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  csrf_token TEXT NOT NULL,
  user_agent TEXT,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS promo_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  image_key TEXT,
  icon_key TEXT,
  destination_url TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  target_audience TEXT NOT NULL DEFAULT 'all',
  target_value_json TEXT NOT NULL DEFAULT '[]',
  opening_delay_ms INTEGER NOT NULL DEFAULT 2500,
  closing_delay_ms INTEGER,
  start_at TEXT,
  expires_at TEXT,
  display_mode TEXT NOT NULL DEFAULT 'card' CHECK(display_mode IN ('card','popup','floating')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_by_admin_id INTEGER,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details_json TEXT NOT NULL DEFAULT '{}',
  ip_hint TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  window_started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_customer_id ON users(customer_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_sessions_user_expires ON sessions(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_apps_enabled_order ON apps(enabled, display_order, name);
CREATE INDEX IF NOT EXISTS idx_apps_category ON apps(category_id);
CREATE INDEX IF NOT EXISTS idx_app_activity_user_created ON app_activity(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_activity_app_created ON app_activity(app_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status, current_period_end);
CREATE INDEX IF NOT EXISTS idx_payments_user_created ON payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_updates_publish ON updates(status, publish_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_user_created ON requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_receipts_user ON notification_receipts(user_id, read_at, dismissed_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

INSERT OR IGNORE INTO settings(key, value_json) VALUES
  ('default_theme', '"midnight"'),
  ('allow_user_theme', 'true'),
  ('dock_apps_enabled', 'true'),
  ('dock_updates_enabled', 'true'),
  ('dock_requests_enabled', 'true'),
  ('dock_settings_enabled', 'true'),
  ('support_email', '"support@example.com"'),
  ('request_attachments_enabled', 'true'),
  ('floating_promo_enabled', 'true');

INSERT OR IGNORE INTO app_categories(name, slug, display_order) VALUES
  ('Communication', 'communication', 10),
  ('Productivity', 'productivity', 20),
  ('Education', 'education', 30),
  ('Utilities', 'utilities', 40);

INSERT OR IGNORE INTO subscription_plans(name, slug, price_minor, currency, billing_frequency, description, features_json, support_level, display_order) VALUES
  ('Free', 'free', 0, 'NGN', 'monthly', 'Core ecosystem access.', '["Core app access","Ecosystem updates","Standard support"]', 'standard', 10),
  ('Plus', 'plus', 500000, 'NGN', 'monthly', 'Expanded access for active customers.', '["Everything in Free","Plus app access","Priority support"]', 'priority', 20),
  ('Premium', 'premium', 1000000, 'NGN', 'monthly', 'Full premium ecosystem access.', '["Everything in Plus","Premium app access","Priority support","Early access"]', 'priority', 30);
