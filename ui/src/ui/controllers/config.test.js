import { describe, expect, it, vi } from "vitest";
import { applyConfigSnapshot, applyConfig, runUpdate, updateConfigFormValue } from "./config";
function createState() {
  return { client: null, connected: false, applySessionKey: "main", configLoading: false, configRaw: "", configRawOriginal: "", configValid: null, configIssues: [], configSaving: false, configApplying: false, updateRunning: false, configSnapshot: null, configSchema: null, configSchemaVersion: null, configSchemaLoading: false, configUiHints: {  }, configForm: null, configFormOriginal: null, configFormDirty: false, configFormMode: "form", lastError: null };
}
describe("applyConfigSnapshot", () => {
  it("does not clobber form edits while dirty", () => {
    const state = createState();
    state.configFormMode = "form";
    state.configFormDirty = true;
    state.configForm = { gateway: { mode: "local", port: 18789 } };
    state.configRaw = "{
}
";
    applyConfigSnapshot(state, { config: { gateway: { mode: "remote", port: 9999 } }, valid: true, issues: [], raw: "{
  \"gateway\": { \"mode\": \"remote\", \"port\": 9999 }
}
" });
    expect(state.configRaw).toBe("{
  \"gateway\": {
    \"mode\": \"local\",
    \"port\": 18789
  }
}
");
  });
  it("updates config form when clean", () => {
    const state = createState();
    applyConfigSnapshot(state, { config: { gateway: { mode: "local" } }, valid: true, issues: [], raw: "{}" });
    expect(state.configForm).toEqual({ gateway: { mode: "local" } });
  });
  it("sets configRawOriginal when clean for change detection", () => {
    const state = createState();
    applyConfigSnapshot(state, { config: { gateway: { mode: "local" } }, valid: true, issues: [], raw: "{ \"gateway\": { \"mode\": \"local\" } }" });
    expect(state.configRawOriginal).toBe("{ \"gateway\": { \"mode\": \"local\" } }");
    expect(state.configFormOriginal).toEqual({ gateway: { mode: "local" } });
  });
  it("preserves configRawOriginal when dirty", () => {
    const state = createState();
    state.configFormDirty = true;
    state.configRawOriginal = "{ \"original\": true }";
    state.configFormOriginal = { original: true };
    applyConfigSnapshot(state, { config: { gateway: { mode: "local" } }, valid: true, issues: [], raw: "{ \"gateway\": { \"mode\": \"local\" } }" });
    expect(state.configRawOriginal).toBe("{ \"original\": true }");
    expect(state.configFormOriginal).toEqual({ original: true });
  });
});
describe("updateConfigFormValue", () => {
  it("seeds from snapshot when form is null", () => {
    const state = createState();
    state.configSnapshot = { config: { channels: { telegram: { botToken: "t" } }, gateway: { mode: "local" } }, valid: true, issues: [], raw: "{}" };
    updateConfigFormValue(state, ["gateway", "port"], 18789);
    expect(state.configFormDirty).toBe(true);
    expect(state.configForm).toEqual({ channels: { telegram: { botToken: "t" } }, gateway: { mode: "local", port: 18789 } });
  });
  it("keeps raw in sync while editing the form", () => {
    const state = createState();
    state.configSnapshot = { config: { gateway: { mode: "local" } }, valid: true, issues: [], raw: "{
}
" };
    updateConfigFormValue(state, ["gateway", "port"], 18789);
    expect(state.configRaw).toBe("{
  \"gateway\": {
    \"mode\": \"local\",
    \"port\": 18789
  }
}
");
  });
});
describe("applyConfig", () => {
  it("sends config.apply with raw and session key", async () => {
    const request = vi.fn().mockResolvedValue({  });
    const state = createState();
    state.connected = true;
    state.client = { request };
    state.applySessionKey = "agent:main:whatsapp:dm:+15555550123";
    state.configFormMode = "raw";
    state.configRaw = "{
  agent: { workspace: \"~/openclaw\" }
}
";
    state.configSnapshot = { hash: "hash-123" };
    await applyConfig(state);
    expect(request).toHaveBeenCalledWith("config.apply", { raw: "{
  agent: { workspace: \"~/openclaw\" }
}
", baseHash: "hash-123", sessionKey: "agent:main:whatsapp:dm:+15555550123" });
  });
});
describe("runUpdate", () => {
  it("sends update.run with session key", async () => {
    const request = vi.fn().mockResolvedValue({  });
    const state = createState();
    state.connected = true;
    state.client = { request };
    state.applySessionKey = "agent:main:whatsapp:dm:+15555550123";
    await runUpdate(state);
    expect(request).toHaveBeenCalledWith("update.run", { sessionKey: "agent:main:whatsapp:dm:+15555550123" });
  });
});
