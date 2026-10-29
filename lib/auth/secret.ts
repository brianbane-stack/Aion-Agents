import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { appMode } from "@/lib/env";

let cached: string | undefined;

export function getSessionSecret() {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 32) return fromEnv;
  if (appMode() === "live") {
    throw new Error("SESSION_SECRET é obrigatório quando APP_MODE=live.");
  }
  if (cached) return cached;
  const file = path.join(process.cwd(), "data", ".session-secret");
  if (fs.existsSync(file)) {
    const stored = fs.readFileSync(file, "utf8").trim();
    if (stored.length >= 32) {
      cached = stored;
      return stored;
    }
  }
  const generated = randomBytes(32).toString("base64url");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${generated}\n`, { mode: 0o600 });
  cached = generated;
  return generated;
}
