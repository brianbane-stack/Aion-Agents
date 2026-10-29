import "server-only";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/client";
import { likeTerm, nowIso, readStringArray } from "@/lib/format";
import { decryptSecret, encryptSecret } from "@/lib/security/secrets";
import type {
  Autonomy,
  MemoryContext,
  MessageState,
  ReviewState,
  Role,
  RunState,
  SourceMode,
  WorkflowConfig,
} from "@/types/domain";
import { workflowBlueprints } from "@/lib/workflows/blueprints";

type Sql = string | number | null | bigint;

function all<T extends Record<string, Sql>>(sql: string, params: Sql[] = []) {
  return getDb().prepare(sql).all(...params) as T[];
}

function one<T extends Record<string, Sql>>(sql: string, params: Sql[] = []) {
  return getDb().prepare(sql).get(...params) as T | undefined;
}

function run(sql: string, params: Sql[] = []) {
  return getDb().prepare(sql).run(...params);
}

export function transaction<T>(fn: () => T) {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export type UserRecord = { id: string; email: string; name: string; passwordHash: string };
export type MembershipRecord = {
  id: string;
  userId: string;
  clinicId: string;
  organizationId: string;
  role: Role;
  clinicName: string;
  onboardingCompleted: boolean;
};
export type ClinicRecord = {
  id: string;
  organizationId: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  technicalManager: string;
  crmv: string;
  timezone: string;
  onboardingCompleted: boolean;
};
export type ReviewRecord = {
  id: string;
  clinicId: string;
  externalId: string;
  providerResource: string | null;
  authorName: string;
  rating: number;
  comment: string;
  reviewedAt: string;
  replyState: ReviewState;
  publishedReply: string | null;
  publishedAt: string | null;
  publishError: string | null;
  sourceMode: SourceMode;
};
export type SuggestionRecord = {
  id: string;
  reviewId: string;
  clinicId: string;
  body: string;
  status: string;
  modelLabel: string;
  policyNotes: string[];
  appliedMemory: string[];
  createdBy: string;
  createdAt: string;
};
export type WorkflowRecord = {
  id: string;
  clinicId: string;
  agentKey: "bruno" | "lucas";
  key: string;
  name: string;
  objective: string;
  autonomy: Autonomy;
  status: "active" | "paused";
  config: WorkflowConfig;
};
export type TemplateRecord = {
  id: string;
  workflowId: string;
  name: string;
  providerTemplateName: string;
  language: string;
  body: string;
};
export type ContactRecord = {
  id: string;
  clinicId: string;
  displayName: string;
  phoneE164: string;
  consentStatus: "opted_in" | "opted_out" | "unknown";
  consentSource: string;
  sourceMode: SourceMode;
};
export type MessageRecord = {
  id: string;
  clinicId: string;
  workflowRunId: string;
  workflowId: string;
  contactId: string;
  contactName: string;
  phoneE164: string;
  bodyRendered: string;
  state: MessageState;
  providerMessageId: string | null;
  idempotencyKey: string;
  attemptCount: number;
  lastError: string | null;
  inboundExcerpt: string | null;
  acceptedAt: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  repliedAt: string | null;
  sourceMode: SourceMode;
  runStatus: RunState;
  createdAt: string;
};
export type ActivityRecord = {
  id: string;
  clinicId: string;
  kind: "info" | "failure" | "action_required";
  actorType: string;
  actorKey: string;
  actorLabel: string;
  title: string;
  detail: string;
  subjectType: string | null;
  subjectId: string | null;
  result: string;
  createdAt: string;
};
export type IntegrationRecord = {
  id: string;
  clinicId: string;
  provider: "google_business" | "whatsapp_cloud";
  status: string;
  externalAccountId: string | null;
  locationResource: string | null;
  locationTitle: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  scopes: string;
  publicConfig: Record<string, string | boolean>;
};
export type AgentRecord = { id: string; key: "bruno" | "lucas"; displayName: string; status: "active" | "paused" };
export type MemoryEntry = {
  id: string;
  kind: string;
  title: string;
  body: string;
  active: boolean;
  source: string;
  createdAt: string;
  updatedAt: string;
};

function mapReview(row: Record<string, Sql>): ReviewRecord {
  return {
    id: String(row.id),
    clinicId: String(row.clinic_id),
    externalId: String(row.external_id),
    providerResource: row.provider_resource ? String(row.provider_resource) : null,
    authorName: String(row.author_name),
    rating: Number(row.rating),
    comment: String(row.comment ?? ""),
    reviewedAt: String(row.reviewed_at),
    replyState: String(row.reply_state) as ReviewState,
    publishedReply: row.published_reply ? String(row.published_reply) : null,
    publishedAt: row.published_at ? String(row.published_at) : null,
    publishError: row.publish_error ? String(row.publish_error) : null,
    sourceMode: String(row.source_mode) as SourceMode,
  };
}

export function findUserByEmail(email: string) {
  const row = one<Record<string, Sql>>("SELECT id, email, name, password_hash FROM users WHERE email = ?", [email.toLowerCase()]);
  if (!row) return undefined;
  return { id: String(row.id), email: String(row.email), name: String(row.name), passwordHash: String(row.password_hash) };
}

export function findUserById(id: string) {
  const row = one<Record<string, Sql>>("SELECT id, email, name, password_hash FROM users WHERE id = ?", [id]);
  if (!row) return undefined;
  return { id: String(row.id), email: String(row.email), name: String(row.name), passwordHash: String(row.password_hash) };
}

export function membershipsForUser(userId: string): MembershipRecord[] {
  return all<Record<string, Sql>>(
    `SELECT m.id, m.user_id, m.clinic_id, m.organization_id, m.role, c.name AS clinic_name, c.onboarding_completed
     FROM memberships m JOIN clinics c ON c.id = m.clinic_id WHERE m.user_id = ? ORDER BY c.name`,
    [userId],
  ).map((row) => ({
    id: String(row.id),
    userId: String(row.user_id),
    clinicId: String(row.clinic_id),
    organizationId: String(row.organization_id),
    role: String(row.role) as Role,
    clinicName: String(row.clinic_name),
    onboardingCompleted: Number(row.onboarding_completed) === 1,
  }));
}

export function getClinic(clinicId: string): ClinicRecord | undefined {
  const row = one<Record<string, Sql>>("SELECT * FROM clinics WHERE id = ?", [clinicId]);
  if (!row) return undefined;
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    name: String(row.name),
    phone: String(row.phone),
    email: String(row.email),
    address: String(row.address),
    city: String(row.city),
    state: String(row.state),
    technicalManager: String(row.technical_manager),
    crmv: String(row.crmv),
    timezone: String(row.timezone),
    onboardingCompleted: Number(row.onboarding_completed) === 1,
  };
}

