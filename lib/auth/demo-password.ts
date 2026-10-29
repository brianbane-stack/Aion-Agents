import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const FILE = () => path.join(process.cwd(), "data", "demo-password.txt");

export function getDemoPassword() {
  const fromEnv = process.env.DEMO_USER_PASSWORD?.trim();
  if (fromEnv && fromEnv.length >= 8) return fromEnv;
  const file = FILE();
  if (fs.existsSync(file)) {
    const stored = fs.readFileSync(file, "utf8").trim();
    if (stored.length >= 8) return stored;
  }
  const generated = randomBytes(9).toString("base64url");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${generated}\n`, { mode: 0o600 });
  return generated;
}
