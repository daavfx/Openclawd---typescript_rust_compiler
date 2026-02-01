import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createLobsterTool } from "./lobster-tool.js";
async function writeFakeLobsterScript(scriptBody, prefix = "openclaw-lobster-plugin-") {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  const isWindows = (process.platform === "win32");
  if (isWindows) {
    const scriptPath = path.join(dir, "lobster.js");
    const cmdPath = path.join(dir, "lobster.cmd");
    await fs.writeFile(scriptPath, scriptBody, { encoding: "utf8" });
    const cmd = "@echo off
\"\" \"\" %*
";
    await fs.writeFile(cmdPath, cmd, { encoding: "utf8" });
    return { dir, binPath: cmdPath };
  }
  const binPath = path.join(dir, "lobster");
  const file = "#!/usr/bin/env node

";
  await fs.writeFile(binPath, file, { encoding: "utf8", mode: 493 });
  return { dir, binPath };
}
async function writeFakeLobster(params) {
  const scriptBody = ("const payload = ;
" + "process.stdout.write(JSON.stringify(payload));
");
  return await writeFakeLobsterScript(scriptBody);
}
function fakeApi() {
  return { id: "lobster", name: "lobster", source: "test", config: {  }, runtime: { version: "test" }, logger: { info: function() {
  }, warn: function() {
  }, error: function() {
  }, debug: function() {
  } }, registerTool: function() {
  }, registerHttpHandler: function() {
  }, registerChannel: function() {
  }, registerGatewayMethod: function() {
  }, registerCli: function() {
  }, registerService: function() {
  }, registerProvider: function() {
  }, resolvePath: (p) => p };
}
function fakeCtx(overrides = {  }) {
  return { config: {  }, workspaceDir: "/tmp", agentDir: "/tmp", agentId: "main", sessionKey: "main", messageChannel: undefined, agentAccountId: undefined, sandboxed: false, ...overrides:  };
}
describe("lobster plugin tool", () => {
  it("runs lobster and returns parsed envelope in details", async () => {
    const fake = await writeFakeLobster({ payload: { ok: true, status: "ok", output: [{ hello: "world" }], requiresApproval: null } });
    const tool = createLobsterTool(fakeApi());
    const res = await tool.execute("call1", { action: "run", pipeline: "noop", lobsterPath: fake.binPath, timeoutMs: 1000 });
    expect(res.details).toMatchObject({ ok: true, status: "ok" });
  });
  it("tolerates noisy stdout before the JSON envelope", async () => {
    const payload = { ok: true, status: "ok", output: [], requiresApproval: null };
    const {binPath} = await writeFakeLobsterScript((("const payload = ;
" + "console.log(\"noise before json\");
") + "process.stdout.write(JSON.stringify(payload));
"), "openclaw-lobster-plugin-noisy-");
    const tool = createLobsterTool(fakeApi());
    const res = await tool.execute("call-noisy", { action: "run", pipeline: "noop", lobsterPath: binPath, timeoutMs: 1000 });
    expect(res.details).toMatchObject({ ok: true, status: "ok" });
  });
  it("requires absolute lobsterPath when provided", async () => {
    const tool = createLobsterTool(fakeApi());
    await expect(tool.execute("call2", { action: "run", pipeline: "noop", lobsterPath: "./lobster" })).rejects.toThrow(/absolute path/);
  });
  it("rejects invalid JSON from lobster", async () => {
    const {binPath} = await writeFakeLobsterScript("process.stdout.write(\"nope\");
", "openclaw-lobster-plugin-bad-");
    const tool = createLobsterTool(fakeApi());
    await expect(tool.execute("call3", { action: "run", pipeline: "noop", lobsterPath: binPath })).rejects.toThrow(/invalid JSON/);
  });
  it("can be gated off in sandboxed contexts", async () => {
    const api = fakeApi();
    const factoryTool = (ctx) => {
      if (ctx.sandboxed) {
        return null;
      }
      return createLobsterTool(api);
    };
    expect(factoryTool(fakeCtx({ sandboxed: true }))).toBeNull();
    expect(factoryTool(fakeCtx({ sandboxed: false }))?.name).toBe("lobster");
  });
});