export function getBrandPreferences(clinicId: string) {
  const memory = loadMemory(clinicId);
  const prefs = one<Record<string, Sql>>("SELECT communication_rules FROM brand_preferences WHERE clinic_id = ?", [clinicId]);
  return {
    ...memory,
    communicationRules: prefs ? String(prefs.communication_rules) : "",
  };
}

export function oldestOpenReview(clinicId: string) {
  const row = one<Record<string, Sql>>(
    `SELECT id FROM reviews WHERE clinic_id = ? AND reply_state IN ('unanswered', 'suggestion_ready') ORDER BY reviewed_at ASC LIMIT 1`,
    [clinicId],
  );
  return row ? String(row.id) : null;
}

export function loadMemory(clinicId: string): MemoryContext {
  const prefs = one<Record<string, Sql>>("SELECT * FROM brand_preferences WHERE clinic_id = ?", [clinicId]);
  const entries = listMemory(clinicId).filter((entry) => entry.active);
  const preferred = new Set<string>(readStringArray(prefs ? String(prefs.preferred_phrases) : "[]"));
  const avoided = new Set<string>(readStringArray(prefs ? String(prefs.avoided_phrases) : "[]"));
  const explicitRules: string[] = [];
  const approvedExamples: string[] = [];
  for (const entry of entries) {
    if (entry.kind === "preferred_expression") preferred.add(entry.body);
    if (entry.kind === "avoided_expression") avoided.add(entry.body);
    if (entry.kind === "explicit_rule") explicitRules.push(entry.body);
    if (entry.kind === "approved_example") approvedExamples.push(entry.body);
  }
  return {
    formality: (prefs ? String(prefs.formality) : "cordial") as MemoryContext["formality"],
    emojiPolicy: (prefs ? String(prefs.emoji_policy) : "none") as MemoryContext["emojiPolicy"],
    preferredPhrases: [...preferred],
    avoidedPhrases: [...avoided],
    signOff: prefs ? String(prefs.sign_off) : "",
    explicitRules,
    approvedExamples,
  };
}

export function updateClinicProfile(clinicId: string, input: Omit<ClinicRecord, "id" | "organizationId" | "onboardingCompleted" | "timezone"> & MemoryContext & { communicationRules: string }) {
  const now = nowIso();
  transaction(() => {
    run(
      `UPDATE clinics SET name = ?, phone = ?, email = ?, address = ?, city = ?, state = ?, technical_manager = ?, crmv = ?, updated_at = ? WHERE id = ?`,
      [input.name, input.phone, input.email, input.address, input.city, input.state, input.technicalManager, input.crmv, now, clinicId],
    );
    run(
      `UPDATE brand_preferences SET formality = ?, emoji_policy = ?, preferred_phrases = ?, avoided_phrases = ?, sign_off = ?, communication_rules = ?, updated_at = ? WHERE clinic_id = ?`,
      [input.formality, input.emojiPolicy, JSON.stringify(input.preferredPhrases), JSON.stringify(input.avoidedPhrases), input.signOff, input.communicationRules, now, clinicId],
    );
  });
}

export function markOnboardingComplete(clinicId: string) {
  run("UPDATE clinics SET onboarding_completed = 1, updated_at = ? WHERE id = ?", [nowIso(), clinicId]);
}

