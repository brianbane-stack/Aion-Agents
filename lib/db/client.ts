import "server-only";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { appMode } from "@/lib/env";
import { SCHEMA } from "@/lib/db/schema";
import { seedDemonstration } from "@/lib/db/seed";

const globalForDb = globalThis as unknown as { __vetagentsDb?: DatabaseSync };

export function databasePath() {
  return process.env.VETAGENTS_DB_PATH ?? path.join(process.cwd(), "data", "vetagents.db");
}

export function resetConnection() {
  globalForDb.__vetagentsDb?.close();
  globalForDb.__vetagentsDb = undefined;
}

function migrate(db: DatabaseSync) {
  db.exec(SCHEMA);
  const existing = db.prepare("SELECT id FROM schema_migrations WHERE id = ?").get("0001") as { id: string } | undefined;
  if (!existing) {
    db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run("0001", new Date().toISOString());
  }
}

export function getDb() {
  if (!globalForDb.__vetagentsDb) {
    const file = databasePath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const db = new DatabaseSync(file);
    db.exec("PRAGMA foreign_keys = ON");
    db.exec("PRAGMA journal_mode = WAL");
    migrate(db);
    const count = db.prepare("SELECT COUNT(*) AS total FROM users").get() as { total: number };
    if (count.total === 0 && appMode() === "demonstration") {
      seedDemonstration(db);
    }
    globalForDb.__vetagentsDb = db;
  }
  return globalForDb.__vetagentsDb;
}
