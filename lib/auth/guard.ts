import "server-only";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import { findUserById, membershipsForUser } from "@/lib/db/store";
import type { Actor } from "@/types/domain";

export async function requireUser(): Promise<Actor> {
  const session = await readSession();
  if (!session) redirect("/login");
  const user = findUserById(session.userId);
  const membership = user ? membershipsForUser(user.id).find((item) => item.clinicId === session.clinicId) : undefined;
  if (!user || !membership) redirect("/login");
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    clinicId: membership.clinicId,
    clinicName: membership.clinicName,
    role: membership.role,
    onboardingCompleted: membership.onboardingCompleted,
  };
}

export async function requireOnboarded() {
  const actor = await requireUser();
  if (!actor.onboardingCompleted) redirect("/comecar");
  return actor;
}
