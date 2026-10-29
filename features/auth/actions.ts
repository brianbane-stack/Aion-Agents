"use server";

import { redirect } from "next/navigation";
import { clearFailures, isLimited, registerFailure } from "@/lib/auth/throttle";
import { verifyPassword } from "@/lib/auth/password";
import { clearSession, writeSession } from "@/lib/auth/session";
import { findUserByEmail, membershipsForUser } from "@/lib/db/store";
import { registerClinic } from "@/lib/settings/service";
import { loginSchema, recoverySchema, registerSchema } from "@/lib/validation/schemas";
import type { ActionState } from "@/features/action-state";

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message || "Dados inválidos." };
  const email = parsed.data.email.toLowerCase();
  if (isLimited(email)) return { ok: false, message: "Muitas tentativas. Espere alguns minutos." };
  const user = findUserByEmail(email);
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    registerFailure(email);
    return { ok: false, message: "E-mail ou senha incorretos." };
  }
  const memberships = membershipsForUser(user.id);
  const membership = memberships[0];
  if (!membership) return { ok: false, message: "Esta conta não está vinculada a uma clínica." };
  clearFailures(email);
  await writeSession(user.id, membership.clinicId);
  redirect(membership.onboardingCompleted ? "/hoje" : "/comecar");
}

export async function logout() {
  await clearSession();
  redirect("/login");
}

export async function requestRecovery(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = recoverySchema.safeParse({ email: String(formData.get("email") || "") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message || "Informe um e-mail válido." };
  return {
    ok: true,
    message: "Se o endereço existir e um provedor de e-mail estiver configurado, enviaremos instruções. Neste ambiente, nenhum e-mail é disparado.",
  };
}

export async function createClinic(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    clinicName: formData.get("clinicName"),
    city: formData.get("city"),
    state: formData.get("state"),
    phone: formData.get("phone"),
    technicalManager: formData.get("technicalManager"),
    crmv: formData.get("crmv"),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message || "Revise os campos." };
  const created = registerClinic(parsed.data);
  if (!created.ok || !created.data) return { ok: false, message: created.message };
  await writeSession(created.data.userId, created.data.clinicId);
  redirect("/comecar");
}
