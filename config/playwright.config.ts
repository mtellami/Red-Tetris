import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const port = 4173;
const baseURL = "http://127.0.0.1:" + port;
export default defineConfig({
  testDir: "../tests",
  outputDir: "../test-results",
  testMatch: "**/*.e2e.ts",
  use: { baseURL, ...devices["Desktop Chrome"] },
  webServer: {
    command: "node dist/server/src/main.js",
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    url: baseURL,
    env: {
      PORT: String(port),
      LEADERBOARD_FILE: join(
        tmpdir(),
        "red-tetris-e2e-" + process.pid + ".json",
      ),
    },
  },
});
