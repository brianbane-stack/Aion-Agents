import { can } from "@/lib/auth/permissions";
import { hashPassword } from "@/lib/auth/password";
import { fail, ok } from "@/lib/result";
import {
  addAudit,
  countOwners,
  createClinicAccount,
  deleteMemory,
  findUserByEmail,
  getMemory,
  getMembershipRow,
  insertMemory,
  listMemory,
  loadMemory,
  markOnboardingComplete,
  replacePhraseList,
  setMemoryActive,
  updateClinicProfile,
  updateMemberRole,
  getClinic,
} from "@/lib/db/store";
import type { Actor, Role } from "@/types/domain";
import type { ClinicInput, RegisterInput } from "@/lib/validation/schemas";

const missing = "Registro não encontrado nesta clínica.";

function uniquePhrases(phrases: string[]) {
  return [...new Set(phrases.map((phrase) => phrase.trim()).filter(Boolean))];
}

function activePhraseBodies(clinicId: string, kind: "preferred_expression" | "avoided_expression") {
  return listMemory(clinicId)
    .filter((entry) => entry.active && entry.kind === kind)
    .map((entry) => entry.body);
}

function syncPhraseColumn(clinicId: string, kind: "preferred_expression" | "avoided_expression") {
  replacePhraseList(
    clinicId,
    kind === "preferred_expression" ? "preferred_phrases" : "avoided_phrases",
    activePhraseBodies(clinicId, kind),
  );
}

function replacePhraseMemory(clinicId: string, kind: "preferred_expression" | "avoided_expression", phrases: string[]) {
  const wanted = new Set(phrases);
  for (const entry of listMemory(clinicId)) {
    if (entry.kind === kind && entry.active && !wanted.has(entry.body)) {
      setMemoryActive(clinicId, entry.id, false);
    }
  }
  const active = new Set(activePhraseBodies(clinicId, kind));
  for (const phrase of phrases) {
    if (!active.has(phrase)) {
      insertMemory(clinicId, {
        kind,
        title: kind === "preferred_expression" ? "Frase preferida" : "Expressão a evitar",
        body: phrase,
        source: "user",
      });
    }
  }
  syncPhraseColumn(clinicId, kind);
}

export function saveClinic(actor: Actor, input: ClinicInput) {
  if (!can(actor.role, "edit_clinic")) return fail("Seu perfil não pode fazer essa ação.", "forbidden");
  const clinic = getClinic(actor.clinicId);
  if (!clinic) return fail(missing, "not_found");
  const memory = loadMemory(actor.clinicId);
  const preferred = uniquePhrases(input.preferredPhrases);
  const avoided = uniquePhrases(input.avoidedPhrases);
  updateClinicProfile(actor.clinicId, {
    ...input,
    preferredPhrases: preferred,
    avoidedPhrases: avoided,
    explicitRules: memory.explicitRules,
    approvedExamples: memory.approvedExamples,
  });
  replacePhraseMemory(actor.clinicId, "preferred_expression", preferred);
  replacePhraseMemory(actor.clinicId, "avoided_expression", avoided);
  addAudit({ clinicId: actor.clinicId, actorUserId: actor.userId, action: "clinic.updated", subjectType: "clinic", subjectId: actor.clinicId });
  return ok("Dados e preferências salvos.");
}

export function addMemory(actor: Actor, input: { kind: "explicit_rule" | "approved_example" | "preferred_expression" | "avoided_expression"; title: string; body: string }) {
  if (!can(actor.role, "edit_memory") && !can(actor.role, "edit_clinic")) return fail("Seu perfil não pode fazer essa ação.", "forbidden");
  const id = insertMemory(actor.clinicId, { ...input, source: "user" });
  if (input.kind === "preferred_expression" || input.kind === "avoided_expression") {
    syncPhraseColumn(actor.clinicId, input.kind);
  }
  addAudit({ clinicId: actor.clinicId, actorUserId: actor.userId, action: "memory.created", subjectType: "memory", subjectId: id });
  return ok("Memória registrada. Ela passa a influenciar as próximas sugestões.", { id });
}

export function toggleMemory(actor: Actor, id: string, active: boolean) {
  if (!can(actor.role, "edit_memory") && !can(actor.role, "edit_clinic")) return fail("Seu perfil não pode fazer essa ação.", "forbidden");
  const entry = getMemory(actor.clinicId, id);
  if (!entry) return fail(missing, "not_found");
  setMemoryActive(actor.clinicId, id, active);
  if (entry.kind === "preferred_expression" || entry.kind === "avoided_expression") {
    syncPhraseColumn(actor.clinicId, entry.kind);
  }
  return ok(active ? "Memória reativada." : "Memória desativada. As próximas sugestões deixam de usá-la.");
}

export function removeMemory(actor: Actor, id: string) {
  if (!can(actor.role, "edit_memory") && !can(actor.role, "edit_clinic")) return fail("Seu perfil não pode fazer essa ação.", "forbidden");
  const entry = getMemory(actor.clinicId, id);
  if (!entry) return fail(missing, "not_found");
  deleteMemory(actor.clinicId, id);
  if (entry.kind === "preferred_expression" || entry.kind === "avoided_expression") {
    syncPhraseColumn(actor.clinicId, entry.kind);
  }
  return ok("Memória removida.");
}

export function changeRole(actor: Actor, membershipId: string, role: Role) {
  if (!can(actor.role, "manage_team")) return fail("Seu perfil não pode fazer essa ação.", "forbidden");
  const membership = getMembershipRow(actor.clinicId, membershipId);
  if (!membership) return fail(missing, "not_found");
  if (membership.role === "owner" && role !== "owner" && countOwners(actor.clinicId) <= 1) {
    return fail("A clínica precisa manter pelo menos um responsável.", "last_owner");
  }
  updateMemberRole(actor.clinicId, membershipId, role);
  addAudit({ clinicId: actor.clinicId, actorUserId: actor.userId, action: "membership.role", subjectType: "membership", subjectId: membershipId, metadata: { role } });
  return ok("Permissão atualizada.");
}

export function registerClinic(input: RegisterInput) {
  if (findUserByEmail(input.email)) return fail("Já existe uma conta com esse e-mail.", "exists");
  const created = createClinicAccount({
    userName: input.name,
    email: input.email,
    passwordHash: hashPassword(input.password),
    clinicName: input.clinicName,
    city: input.city,
    state: input.state,
    phone: input.phone,
    technicalManager: input.technicalManager,
    crmv: input.crmv,
  });
  return ok("Clínica criada. O próximo passo é concluir a configuração inicial.", created);
}

export function completeOnboarding(actor: Actor, input: ClinicInput) {
  const saved = saveClinic(actor, input);
  if (!saved.ok) return saved;
  markOnboardingComplete(actor.clinicId);
  return ok("Configuração inicial salva.");
}
