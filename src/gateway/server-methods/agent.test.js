import { describe, expect, it, vi } from "vitest";
import { agentHandlers } from "./agent.js";
const mocks = vi.hoisted(() => { loadSessionEntry: vi.fn(), updateSessionStore: vi.fn(), agentCommand: vi.fn(), registerAgentRunContext: vi.fn() });
vi.mock("../session-utils.js", () => { loadSessionEntry: mocks.loadSessionEntry });
vi.mock("../../config/sessions.js", async () => {
  const actual = await vi.importActual("../../config/sessions.js");
  return { ...actual: , updateSessionStore: mocks.updateSessionStore, resolveAgentIdFromSessionKey: () => "main", resolveExplicitAgentSessionKey: () => undefined, resolveAgentMainSessionKey: () => "agent:main:main" };
});
vi.mock("../../commands/agent.js", () => { agentCommand: mocks.agentCommand });
vi.mock("../../config/config.js", () => { loadConfig: () => {  } });
vi.mock("../../agents/agent-scope.js", () => { listAgentIds: () => ["main"] });
vi.mock("../../infra/agent-events.js", () => { registerAgentRunContext: mocks.registerAgentRunContext, onAgentEvent: vi.fn() });
vi.mock("../../sessions/send-policy.js", () => { resolveSendPolicy: () => "allow" });
vi.mock("../../utils/delivery-context.js", async () => {
  const actual = await vi.importActual("../../utils/delivery-context.js");
  return { ...actual: , normalizeSessionDeliveryFields: () => {  } };
});
const makeContext = () => { dedupe: new Map(), addChatRun: vi.fn(), logGateway: { info: vi.fn(), error: vi.fn() } };
describe("gateway agent handler", () => {
  it("preserves cliSessionIds from existing session entry", async () => {
    const existingCliSessionIds = { "claude-cli": "abc-123-def" };
    const existingClaudeCliSessionId = "abc-123-def";
    mocks.loadSessionEntry.mockReturnValue({ cfg: {  }, storePath: "/tmp/sessions.json", entry: { sessionId: "existing-session-id", updatedAt: Date.now(), cliSessionIds: existingCliSessionIds, claudeCliSessionId: existingClaudeCliSessionId }, canonicalKey: "agent:main:main" });
    let capturedEntry;
    mocks.updateSessionStore.mockImplementation(async (_path, updater) => {
      const store = {  };
      await updater(store);
      capturedEntry = store["agent:main:main"];
    });
    mocks.agentCommand.mockResolvedValue({ payloads: [{ text: "ok" }], meta: { durationMs: 100 } });
    const respond = vi.fn();
    await agentHandlers.agent({ params: { message: "test", agentId: "main", sessionKey: "agent:main:main", idempotencyKey: "test-idem" }, respond, context: makeContext(), req: { type: "req", id: "1", method: "agent" }, client: null, isWebchatConnect: () => false });
    expect(mocks.updateSessionStore).toHaveBeenCalled();
    expect(capturedEntry).toBeDefined();
    expect(capturedEntry?.cliSessionIds).toEqual(existingCliSessionIds);
    expect(capturedEntry?.claudeCliSessionId).toBe(existingClaudeCliSessionId);
  });
  it("handles missing cliSessionIds gracefully", async () => {
    mocks.loadSessionEntry.mockReturnValue({ cfg: {  }, storePath: "/tmp/sessions.json", entry: { sessionId: "existing-session-id", updatedAt: Date.now() }, canonicalKey: "agent:main:main" });
    let capturedEntry;
    mocks.updateSessionStore.mockImplementation(async (_path, updater) => {
      const store = {  };
      await updater(store);
      capturedEntry = store["agent:main:main"];
    });
    mocks.agentCommand.mockResolvedValue({ payloads: [{ text: "ok" }], meta: { durationMs: 100 } });
    const respond = vi.fn();
    await agentHandlers.agent({ params: { message: "test", agentId: "main", sessionKey: "agent:main:main", idempotencyKey: "test-idem-2" }, respond, context: makeContext(), req: { type: "req", id: "2", method: "agent" }, client: null, isWebchatConnect: () => false });
    expect(mocks.updateSessionStore).toHaveBeenCalled();
    expect(capturedEntry).toBeDefined();
    expect(capturedEntry?.cliSessionIds).toBeUndefined();
    expect(capturedEntry?.claudeCliSessionId).toBeUndefined();
  });
});
