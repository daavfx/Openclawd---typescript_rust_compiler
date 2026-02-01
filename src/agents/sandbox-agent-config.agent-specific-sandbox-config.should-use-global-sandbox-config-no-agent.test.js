import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
const spawnCalls = [];
vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual: , spawn: (command, args) => {
    spawnCalls.push({ command, args });
    const child = new EventEmitter();
    child.stdout = new Readable({ read: function() {
    } });
    child.stderr = new Readable({ read: function() {
    } });
    const dockerArgs = (command === "docker") ? args : [];
    const shouldFailContainerInspect = (((dockerArgs[0] === "inspect") && (dockerArgs[1] === "-f")) && (dockerArgs[2] === "{{.State.Running}}"));
    const shouldSucceedImageInspect = ((dockerArgs[0] === "image") && (dockerArgs[1] === "inspect"));
    const code = shouldFailContainerInspect ? 1 : 0;
    if (shouldSucceedImageInspect) {
      queueMicrotask(() => child.emit("close", 0));
    } else {
      queueMicrotask(() => child.emit("close", code));
    }
    return child;
  } };
});
describe("Agent-specific sandbox config", () => {
  beforeEach(() => {
    spawnCalls.length = 0;
  });
  it("should use global sandbox config when no agent-specific config exists", { timeout: 60000 }, async () => {
    const {resolveSandboxContext} = await import("./sandbox.js");
    const cfg = { agents: { defaults: { sandbox: { mode: "all", scope: "agent" } }, list: [{ id: "main", workspace: "~/openclaw" }] } };
    const context = await resolveSandboxContext({ config: cfg, sessionKey: "agent:main:main", workspaceDir: "/tmp/test" });
    expect(context).toBeDefined();
    expect(context?.enabled).toBe(true);
  });
  it("should allow agent-specific docker setupCommand overrides", async () => {
    const {resolveSandboxContext} = await import("./sandbox.js");
    const cfg = { agents: { defaults: { sandbox: { mode: "all", scope: "agent", docker: { setupCommand: "echo global" } } }, list: [{ id: "work", workspace: "~/openclaw-work", sandbox: { mode: "all", scope: "agent", docker: { setupCommand: "echo work" } } }] } };
    const context = await resolveSandboxContext({ config: cfg, sessionKey: "agent:work:main", workspaceDir: "/tmp/test-work" });
    expect(context).toBeDefined();
    expect(context?.docker.setupCommand).toBe("echo work");
    expect(spawnCalls.some((call) => ((((call.command === "docker") && (call.args[0] === "exec")) && call.args.includes("-lc")) && call.args.includes("echo work")))).toBe(true);
  });
  it("should ignore agent-specific docker overrides when scope is shared", async () => {
    const {resolveSandboxContext} = await import("./sandbox.js");
    const cfg = { agents: { defaults: { sandbox: { mode: "all", scope: "shared", docker: { setupCommand: "echo global" } } }, list: [{ id: "work", workspace: "~/openclaw-work", sandbox: { mode: "all", scope: "shared", docker: { setupCommand: "echo work" } } }] } };
    const context = await resolveSandboxContext({ config: cfg, sessionKey: "agent:work:main", workspaceDir: "/tmp/test-work" });
    expect(context).toBeDefined();
    expect(context?.docker.setupCommand).toBe("echo global");
    expect(context?.containerName).toContain("shared");
    expect(spawnCalls.some((call) => ((((call.command === "docker") && (call.args[0] === "exec")) && call.args.includes("-lc")) && call.args.includes("echo global")))).toBe(true);
  });
});
