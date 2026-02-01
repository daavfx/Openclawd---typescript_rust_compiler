import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { maybeRemoveDeprecatedCliAuthProfiles } from "./doctor-auth.js";
let originalAgentDir;
let originalPiAgentDir;
let tempAgentDir;
function makePrompter(confirmValue) {
  return { confirm: vi.fn().mockResolvedValue(confirmValue), confirmRepair: vi.fn().mockResolvedValue(confirmValue), confirmAggressive: vi.fn().mockResolvedValue(confirmValue), confirmSkipInNonInteractive: vi.fn().mockResolvedValue(confirmValue), select: vi.fn().mockResolvedValue(""), shouldRepair: confirmValue, shouldForce: false };
}
beforeEach(() => {
  originalAgentDir = process.env.OPENCLAW_AGENT_DIR;
  originalPiAgentDir = process.env.PI_CODING_AGENT_DIR;
  tempAgentDir = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-auth-"));
  process.env.OPENCLAW_AGENT_DIR = tempAgentDir;
  process.env.PI_CODING_AGENT_DIR = tempAgentDir;
});
afterEach(() => {
  if ((originalAgentDir === undefined)) {
    delete process.env.OPENCLAW_AGENT_DIR;
  } else {
    process.env.OPENCLAW_AGENT_DIR = originalAgentDir;
  }
  if ((originalPiAgentDir === undefined)) {
    delete process.env.PI_CODING_AGENT_DIR;
  } else {
    process.env.PI_CODING_AGENT_DIR = originalPiAgentDir;
  }
  if (tempAgentDir) {
    fs.rmSync(tempAgentDir, { recursive: true, force: true });
    tempAgentDir = undefined;
  }
});
describe("maybeRemoveDeprecatedCliAuthProfiles", () => {
  it("removes deprecated CLI auth profiles from store + config", async () => {
    if (!tempAgentDir) {
      throw new Error("Missing temp agent dir");
    }
    const authPath = path.join(tempAgentDir, "auth-profiles.json");
    fs.writeFileSync(authPath, "
", "utf8");
    const cfg = { auth: { profiles: { "anthropic:claude-cli": { provider: "anthropic", mode: "oauth" }, "openai-codex:codex-cli": { provider: "openai-codex", mode: "oauth" } }, order: { anthropic: ["anthropic:claude-cli"], "openai-codex": ["openai-codex:codex-cli"] } } };
    const next = await maybeRemoveDeprecatedCliAuthProfiles(cfg, makePrompter(true));
    const raw = JSON.parse(fs.readFileSync(authPath, "utf8"));
    expect(raw.profiles?.["anthropic:claude-cli"]).toBeUndefined();
    expect(raw.profiles?.["openai-codex:codex-cli"]).toBeUndefined();
    expect(next.auth?.profiles?.["anthropic:claude-cli"]).toBeUndefined();
    expect(next.auth?.profiles?.["openai-codex:codex-cli"]).toBeUndefined();
    expect(next.auth?.order?.anthropic).toBeUndefined();
    expect(next.auth?.order?.["openai-codex"]).toBeUndefined();
  });
});
