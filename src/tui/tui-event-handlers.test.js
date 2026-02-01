import { describe, expect, it, vi } from "vitest";
import { createEventHandlers } from "./tui-event-handlers.js";
describe("tui-event-handlers: handleAgentEvent", () => {
  const makeState = (overrides) => { agentDefaultId: "main", sessionMainKey: "agent:main:main", sessionScope: "global", agents: [], currentAgentId: "main", currentSessionKey: "agent:main:main", currentSessionId: "session-1", activeChatRunId: "run-1", historyLoaded: true, sessionInfo: {  }, initialSessionApplied: true, isConnected: true, autoMessageSent: false, toolsExpanded: false, showThinking: false, connectionStatus: "connected", activityStatus: "idle", statusTimeout: null, lastCtrlCAt: 0, ...overrides:  };
  const makeContext = (state) => {
    const chatLog = { startTool: vi.fn(), updateToolResult: vi.fn(), addSystem: vi.fn(), updateAssistant: vi.fn(), finalizeAssistant: vi.fn() };
    const tui = { requestRender: vi.fn() };
    const setActivityStatus = vi.fn();
    return { chatLog, tui, state, setActivityStatus };
  };
  it("processes tool events when runId matches activeChatRunId (even if sessionId differs)", () => {
    const state = makeState({ currentSessionId: "session-xyz", activeChatRunId: "run-123" });
    const {chatLog, tui, setActivityStatus} = makeContext(state);
    const {handleAgentEvent} = createEventHandlers({ chatLog: chatLog, tui: tui, state, setActivityStatus });
    const evt = { runId: "run-123", stream: "tool", data: { phase: "start", toolCallId: "tc1", name: "exec", args: { command: "echo hi" } } };
    handleAgentEvent(evt);
    expect(chatLog.startTool).toHaveBeenCalledWith("tc1", "exec", { command: "echo hi" });
    expect(tui.requestRender).toHaveBeenCalledTimes(1);
  });
  it("ignores tool events when runId does not match activeChatRunId", () => {
    const state = makeState({ activeChatRunId: "run-1" });
    const {chatLog, tui, setActivityStatus} = makeContext(state);
    const {handleAgentEvent} = createEventHandlers({ chatLog: chatLog, tui: tui, state, setActivityStatus });
    const evt = { runId: "run-2", stream: "tool", data: { phase: "start", toolCallId: "tc1", name: "exec" } };
    handleAgentEvent(evt);
    expect(chatLog.startTool).not.toHaveBeenCalled();
    expect(chatLog.updateToolResult).not.toHaveBeenCalled();
    expect(tui.requestRender).not.toHaveBeenCalled();
  });
  it("processes lifecycle events when runId matches activeChatRunId", () => {
    const state = makeState({ activeChatRunId: "run-9" });
    const {tui, setActivityStatus} = makeContext(state);
    const {handleAgentEvent} = createEventHandlers({ chatLog: { startTool: vi.fn(), updateToolResult: vi.fn() }, tui: tui, state, setActivityStatus });
    const evt = { runId: "run-9", stream: "lifecycle", data: { phase: "start" } };
    handleAgentEvent(evt);
    expect(setActivityStatus).toHaveBeenCalledWith("running");
    expect(tui.requestRender).toHaveBeenCalledTimes(1);
  });
  it("captures runId from chat events when activeChatRunId is unset", () => {
    const state = makeState({ activeChatRunId: null });
    const {chatLog, tui, setActivityStatus} = makeContext(state);
    const {handleChatEvent, handleAgentEvent} = createEventHandlers({ chatLog: chatLog, tui: tui, state, setActivityStatus });
    const chatEvt = { runId: "run-42", sessionKey: state.currentSessionKey, state: "delta", message: { content: "hello" } };
    handleChatEvent(chatEvt);
    expect(state.activeChatRunId).toBe("run-42");
    const agentEvt = { runId: "run-42", stream: "tool", data: { phase: "start", toolCallId: "tc1", name: "exec" } };
    handleAgentEvent(agentEvt);
    expect(chatLog.startTool).toHaveBeenCalledWith("tc1", "exec", undefined);
  });
  it("clears run mapping when the session changes", () => {
    const state = makeState({ activeChatRunId: null });
    const {chatLog, tui, setActivityStatus} = makeContext(state);
    const {handleChatEvent, handleAgentEvent} = createEventHandlers({ chatLog: chatLog, tui: tui, state, setActivityStatus });
    handleChatEvent({ runId: "run-old", sessionKey: state.currentSessionKey, state: "delta", message: { content: "hello" } });
    state.currentSessionKey = "agent:main:other";
    state.activeChatRunId = null;
    tui.requestRender.mockClear();
    handleAgentEvent({ runId: "run-old", stream: "tool", data: { phase: "start", toolCallId: "tc2", name: "exec" } });
    expect(chatLog.startTool).not.toHaveBeenCalled();
    expect(tui.requestRender).not.toHaveBeenCalled();
  });
  it("ignores lifecycle updates for non-active runs in the same session", () => {
    const state = makeState({ activeChatRunId: "run-active" });
    const {chatLog, tui, setActivityStatus} = makeContext(state);
    const {handleChatEvent, handleAgentEvent} = createEventHandlers({ chatLog: chatLog, tui: tui, state, setActivityStatus });
    handleChatEvent({ runId: "run-other", sessionKey: state.currentSessionKey, state: "delta", message: { content: "hello" } });
    setActivityStatus.mockClear();
    tui.requestRender.mockClear();
    handleAgentEvent({ runId: "run-other", stream: "lifecycle", data: { phase: "end" } });
    expect(setActivityStatus).not.toHaveBeenCalled();
    expect(tui.requestRender).not.toHaveBeenCalled();
  });
});
