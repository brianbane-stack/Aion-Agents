import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { defineConfig } from "vitest/config";

const dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "vetagents-")), "test.db");
process.env.VETAGENTS_DB_PATH = dbFile;
process.env.APP_MODE = "demonstration";
process.env.SESSION_SECRET = "test-session-secret-with-32-chars-min";
process.env.DEMO_USER_PASSWORD = "demonstracao-segura";
process.env.COOKIE_SECURE = "false";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(__dirname, "tests/server-only-stub.ts"),
    },
  },
});
