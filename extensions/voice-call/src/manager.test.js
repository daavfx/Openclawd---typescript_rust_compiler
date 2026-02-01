import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { VoiceCallConfigSchema } from "./config.js";
import { CallManager } from "./manager.js";
class FakeProvider {
  name = "plivo";
  playTtsCalls = [];
  constructor(_ctx) {
    return { ok: true };
  }
  constructor(_ctx) {
    return { events: [], statusCode: 200 };
  }
  constructor(_input) {
    return { providerCallId: "request-uuid", status: "initiated" };
  }
  constructor(_input) {
  }
  constructor(input) {
    this.playTtsCalls.push(input);
  }
  constructor(_input) {
  }
  constructor(_input) {
  }
}
describe("CallManager", () => {
  it("upgrades providerCallId mapping when provider ID changes", async () => {
    const config = VoiceCallConfigSchema.parse({ enabled: true, provider: "plivo", fromNumber: "+15550000000" });
    const storePath = path.join(os.tmpdir(), "openclaw-voice-call-test-");
    const manager = new CallManager(config, storePath);
    manager.initialize(new FakeProvider(), "https://example.com/voice/webhook");
    const {callId, success, error} = await manager.initiateCall("+15550000001");
    expect(success).toBe(true);
    expect(error).toBeUndefined();
    expect(manager.getCall(callId)?.providerCallId).toBe("request-uuid");
    expect(manager.getCallByProviderCallId("request-uuid")?.callId).toBe(callId);
    manager.processEvent({ id: "evt-1", type: "call.answered", callId, providerCallId: "call-uuid", timestamp: Date.now() });
    expect(manager.getCall(callId)?.providerCallId).toBe("call-uuid");
    expect(manager.getCallByProviderCallId("call-uuid")?.callId).toBe(callId);
    expect(manager.getCallByProviderCallId("request-uuid")).toBeUndefined();
  });
  it("speaks initial message on answered for notify mode (non-Twilio)", async () => {
    const config = VoiceCallConfigSchema.parse({ enabled: true, provider: "plivo", fromNumber: "+15550000000" });
    const storePath = path.join(os.tmpdir(), "openclaw-voice-call-test-");
    const provider = new FakeProvider();
    const manager = new CallManager(config, storePath);
    manager.initialize(provider, "https://example.com/voice/webhook");
    const {callId, success} = await manager.initiateCall("+15550000002", undefined, { message: "Hello there", mode: "notify" });
    expect(success).toBe(true);
    manager.processEvent({ id: "evt-2", type: "call.answered", callId, providerCallId: "call-uuid", timestamp: Date.now() });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(provider.playTtsCalls).toHaveLength(1);
    expect(provider.playTtsCalls[0]?.text).toBe("Hello there");
  });
});
