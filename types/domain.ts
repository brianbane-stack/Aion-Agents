export const ROLES = ["owner", "admin", "operator", "approver", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const REVIEW_STATES = [
  "unanswered",
  "suggestion_ready",
  "approved_pending_publish",
  "published",
  "publish_failed",
  "discarded",
] as const;
export type ReviewState = (typeof REVIEW_STATES)[number];

export const MESSAGE_STATES = [
  "prepared",
  "awaiting_approval",
  "approved",
  "send_accepted",
  "sent",
  "delivered",
  "read",
  "replied",
  "failed",
  "not_sent_demo",
  "blocked_consent",
  "skipped_duplicate",
] as const;
export type MessageState = (typeof MESSAGE_STATES)[number];

export const RUN_STATES = [
  "prepared",
  "skipped",
  "not_executed",
  "accepted",
  "completed",
  "failed",
  "cancelled",
] as const;
export type RunState = (typeof RUN_STATES)[number];

export const AUTONOMY_MODES = ["suggestion", "supervised", "restricted"] as const;
export type Autonomy = (typeof AUTONOMY_MODES)[number];

export const SOURCE_MODES = ["demonstration", "provider"] as const;
export type SourceMode = (typeof SOURCE_MODES)[number];

export const PERMISSIONS = [
  "view",
  "edit_clinic",
  "manage_team",
  "edit_memory",
  "edit_suggestion",
  "approve",
  "publish",
  "send_message",
  "manage_workflows",
  "manage_integrations",
  "pause_agent",
  "export_data",
  "set_restricted_autonomy",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export type Actor = {
  userId: string;
  name: string;
  email: string;
  clinicId: string;
  clinicName: string;
  role: Role;
  onboardingCompleted: boolean;
};

export type MemoryContext = {
  formality: "formal" | "cordial" | "acolhedor";
  emojiPolicy: "none" | "rare";
  preferredPhrases: string[];
  avoidedPhrases: string[];
  signOff: string;
  explicitRules: string[];
  approvedExamples: string[];
};

export type WorkflowConfig = {
  waitHours: number;
  maxAttempts: number;
  sources: string[];
  allowedActions: string[];
  requiredPermissions: string[];
  stopConditions: string[];
  escalation: string;
  failurePolicy: string;
  successCriteria: string;
  neutralRequest: boolean;
};
