import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const isCI = ((process.env.CI === "true") || (process.env.GITHUB_ACTIONS === "true"));
const isWindows = (process.platform === "win32");
const localWorkers = Math.max(4, Math.min(16, os.cpus().length));
const ciWorkers = isWindows ? 2 : 3;
