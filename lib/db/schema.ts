export const SCHEMA = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clinics (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  technical_manager TEXT NOT NULL DEFAULT '',
  crmv TEXT NOT NULL DEFAULT '',
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  onboarding_completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  clinic_id TEXT NOT NULL REFERENCES clinics(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  role TEXT NOT NULL CHECK (role IN ('owner','admin','operator','approver','viewer')),
  created_at TEXT NOT NULL,
  UNIQUE (user_id, clinic_id)
);

CREATE TABLE IF NOT EXISTS brand_preferences (
  clinic_id TEXT PRIMARY KEY REFERENCES clinics(id),
  formality TEXT NOT NULL CHECK (formality IN ('formal','cordial','acolhedor')),
  emoji_policy TEXT NOT NULL CHECK (emoji_policy IN ('none','rare')),
  preferred_phrases TEXT NOT NULL DEFAULT '[]',
  avoided_phrases TEXT NOT NULL DEFAULT '[]',
  sign_off TEXT NOT NULL DEFAULT '',
  communication_rules TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS brand_memory_entries (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES clinics(id),
  kind TEXT NOT NULL CHECK (kind IN ('explicit_rule','approved_example','preferred_expression','avoided_expression')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL CHECK (source IN ('user','system_proposal')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES clinics(id),
  key TEXT NOT NULL CHECK (key IN ('bruno','lucas')),
  display_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active','paused')),
  updated_at TEXT NOT NULL,
  UNIQUE (clinic_id, key)
);

CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES clinics(id),
  agent_key TEXT NOT NULL,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  objective TEXT NOT NULL,
  autonomy TEXT NOT NULL CHECK (autonomy IN ('suggestion','supervised','restricted')),
  status TEXT NOT NULL CHECK (status IN ('active','paused')),
  config_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (clinic_id, key)
);

CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES clinics(id),
  provider TEXT NOT NULL CHECK (provider IN ('google_business','whatsapp_cloud')),
  status TEXT NOT NULL,
  external_account_id TEXT,
  location_resource TEXT,
  location_title TEXT,
  last_sync_at TEXT,
  last_error TEXT,
  scopes TEXT,
  public_config_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  UNIQUE (clinic_id, provider)
);

CREATE TABLE IF NOT EXISTS integration_secrets (
  integration_id TEXT PRIMARY KEY REFERENCES integrations(id),
  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES clinics(id),
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  provider_resource TEXT,
  author_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  reviewed_at TEXT NOT NULL,
  reply_state TEXT NOT NULL CHECK (reply_state IN ('unanswered','suggestion_ready','approved_pending_publish','published','publish_failed','discarded')),
  published_reply TEXT,
  published_at TEXT,
  publish_error TEXT,
  source_mode TEXT NOT NULL CHECK (source_mode IN ('demonstration','provider')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (clinic_id, provider, external_id)
);

CREATE TABLE IF NOT EXISTS review_reply_suggestions (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES reviews(id),
  clinic_id TEXT NOT NULL REFERENCES clinics(id),
  body TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','edited','approved','rejected','superseded')),
  model_label TEXT NOT NULL,
  policy_notes TEXT NOT NULL DEFAULT '[]',
  applied_memory TEXT NOT NULL DEFAULT '[]',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES clinics(id),
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved','rejected')),
  decided_by TEXT,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  decided_at TEXT
);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES clinics(id),
  display_name TEXT NOT NULL,
  phone_e164 TEXT NOT NULL,
  consent_status TEXT NOT NULL CHECK (consent_status IN ('opted_in','opted_out','unknown')),
  consent_source TEXT NOT NULL,
  source_mode TEXT NOT NULL CHECK (source_mode IN ('demonstration','provider')),
  created_at TEXT NOT NULL,
  UNIQUE (clinic_id, phone_e164)
);

CREATE TABLE IF NOT EXISTS message_templates (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES clinics(id),
  workflow_id TEXT NOT NULL REFERENCES workflows(id),
  name TEXT NOT NULL,
  provider_template_name TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'pt_BR',
  body TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workflow_runs (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES clinics(id),
  workflow_id TEXT NOT NULL REFERENCES workflows(id),
  contact_id TEXT NOT NULL REFERENCES contacts(id),
  status TEXT NOT NULL,
  scheduled_for TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outbound_messages (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES clinics(id),
  workflow_run_id TEXT NOT NULL REFERENCES workflow_runs(id),
  contact_id TEXT NOT NULL REFERENCES contacts(id),
  template_id TEXT,
  body_rendered TEXT NOT NULL,
  state TEXT NOT NULL,
  provider_message_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  inbound_excerpt TEXT,
  accepted_at TEXT,
  sent_at TEXT,
  delivered_at TEXT,
  read_at TEXT,
  replied_at TEXT,
  source_mode TEXT NOT NULL CHECK (source_mode IN ('demonstration','provider')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  clinic_id TEXT,
  provider TEXT NOT NULL,
  external_event_id TEXT NOT NULL UNIQUE,
  payload_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  received_at TEXT NOT NULL,
  processed_at TEXT
);

CREATE TABLE IF NOT EXISTS activity_events (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES clinics(id),
  kind TEXT NOT NULL CHECK (kind IN ('info','failure','action_required')),
  actor_type TEXT NOT NULL,
  actor_key TEXT NOT NULL,
  actor_label TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  subject_type TEXT,
  subject_id TEXT,
  result TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reviews_clinic_state ON reviews (clinic_id, reply_state);
CREATE INDEX IF NOT EXISTS idx_messages_clinic_state ON outbound_messages (clinic_id, state);
CREATE INDEX IF NOT EXISTS idx_activity_clinic_created ON activity_events (clinic_id, created_at);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_runs_workflow ON workflow_runs (clinic_id, workflow_id);
`;
