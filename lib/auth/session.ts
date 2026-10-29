import "server-only";
import { cookies } from "next/headers";
import { openSession, sealSession, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth/token";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.COOKIE_SECURE === "true",
  path: "/",
  maxAge: SESSION_MAX_AGE,
};

export async function readSession() {
  const jar = await cookies();
  return openSession(jar.get(SESSION_COOKIE)?.value);
}

export async function writeSession(userId: string, clinicId: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sealSession({ userId, clinicId, exp: Date.now() + SESSION_MAX_AGE * 1000 }), cookieOptions);
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
