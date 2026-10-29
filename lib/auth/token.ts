import { createHmac, timingSafeEqual } from "node:crypto";
import { getSessionSecret } from "@/lib/auth/secret";

export type SessionToken = {
  userId: string;
  clinicId: string;
  exp: number;
};

export function sealJson(data: Record<string, string | number>) {
  const body = Buffer.from(JSON.stringify(data)).toString("base64url");
  const sig = createHmac("sha256", getSessionSecret()).update(`state:${body}`).digest("base64url");
  return `${body}.${sig}`;
}

export function openJson<T>(token: string | undefined | null): T | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", getSessionSecret()).update(`state:${body}`).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function sealSession(data: SessionToken) {
  return sealJson(data);
}

export function openSession(token: string | undefined | null): SessionToken | null {
  const parsed = openJson<SessionToken>(token);
  if (!parsed?.userId || !parsed.clinicId || typeof parsed.exp !== "number") return null;
  if (parsed.exp < Date.now()) return null;
  return parsed;
}

export const SESSION_COOKIE = "va_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