export function listMemory(clinicId: string): MemoryEntry[] {
  return all<Record<string, Sql>>(
    "SELECT * FROM brand_memory_entries WHERE clinic_id = ? ORDER BY created_at DESC",
    [clinicId],
  ).map((row) => ({
    id: String(row.id),
    kind: String(row.kind),
    title: String(row.title),
    body: String(row.body),
    active: Number(row.active) === 1,
    source: String(row.source),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

export function getMemory(clinicId: string, id: string) {
  return listMemory(clinicId).find((entry) => entry.id === id);
}

export function insertMemory(clinicId: string, input: { kind: string; title: string; body: string; source: "user" | "system_proposal"; active?: boolean }) {
  const id = randomUUID();
  const now = nowIso();
  run(
    `INSERT INTO brand_memory_entries (id, clinic_id, kind, title, body, active, source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, clinicId, input.kind, input.title, input.body, input.active === false ? 0 : 1, input.source, now, now],
  );
  return id;
}

export function setMemoryActive(clinicId: string, id: string, active: boolean) {
  const result = run("UPDATE brand_memory_entries SET active = ?, updated_at = ? WHERE id = ? AND clinic_id = ?", [active ? 1 : 0, nowIso(), id, clinicId]);
  return result.changes > 0;
}

export function deleteMemory(clinicId: string, id: string) {
  return run("DELETE FROM brand_memory_entries WHERE id = ? AND clinic_id = ?", [id, clinicId]).changes > 0;
}

export function replacePhraseList(clinicId: string, field: "preferred_phrases" | "avoided_phrases", phrases: string[]) {
  const now = nowIso();
  const payload = JSON.stringify(phrases);
  if (field === "preferred_phrases") {
    run("UPDATE brand_preferences SET preferred_phrases = ?, updated_at = ? WHERE clinic_id = ?", [payload, now, clinicId]);
    return;
  }
  run("UPDATE brand_preferences SET avoided_phrases = ?, updated_at = ? WHERE clinic_id = ?", [payload, now, clinicId]);
}

export function listAgents(clinicId: string): AgentRecord[] {
  return all<Record<string, Sql>>("SELECT * FROM agents WHERE clinic_id = ? ORDER BY key", [clinicId]).map((row) => ({
    id: String(row.id),
    key: String(row.key) as "bruno" | "lucas",
    displayName: String(row.display_name),
    status: String(row.status) as "active" | "paused",
  }));
}

export function setAgentStatus(clinicId: string, key: "bruno" | "lucas", status: "active" | "paused") {
  return run("UPDATE agents SET status = ?, updated_at = ? WHERE clinic_id = ? AND key = ?", [status, nowIso(), clinicId, key]).changes > 0;
}

function mapWorkflow(row: Record<string, Sql>): WorkflowRecord {
  const parsed = JSON.parse(String(row.config_json)) as WorkflowConfig;
  return {
    id: String(row.id),
    clinicId: String(row.clinic_id),
    agentKey: String(row.agent_key) as "bruno" | "lucas",
    key: String(row.key),
    name: String(row.name),
    objective: String(row.objective),
    autonomy: String(row.autonomy) as Autonomy,
    status: String(row.status) as "active" | "paused",
    config: parsed,
  };
}

export function listWorkflows(clinicId: string) {
  return all<Record<string, Sql>>("SELECT * FROM workflows WHERE clinic_id = ? ORDER BY name", [clinicId]).map(mapWorkflow);
}

export function getWorkflow(clinicId: string, id: string) {
  const row = one<Record<string, Sql>>("SELECT * FROM workflows WHERE clinic_id = ? AND id = ?", [clinicId, id]);
  return row ? mapWorkflow(row) : undefined;
}

export function updateWorkflow(clinicId: string, id: string, input: { autonomy: Autonomy; status: "active" | "paused"; config: WorkflowConfig }) {
  return run(
    "UPDATE workflows SET autonomy = ?, status = ?, config_json = ?, updated_at = ? WHERE clinic_id = ? AND id = ?",
    [input.autonomy, input.status, JSON.stringify(input.config), nowIso(), clinicId, id],
  ).changes > 0;
}

export function getTemplate(clinicId: string, workflowId: string): TemplateRecord | undefined {
  const row = one<Record<string, Sql>>("SELECT * FROM message_templates WHERE clinic_id = ? AND workflow_id = ?", [clinicId, workflowId]);
  if (!row) return undefined;
  return {
    id: String(row.id),
    workflowId: String(row.workflow_id),
    name: String(row.name),
    providerTemplateName: String(row.provider_template_name),
    language: String(row.language),
    body: String(row.body),
  };
}

export function updateTemplate(clinicId: string, workflowId: string, body: string, providerTemplateName: string) {
  return run(
    "UPDATE message_templates SET body = ?, provider_template_name = ?, updated_at = ? WHERE clinic_id = ? AND workflow_id = ?",
    [body, providerTemplateName, nowIso(), clinicId, workflowId],
  ).changes > 0;
}

export function listReviews(clinicId: string, filter: { state?: string; rating?: number; query?: string } = {}) {
  const clauses = ["clinic_id = ?"];
  const params: Sql[] = [clinicId];
  const allowed = new Set(["unanswered", "suggestion_ready", "approved_pending_publish", "published", "publish_failed", "discarded"]);
  if (filter.state && allowed.has(filter.state)) {
    clauses.push("reply_state = ?");
    params.push(filter.state);
  }
  if (filter.rating && filter.rating >= 1 && filter.rating <= 5) {
    clauses.push("rating = ?");
    params.push(filter.rating);
  }
  if (filter.query) {
    clauses.push("(author_name LIKE ? OR comment LIKE ?)");
    const term = likeTerm(filter.query);
    params.push(term, term);
  }
  return all<Record<string, Sql>>(
    `SELECT * FROM reviews WHERE ${clauses.join(" AND ")} ORDER BY reviewed_at DESC LIMIT 100`,
    params,
  ).map(mapReview);
}

export function getReview(clinicId: string, id: string) {
  const row = one<Record<string, Sql>>("SELECT * FROM reviews WHERE clinic_id = ? AND id = ?", [clinicId, id]);
  return row ? mapReview(row) : undefined;
}

export function listSuggestions(clinicId: string, reviewId: string): SuggestionRecord[] {
  return all<Record<string, Sql>>(
    "SELECT * FROM review_reply_suggestions WHERE clinic_id = ? AND review_id = ? ORDER BY created_at DESC",
    [clinicId, reviewId],
  ).map((row) => ({
    id: String(row.id),
    reviewId: String(row.review_id),
    clinicId: String(row.clinic_id),
    body: String(row.body),
    status: String(row.status),
    modelLabel: String(row.model_label),
    policyNotes: readStringArray(String(row.policy_notes)),
    appliedMemory: readStringArray(String(row.applied_memory)),
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
  }));
}

export function getSuggestion(clinicId: string, id: string) {
  const row = one<Record<string, Sql>>("SELECT * FROM review_reply_suggestions WHERE clinic_id = ? AND id = ?", [clinicId, id]);
  if (!row) return undefined;
  return listSuggestions(clinicId, String(row.review_id)).find((item) => item.id === id);
}

export function insertSuggestion(input: { reviewId: string; clinicId: string; body: string; modelLabel: string; policyNotes: string[]; appliedMemory: string[]; createdBy: string }) {
  const id = randomUUID();
  run(
    `INSERT INTO review_reply_suggestions (id, review_id, clinic_id, body, status, model_label, policy_notes, applied_memory, created_by, created_at)
     VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)`,
    [id, input.reviewId, input.clinicId, input.body, input.modelLabel, JSON.stringify(input.policyNotes), JSON.stringify(input.appliedMemory), input.createdBy, nowIso()],
  );
  return id;
}

export function updateSuggestionBody(clinicId: string, id: string, body: string, policyNotes: string[]) {
  return run(
    "UPDATE review_reply_suggestions SET body = ?, status = 'edited', policy_notes = ? WHERE clinic_id = ? AND id = ?",
    [body, JSON.stringify(policyNotes), clinicId, id],
  ).changes > 0;
}

export function setSuggestionStatus(clinicId: string, id: string, status: string) {
  run("UPDATE review_reply_suggestions SET status = ? WHERE clinic_id = ? AND id = ?", [status, clinicId, id]);
}

export function supersedeOtherSuggestions(clinicId: string, reviewId: string, keepId: string) {
  run(
    "UPDATE review_reply_suggestions SET status = 'superseded' WHERE clinic_id = ? AND review_id = ? AND id <> ? AND status IN ('draft','edited','approved')",
    [clinicId, reviewId, keepId],
  );
}

export function setReviewState(clinicId: string, id: string, patch: Partial<{ replyState: ReviewState; publishedReply: string | null; publishedAt: string | null; publishError: string | null; providerResource: string | null }>) {
  const current = getReview(clinicId, id);
  if (!current) return false;
  run(
    `UPDATE reviews SET reply_state = ?, published_reply = ?, published_at = ?, publish_error = ?, provider_resource = ?, updated_at = ? WHERE clinic_id = ? AND id = ?`,
    [
      patch.replyState ?? current.replyState,
      patch.publishedReply === undefined ? current.publishedReply : patch.publishedReply,
      patch.publishedAt === undefined ? current.publishedAt : patch.publishedAt,
      patch.publishError === undefined ? current.publishError : patch.publishError,
      patch.providerResource === undefined ? current.providerResource : patch.providerResource,
      nowIso(),
      clinicId,
      id,
    ],
  );
  return true;
}

export function upsertProviderReview(input: {
  clinicId: string;
  externalId: string;
  providerResource: string;
  authorName: string;
  rating: number;
  comment: string;
  reviewedAt: string;
  replyComment?: string;
  replyUpdatedAt?: string;
}) {
  const existing = one<Record<string, Sql>>(
    "SELECT id, reply_state FROM reviews WHERE clinic_id = ? AND provider = 'google_business' AND external_id = ?",
    [input.clinicId, input.externalId],
  );
  const now = nowIso();
  if (!existing) {
    const id = randomUUID();
    const state = input.replyComment ? "published" : "unanswered";
    run(
      `INSERT INTO reviews (id, clinic_id, provider, external_id, provider_resource, author_name, rating, comment, reviewed_at, reply_state, published_reply, published_at, source_mode, created_at, updated_at)
       VALUES (?, ?, 'google_business', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'provider', ?, ?)`,
      [id, input.clinicId, input.externalId, input.providerResource, input.authorName, input.rating, input.comment, input.reviewedAt, state, input.replyComment ?? null, input.replyUpdatedAt ?? null, now, now],
    );
    return { id, created: true };
  }
  if (input.replyComment) {
    run(
      `UPDATE reviews SET provider_resource = ?, author_name = ?, rating = ?, comment = ?, reviewed_at = ?, reply_state = 'published', published_reply = ?, published_at = ?, source_mode = 'provider', publish_error = NULL, updated_at = ? WHERE id = ?`,
      [input.providerResource, input.authorName, input.rating, input.comment, input.reviewedAt, input.replyComment, input.replyUpdatedAt ?? now, now, String(existing.id)],
    );
  } else {
    run(
      `UPDATE reviews SET provider_resource = ?, author_name = ?, rating = ?, comment = ?, reviewed_at = ?, updated_at = ? WHERE id = ?`,
      [input.providerResource, input.authorName, input.rating, input.comment, input.reviewedAt, now, String(existing.id)],
    );
  }
  return { id: String(existing.id), created: false };
}

export function listContacts(clinicId: string): ContactRecord[] {
  return all<Record<string, Sql>>("SELECT * FROM contacts WHERE clinic_id = ? ORDER BY display_name", [clinicId]).map((row) => ({
    id: String(row.id),
    clinicId: String(row.clinic_id),
    displayName: String(row.display_name),
    phoneE164: String(row.phone_e164),
    consentStatus: String(row.consent_status) as ContactRecord["consentStatus"],
    consentSource: String(row.consent_source),
    sourceMode: String(row.source_mode) as SourceMode,
  }));
}

export function setConsent(clinicId: string, contactId: string, status: ContactRecord["consentStatus"]) {
  return run("UPDATE contacts SET consent_status = ? WHERE clinic_id = ? AND id = ?", [status, clinicId, contactId]).changes > 0;
}

export function getContact(clinicId: string, id: string) {
  return listContacts(clinicId).find((contact) => contact.id === id);
}

function mapMessage(row: Record<string, Sql>): MessageRecord {
  return {
    id: String(row.id),
    clinicId: String(row.clinic_id),
    workflowRunId: String(row.workflow_run_id),
    workflowId: String(row.workflow_id),
    contactId: String(row.contact_id),
    contactName: String(row.display_name),
    phoneE164: String(row.phone_e164),
    bodyRendered: String(row.body_rendered),
    state: String(row.state) as MessageState,
    providerMessageId: row.provider_message_id ? String(row.provider_message_id) : null,
    idempotencyKey: String(row.idempotency_key),
    attemptCount: Number(row.attempt_count),
    lastError: row.last_error ? String(row.last_error) : null,
    inboundExcerpt: row.inbound_excerpt ? String(row.inbound_excerpt) : null,
    acceptedAt: row.accepted_at ? String(row.accepted_at) : null,
    sentAt: row.sent_at ? String(row.sent_at) : null,
    deliveredAt: row.delivered_at ? String(row.delivered_at) : null,
    readAt: row.read_at ? String(row.read_at) : null,
    repliedAt: row.replied_at ? String(row.replied_at) : null,
    sourceMode: String(row.source_mode) as SourceMode,
    runStatus: String(row.run_status) as RunState,
    createdAt: String(row.created_at),
  };
}

const MESSAGE_SELECT = `
  SELECT m.*, r.workflow_id, r.status AS run_status, c.display_name, c.phone_e164
  FROM outbound_messages m
  JOIN workflow_runs r ON r.id = m.workflow_run_id
  JOIN contacts c ON c.id = m.contact_id
`;

export function listMessages(clinicId: string, workflowId?: string) {
  if (workflowId) {
    return all<Record<string, Sql>>(`${MESSAGE_SELECT} WHERE m.clinic_id = ? AND r.workflow_id = ? ORDER BY m.created_at DESC`, [clinicId, workflowId]).map(mapMessage);
  }
  return all<Record<string, Sql>>(`${MESSAGE_SELECT} WHERE m.clinic_id = ? ORDER BY m.created_at DESC`, [clinicId]).map(mapMessage);
}

export function getMessage(clinicId: string, id: string) {
  const row = one<Record<string, Sql>>(`${MESSAGE_SELECT} WHERE m.clinic_id = ? AND m.id = ?`, [clinicId, id]);
  return row ? mapMessage(row) : undefined;
}

export function findMessageByProviderId(providerMessageId: string) {
  const row = one<Record<string, Sql>>(`${MESSAGE_SELECT} WHERE m.provider_message_id = ?`, [providerMessageId]);
  return row ? mapMessage(row) : undefined;
}

export function findRunByIdempotency(key: string) {
  return one<Record<string, Sql>>("SELECT id, clinic_id FROM workflow_runs WHERE idempotency_key = ?", [key]);
}

export function insertPreparedMessage(input: {
  clinicId: string;
  workflowId: string;
  contactId: string;
  templateId: string | null;
  body: string;
  state: MessageState;
  runStatus: RunState;
  reason: string;
  idempotencyKey: string;
  scheduledFor: string | null;
  sourceMode: SourceMode;
  lastError?: string | null;
}) {
  const now = nowIso();
  const runId = randomUUID();
  const messageId = randomUUID();
  transaction(() => {
    run(
      `INSERT INTO workflow_runs (id, clinic_id, workflow_id, contact_id, status, scheduled_for, idempotency_key, reason, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [runId, input.clinicId, input.workflowId, input.contactId, input.runStatus, input.scheduledFor, input.idempotencyKey, input.reason, now, now],
    );
    run(
      `INSERT INTO outbound_messages (id, clinic_id, workflow_run_id, contact_id, template_id, body_rendered, state, idempotency_key, attempt_count, last_error, source_mode, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      [messageId, input.clinicId, runId, input.contactId, input.templateId, input.body, input.state, `${input.idempotencyKey}:message`, input.lastError ?? null, input.sourceMode, now, now],
    );
  });
  return messageId;
}

export function updateMessageState(clinicId: string, id: string, patch: {
  state: MessageState;
  runStatus: RunState;
  lastError?: string | null;
  providerMessageId?: string | null;
  attemptCount?: number;
  inboundExcerpt?: string | null;
  acceptedAt?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  repliedAt?: string | null;
  reason?: string;
}) {
  const current = getMessage(clinicId, id);
  if (!current) return false;
  const now = nowIso();
  transaction(() => {
    run(
      `UPDATE outbound_messages SET state = ?, last_error = ?, provider_message_id = ?, attempt_count = ?, inbound_excerpt = ?, accepted_at = ?, sent_at = ?, delivered_at = ?, read_at = ?, replied_at = ?, updated_at = ?
       WHERE clinic_id = ? AND id = ?`,
      [
        patch.state,
        patch.lastError === undefined ? current.lastError : patch.lastError,
        patch.providerMessageId === undefined ? current.providerMessageId : patch.providerMessageId,
        patch.attemptCount ?? current.attemptCount,
        patch.inboundExcerpt === undefined ? current.inboundExcerpt : patch.inboundExcerpt,
        patch.acceptedAt === undefined ? current.acceptedAt : patch.acceptedAt,
        patch.sentAt === undefined ? current.sentAt : patch.sentAt,
        patch.deliveredAt === undefined ? current.deliveredAt : patch.deliveredAt,
        patch.readAt === undefined ? current.readAt : patch.readAt,
        patch.repliedAt === undefined ? current.repliedAt : patch.repliedAt,
        now,
        clinicId,
        id,
      ],
    );
    run("UPDATE workflow_runs SET status = ?, reason = ?, updated_at = ? WHERE id = ? AND clinic_id = ?", [
      patch.runStatus,
      patch.reason ?? "",
      now,
      current.workflowRunId,
      clinicId,
    ]);
  });
  return true;
}

export function countRecentAcceptances(clinicId: string, sinceIso: string) {
  const row = one<Record<string, Sql>>(
    "SELECT COUNT(*) AS total FROM outbound_messages WHERE clinic_id = ? AND accepted_at IS NOT NULL AND accepted_at >= ?",
    [clinicId, sinceIso],
  );
  return Number(row?.total ?? 0);
}

export function addActivity(input: {
  clinicId: string;
  kind: ActivityRecord["kind"];
  actorType: string;
  actorKey: string;
  actorLabel: string;
  title: string;
  detail: string;
  subjectType?: string | null;
  subjectId?: string | null;
  result: string;
}) {
  const id = randomUUID();
  run(
    `INSERT INTO activity_events (id, clinic_id, kind, actor_type, actor_key, actor_label, title, detail, subject_type, subject_id, result, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.clinicId, input.kind, input.actorType, input.actorKey, input.actorLabel, input.title, input.detail, input.subjectType ?? null, input.subjectId ?? null, input.result, nowIso()],
  );
  return id;
}

export function listActivity(clinicId: string, filter: { kind?: string; actorKey?: string; query?: string } = {}) {
  const clauses = ["clinic_id = ?"];
  const params: Sql[] = [clinicId];
  if (filter.kind && ["info", "failure", "action_required"].includes(filter.kind)) {
    clauses.push("kind = ?");
    params.push(filter.kind);
  }
  if (filter.actorKey && ["bruno", "lucas", "user", "system", "integration"].includes(filter.actorKey)) {
    clauses.push("actor_key = ?");
    params.push(filter.actorKey);
  }
  if (filter.query) {
    clauses.push("(title LIKE ? OR detail LIKE ? OR result LIKE ?)");
    const term = likeTerm(filter.query);
    params.push(term, term, term);
  }
  return all<Record<string, Sql>>(
    `SELECT * FROM activity_events WHERE ${clauses.join(" AND ")} ORDER BY created_at DESC LIMIT 200`,
    params,
  ).map((row) => ({
    id: String(row.id),
    clinicId: String(row.clinic_id),
    kind: String(row.kind) as ActivityRecord["kind"],
    actorType: String(row.actor_type),
    actorKey: String(row.actor_key),
    actorLabel: String(row.actor_label),
    title: String(row.title),
    detail: String(row.detail),
    subjectType: row.subject_type ? String(row.subject_type) : null,
    subjectId: row.subject_id ? String(row.subject_id) : null,
    result: String(row.result),
    createdAt: String(row.created_at),
  }));
}

export function getActivity(clinicId: string, id: string) {
  const row = one<Record<string, Sql>>("SELECT * FROM activity_events WHERE clinic_id = ? AND id = ?", [clinicId, id]);
  if (!row) return undefined;
  return {
    id: String(row.id),
    clinicId: String(row.clinic_id),
    kind: String(row.kind) as ActivityRecord["kind"],
    actorType: String(row.actor_type),
    actorKey: String(row.actor_key),
    actorLabel: String(row.actor_label),
    title: String(row.title),
    detail: String(row.detail),
    subjectType: row.subject_type ? String(row.subject_type) : null,
    subjectId: row.subject_id ? String(row.subject_id) : null,
    result: String(row.result),
    createdAt: String(row.created_at),
  } satisfies ActivityRecord;
}

export function addAudit(input: { clinicId: string; actorUserId: string; action: string; subjectType: string; subjectId: string; metadata?: Record<string, string> }) {
  run(
    `INSERT INTO audit_logs (id, clinic_id, actor_user_id, action, subject_type, subject_id, metadata_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [randomUUID(), input.clinicId, input.actorUserId, input.action, input.subjectType, input.subjectId, JSON.stringify(input.metadata ?? {}), nowIso()],
  );
}

export function addApproval(input: { clinicId: string; subjectType: string; subjectId: string; decision: "approved" | "rejected"; decidedBy: string; note?: string }) {
  const now = nowIso();
  run(
    `INSERT INTO approvals (id, clinic_id, subject_type, subject_id, decision, decided_by, note, created_at, decided_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [randomUUID(), input.clinicId, input.subjectType, input.subjectId, input.decision, input.decidedBy, input.note ?? "", now, now],
  );
}

export function listApprovals(clinicId: string, subjectId: string) {
  return all<Record<string, Sql>>(
    "SELECT decision, note, decided_at, decided_by FROM approvals WHERE clinic_id = ? AND subject_id = ? ORDER BY decided_at DESC",
    [clinicId, subjectId],
  ).map((row) => ({
    decision: String(row.decision),
    note: String(row.note),
    decidedAt: String(row.decided_at),
    decidedBy: String(row.decided_by),
  }));
}

function mapIntegration(row: Record<string, Sql>): IntegrationRecord {
  let publicConfig: Record<string, string | boolean> = {};
  try {
    const parsed = JSON.parse(String(row.public_config_json)) as Record<string, unknown>;
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" || typeof value === "boolean") publicConfig[key] = value;
    }
  } catch {
    publicConfig = {};
  }
  return {
    id: String(row.id),
    clinicId: String(row.clinic_id),
    provider: String(row.provider) as IntegrationRecord["provider"],
    status: String(row.status),
    externalAccountId: row.external_account_id ? String(row.external_account_id) : null,
    locationResource: row.location_resource ? String(row.location_resource) : null,
    locationTitle: row.location_title ? String(row.location_title) : null,
    lastSyncAt: row.last_sync_at ? String(row.last_sync_at) : null,
    lastError: row.last_error ? String(row.last_error) : null,
    scopes: String(row.scopes ?? ""),
    publicConfig,
  };
}

export function listIntegrations(clinicId: string) {
  return all<Record<string, Sql>>("SELECT * FROM integrations WHERE clinic_id = ?", [clinicId]).map(mapIntegration);
}

export function getIntegration(clinicId: string, provider: "google_business" | "whatsapp_cloud") {
  const row = one<Record<string, Sql>>("SELECT * FROM integrations WHERE clinic_id = ? AND provider = ?", [clinicId, provider]);
  return row ? mapIntegration(row) : undefined;
}

export function updateIntegration(clinicId: string, provider: IntegrationRecord["provider"], patch: Partial<Omit<IntegrationRecord, "id" | "clinicId" | "provider" | "publicConfig">> & { publicConfig?: Record<string, string | boolean> }) {
  const current = getIntegration(clinicId, provider);
  if (!current) return false;
  run(
    `UPDATE integrations SET status = ?, external_account_id = ?, location_resource = ?, location_title = ?, last_sync_at = ?, last_error = ?, scopes = ?, public_config_json = ?, updated_at = ?
     WHERE clinic_id = ? AND provider = ?`,
    [
      patch.status ?? current.status,
      patch.externalAccountId === undefined ? current.externalAccountId : patch.externalAccountId,
      patch.locationResource === undefined ? current.locationResource : patch.locationResource,
      patch.locationTitle === undefined ? current.locationTitle : patch.locationTitle,
      patch.lastSyncAt === undefined ? current.lastSyncAt : patch.lastSyncAt,
      patch.lastError === undefined ? current.lastError : patch.lastError,
      patch.scopes === undefined ? current.scopes : patch.scopes,
      JSON.stringify(patch.publicConfig ?? current.publicConfig),
      nowIso(),
      clinicId,
      provider,
    ],
  );
  return true;
}

export function saveIntegrationSecret(integrationId: string, value: unknown) {
  const blob = encryptSecret(value);
  const now = nowIso();
  const existing = one("SELECT integration_id FROM integration_secrets WHERE integration_id = ?", [integrationId]);
  if (existing) {
    run("UPDATE integration_secrets SET ciphertext = ?, iv = ?, auth_tag = ?, updated_at = ? WHERE integration_id = ?", [blob.ciphertext, blob.iv, blob.authTag, now, integrationId]);
  } else {
    run("INSERT INTO integration_secrets (integration_id, ciphertext, iv, auth_tag, updated_at) VALUES (?, ?, ?, ?, ?)", [integrationId, blob.ciphertext, blob.iv, blob.authTag, now]);
  }
}

export function readIntegrationSecret<T>(integrationId: string): T | undefined {
  const row = one<Record<string, Sql>>("SELECT ciphertext, iv, auth_tag FROM integration_secrets WHERE integration_id = ?", [integrationId]);
  if (!row) return undefined;
  return decryptSecret<T>({ ciphertext: String(row.ciphertext), iv: String(row.iv), authTag: String(row.auth_tag) });
}

export function clearIntegrationSecret(integrationId: string) {
  run("DELETE FROM integration_secrets WHERE integration_id = ?", [integrationId]);
}

export function listIntegrationSecrets() {
  return all<Record<string, Sql>>(
    `SELECT s.integration_id, s.ciphertext, s.iv, s.auth_tag, i.clinic_id, i.provider, i.public_config_json
     FROM integration_secrets s JOIN integrations i ON i.id = s.integration_id`,
  );
}

export function insertWebhookEvent(input: { clinicId: string | null; provider: string; externalEventId: string; payloadHash: string; status: string; summary: string }) {
  const now = nowIso();
  try {
    run(
      `INSERT INTO webhook_events (id, clinic_id, provider, external_event_id, payload_hash, status, summary, received_at, processed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [randomUUID(), input.clinicId, input.provider, input.externalEventId, input.payloadHash, input.status, input.summary, now, now],
    );
    return "inserted" as const;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE")) return "duplicate" as const;
    throw error;
  }
}

export function listWebhookEvents(clinicId: string) {
  return all<Record<string, Sql>>(
    "SELECT provider, status, summary, received_at FROM webhook_events WHERE clinic_id = ? ORDER BY received_at DESC LIMIT 20",
    [clinicId],
  ).map((row) => ({
    provider: String(row.provider),
    status: String(row.status),
    summary: String(row.summary),
    receivedAt: String(row.received_at),
  }));
}

export function listMembers(clinicId: string) {
  return all<Record<string, Sql>>(
    `SELECT m.id, m.role, u.id AS user_id, u.name, u.email
     FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.clinic_id = ? ORDER BY u.name`,
    [clinicId],
  ).map((row) => ({
    id: String(row.id),
    userId: String(row.user_id),
    role: String(row.role) as Role,
    name: String(row.name),
    email: String(row.email),
  }));
}

export function countOwners(clinicId: string) {
  const row = one<Record<string, Sql>>("SELECT COUNT(*) AS total FROM memberships WHERE clinic_id = ? AND role = 'owner'", [clinicId]);
  return Number(row?.total ?? 0);
}

export function updateMemberRole(clinicId: string, membershipId: string, role: Role) {
  return run("UPDATE memberships SET role = ? WHERE clinic_id = ? AND id = ?", [role, clinicId, membershipId]).changes > 0;
}

export function getMembershipRow(clinicId: string, membershipId: string) {
  const row = one<Record<string, Sql>>("SELECT id, user_id, role FROM memberships WHERE clinic_id = ? AND id = ?", [clinicId, membershipId]);
  if (!row) return undefined;
  return { id: String(row.id), userId: String(row.user_id), role: String(row.role) as Role };
}

export function searchClinic(clinicId: string, query: string) {
  const term = likeTerm(query);
  const reviews = all<Record<string, Sql>>(
    "SELECT id, author_name, reply_state FROM reviews WHERE clinic_id = ? AND (author_name LIKE ? OR comment LIKE ?) ORDER BY reviewed_at DESC LIMIT 6",
    [clinicId, term, term],
  ).map((row) => ({ id: String(row.id), label: String(row.author_name), meta: String(row.reply_state), href: `/reputacao/${row.id}` }));
  const contacts = all<Record<string, Sql>>(
    "SELECT id, display_name FROM contacts WHERE clinic_id = ? AND display_name LIKE ? ORDER BY display_name LIMIT 6",
    [clinicId, term],
  ).map((row) => ({ id: String(row.id), label: String(row.display_name), meta: "Tutor", href: "/pos-consulta" }));
  const workflows = all<Record<string, Sql>>(
    "SELECT id, name FROM workflows WHERE clinic_id = ? AND name LIKE ? LIMIT 6",
    [clinicId, term],
  ).map((row) => ({ id: String(row.id), label: String(row.name), meta: "Fluxo", href: `/pos-consulta/${row.id}` }));
  return { reviews, contacts, workflows };
}

export function createClinicAccount(input: {
  userName: string;
  email: string;
  passwordHash: string;
  clinicName: string;
  city: string;
  state: string;
  phone: string;
  technicalManager: string;
  crmv: string;
}) {
  const now = nowIso();
  const userId = randomUUID();
  const clinicId = randomUUID();
  const orgId = randomUUID();
  transaction(() => {
    run("INSERT INTO organizations (id, name, created_at) VALUES (?, ?, ?)", [orgId, input.clinicName, now]);
    run("INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)", [userId, input.email.toLowerCase(), input.userName, input.passwordHash, now]);
    run(
      `INSERT INTO clinics (id, organization_id, name, phone, email, address, city, state, technical_manager, crmv, timezone, onboarding_completed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, ?, 'America/Sao_Paulo', 0, ?, ?)`,
      [clinicId, orgId, input.clinicName, input.phone, input.email.toLowerCase(), input.city, input.state, input.technicalManager, input.crmv, now, now],
    );
    run(
      "INSERT INTO memberships (id, user_id, clinic_id, organization_id, role, created_at) VALUES (?, ?, ?, ?, 'owner', ?)",
      [randomUUID(), userId, clinicId, orgId, now],
    );
    run(
      `INSERT INTO brand_preferences (clinic_id, formality, emoji_policy, preferred_phrases, avoided_phrases, sign_off, communication_rules, updated_at)
       VALUES (?, 'cordial', 'none', '[]', '[]', ?, 'Não inventar fatos clínicos.', ?)`,
      [clinicId, `Equipe da ${input.clinicName}`, now],
    );
    run("INSERT INTO agents (id, clinic_id, key, display_name, status, updated_at) VALUES (?, ?, 'bruno', 'Dr. Bruno', 'active', ?)", [randomUUID(), clinicId, now]);
    run("INSERT INTO agents (id, clinic_id, key, display_name, status, updated_at) VALUES (?, ?, 'lucas', 'Lucas', 'active', ?)", [randomUUID(), clinicId, now]);
    for (const blueprint of workflowBlueprints()) {
      const workflowId = randomUUID();
      run(
        `INSERT INTO workflows (id, clinic_id, agent_key, key, name, objective, autonomy, status, config_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
        [workflowId, clinicId, blueprint.agentKey, blueprint.key, blueprint.name, blueprint.objective, blueprint.autonomy, JSON.stringify(blueprint.config), now, now],
      );
      run(
        `INSERT INTO message_templates (id, clinic_id, workflow_id, name, provider_template_name, language, body, updated_at)
         VALUES (?, ?, ?, ?, '', 'pt_BR', ?, ?)`,
        [randomUUID(), clinicId, workflowId, blueprint.templateName, blueprint.templateBody, now],
      );
    }
    for (const provider of ["google_business", "whatsapp_cloud"]) {
      run(
        "INSERT INTO integrations (id, clinic_id, provider, status, scopes, public_config_json, updated_at) VALUES (?, ?, ?, 'not_configured', '', '{}', ?)",
        [randomUUID(), clinicId, provider, now],
      );
    }
  });
  return { userId, clinicId };
}

export function blockUnsentForContact(clinicId: string, contactId: string) {
  const messages = listMessages(clinicId).filter((message) => message.contactId === contactId && ["prepared", "awaiting_approval", "approved"].includes(message.state));
  for (const message of messages) {
    updateMessageState(clinicId, message.id, {
      state: "blocked_consent",
      runStatus: "skipped",
      lastError: "Consentimento recusado antes do envio.",
      reason: "Consentimento recusado. Nenhum envio externo foi feito.",
    });
  }
  return messages.length;
}
