import os from "node:os";
import { defineConfig } from "vitest/config";
const isCI = ((process.env.CI === "true") || (process.env.GITHUB_ACTIONS === "true"));
const cpuCount = os.cpus().length;
const e2eWorkers = isCI ? 2 : Math.min(4, Math.max(1, Math.floor((cpuCount * 0.25))));
