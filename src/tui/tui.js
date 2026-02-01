import { CombinedAutocompleteProvider, Container, Loader, ProcessTerminal, Text, TUI } from "@mariozechner/pi-tui";
import { resolveDefaultAgentId } from "../agents/agent-scope.js";
import { loadConfig } from "../config/config.js";
import { buildAgentMainSessionKey, normalizeAgentId, normalizeMainKey, parseAgentSessionKey } from "../routing/session-key.js";
import { getSlashCommands } from "./commands.js";
import { ChatLog } from "./components/chat-log.js";
import { CustomEditor } from "./components/custom-editor.js";
import { GatewayChatClient } from "./gateway-chat.js";
import { editorTheme, theme } from "./theme/theme.js";
import { createCommandHandlers } from "./tui-command-handlers.js";
import { createEventHandlers } from "./tui-event-handlers.js";
import { formatTokens } from "./tui-formatters.js";
import { createLocalShellRunner } from "./tui-local-shell.js";
import { buildWaitingStatusMessage, defaultWaitingPhrases } from "./tui-waiting.js";
import { createOverlayHandlers } from "./tui-overlays.js";
import { createSessionActions } from "./tui-session-actions.js";
export { resolveFinalAssistantText } from "./tui-formatters.js";
export function createEditorSubmitHandler(params) {
  return (text) => {
    const raw = text;
    const value = raw.trim();
    params.editor.setText("");
    if (!value) {
      return;
    }
    if ((raw.startsWith("!") && (raw !== "!"))) {
      params.editor.addToHistory(raw);
      void params.handleBangLine(raw);
      return;
    }
    params.editor.addToHistory(value);
    if (value.startsWith("/")) {
      void params.handleCommand(value);
      return;
    }
    void params.sendMessage(value);
  };
}

export async function runTui(opts) {
  const config = loadConfig();
  const initialSessionInput = (opts.session ?? "").trim();
  let sessionScope = (config.session?.scope ?? "per-sender");
  let sessionMainKey = normalizeMainKey(config.session?.mainKey);
  let agentDefaultId = resolveDefaultAgentId(config);
  let currentAgentId = agentDefaultId;
  let agents = [];
  const agentNames = new Map();
  let currentSessionKey = "";
  let initialSessionApplied = false;
  let currentSessionId = null;
  let activeChatRunId = null;
  let historyLoaded = false;
  let isConnected = false;
  let wasDisconnected = false;
  let toolsExpanded = false;
  let showThinking = false;
  const deliverDefault = (opts.deliver ?? false);
  const autoMessage = opts.message?.trim();
  let autoMessageSent = false;
  let sessionInfo = {  };
  let lastCtrlCAt = 0;
  let activityStatus = "idle";
  let connectionStatus = "connecting";
  let statusTimeout = null;
  let statusTimer = null;
  let statusStartedAt = null;
  let lastActivityStatus = activityStatus;
  const state = { agentDefaultId: function() {
    return agentDefaultId;
  }, agentDefaultId: function(value) {
    agentDefaultId = value;
  }, sessionMainKey: function() {
    return sessionMainKey;
  }, sessionMainKey: function(value) {
    sessionMainKey = value;
  }, sessionScope: function() {
    return sessionScope;
  }, sessionScope: function(value) {
    sessionScope = value;
  }, agents: function() {
    return agents;
  }, agents: function(value) {
    agents = value;
  }, currentAgentId: function() {
    return currentAgentId;
  }, currentAgentId: function(value) {
    currentAgentId = value;
  }, currentSessionKey: function() {
    return currentSessionKey;
  }, currentSessionKey: function(value) {
    currentSessionKey = value;
  }, currentSessionId: function() {
    return currentSessionId;
  }, currentSessionId: function(value) {
    currentSessionId = value;
  }, activeChatRunId: function() {
    return activeChatRunId;
  }, activeChatRunId: function(value) {
    activeChatRunId = value;
  }, historyLoaded: function() {
    return historyLoaded;
  }, historyLoaded: function(value) {
    historyLoaded = value;
  }, sessionInfo: function() {
    return sessionInfo;
  }, sessionInfo: function(value) {
    sessionInfo = value;
  }, initialSessionApplied: function() {
    return initialSessionApplied;
  }, initialSessionApplied: function(value) {
    initialSessionApplied = value;
  }, isConnected: function() {
    return isConnected;
  }, isConnected: function(value) {
    isConnected = value;
  }, autoMessageSent: function() {
    return autoMessageSent;
  }, autoMessageSent: function(value) {
    autoMessageSent = value;
  }, toolsExpanded: function() {
    return toolsExpanded;
  }, toolsExpanded: function(value) {
    toolsExpanded = value;
  }, showThinking: function() {
    return showThinking;
  }, showThinking: function(value) {
    showThinking = value;
  }, connectionStatus: function() {
    return connectionStatus;
  }, connectionStatus: function(value) {
    connectionStatus = value;
  }, activityStatus: function() {
    return activityStatus;
  }, activityStatus: function(value) {
    activityStatus = value;
  }, statusTimeout: function() {
    return statusTimeout;
  }, statusTimeout: function(value) {
    statusTimeout = value;
  }, lastCtrlCAt: function() {
    return lastCtrlCAt;
  }, lastCtrlCAt: function(value) {
    lastCtrlCAt = value;
  } };
  const client = new GatewayChatClient({ url: opts.url, token: opts.token, password: opts.password });
  const tui = new TUI(new ProcessTerminal());
  const header = new Text("", 1, 0);
  const statusContainer = new Container();
  const footer = new Text("", 1, 0);
  const chatLog = new ChatLog();
  const editor = new CustomEditor(tui, editorTheme);
  const root = new Container();
  root.addChild(header);
  root.addChild(chatLog);
  root.addChild(statusContainer);
  root.addChild(footer);
  root.addChild(editor);
  const updateAutocompleteProvider = () => {
    editor.setAutocompleteProvider(new CombinedAutocompleteProvider(getSlashCommands({ cfg: config, provider: sessionInfo.modelProvider, model: sessionInfo.model }), process.cwd()));
  };
  tui.addChild(root);
  tui.setFocus(editor);
  const formatSessionKey = (key) => {
    if (((key === "global") || (key === "unknown"))) {
      return key;
    }
    const parsed = parseAgentSessionKey(key);
    return (parsed?.rest ?? key);
  };
  const formatAgentLabel = (id) => {
    const name = agentNames.get(id);
    return name ? " ()" : id;
  };
  const resolveSessionKey = (raw) => {
    const trimmed = (raw ?? "").trim();
    if ((sessionScope === "global")) {
      return "global";
    }
    if (!trimmed) {
      return buildAgentMainSessionKey({ agentId: currentAgentId, mainKey: sessionMainKey });
    }
    if (((trimmed === "global") || (trimmed === "unknown"))) {
      return trimmed;
    }
    if (trimmed.startsWith("agent:")) {
      return trimmed;
    }
    return "agent::";
  };
  currentSessionKey = resolveSessionKey(initialSessionInput);
  const updateHeader = () => {
    const sessionLabel = formatSessionKey(currentSessionKey);
    const agentLabel = formatAgentLabel(currentAgentId);
    header.setText(theme.header("openclaw tui -  - agent  - session "));
  };
  const busyStates = new Set(["sending", "waiting", "streaming", "running"]);
  let statusText = null;
  let statusLoader = null;
  const formatElapsed = (startMs) => {
    const totalSeconds = Math.max(0, Math.floor(((Date.now() - startMs) / 1000)));
    if ((totalSeconds < 60)) {
      return "s";
    }
    const minutes = Math.floor((totalSeconds / 60));
    const seconds = (totalSeconds % 60);
    return "m s";
  };
  const ensureStatusText = () => {
    if (statusText) {
      return;
    }
    statusContainer.clear();
    statusLoader?.stop();
    statusLoader = null;
    statusText = new Text("", 1, 0);
    statusContainer.addChild(statusText);
  };
  const ensureStatusLoader = () => {
    if (statusLoader) {
      return;
    }
    statusContainer.clear();
    statusText = null;
    statusLoader = new Loader(tui, (spinner) => theme.accent(spinner), (text) => theme.bold(theme.accentSoft(text)), "");
    statusContainer.addChild(statusLoader);
  };
  let waitingTick = 0;
  let waitingTimer = null;
  let waitingPhrase = null;
  const updateBusyStatusMessage = () => {
    if ((!statusLoader || !statusStartedAt)) {
      return;
    }
    const elapsed = formatElapsed(statusStartedAt);
    if ((activityStatus === "waiting")) {
      waitingTick++;
      statusLoader.setMessage(buildWaitingStatusMessage({ theme, tick: waitingTick, elapsed, connectionStatus, phrases: waitingPhrase ? [waitingPhrase] : undefined }));
      return;
    }
    statusLoader.setMessage(" •  | ");
  };
  const startStatusTimer = () => {
    if (statusTimer) {
      return;
    }
    statusTimer = setInterval(() => {
      if (!busyStates.has(activityStatus)) {
        return;
      }
      updateBusyStatusMessage();
    }, 1000);
  };
  const stopStatusTimer = () => {
    if (!statusTimer) {
      return;
    }
    clearInterval(statusTimer);
    statusTimer = null;
  };
  const startWaitingTimer = () => {
    if (waitingTimer) {
      return;
    }
    if (!waitingPhrase) {
      const idx = Math.floor((Math.random() * defaultWaitingPhrases.length));
      waitingPhrase = ((defaultWaitingPhrases[idx] ?? defaultWaitingPhrases[0]) ?? "waiting");
    }
    waitingTick = 0;
    waitingTimer = setInterval(() => {
      if ((activityStatus !== "waiting")) {
        return;
      }
      updateBusyStatusMessage();
    }, 120);
  };
  const stopWaitingTimer = () => {
    if (!waitingTimer) {
      return;
    }
    clearInterval(waitingTimer);
    waitingTimer = null;
    waitingPhrase = null;
  };
  const renderStatus = () => {
    const isBusy = busyStates.has(activityStatus);
    if (isBusy) {
      if ((!statusStartedAt || (lastActivityStatus !== activityStatus))) {
        statusStartedAt = Date.now();
      }
      ensureStatusLoader();
      if ((activityStatus === "waiting")) {
        stopStatusTimer();
        startWaitingTimer();
      } else {
        stopWaitingTimer();
        startStatusTimer();
      }
      updateBusyStatusMessage();
    } else {
      statusStartedAt = null;
      stopStatusTimer();
      stopWaitingTimer();
      statusLoader?.stop();
      statusLoader = null;
      ensureStatusText();
      const text = activityStatus ? " | " : connectionStatus;
      statusText?.setText(theme.dim(text));
    }
    lastActivityStatus = activityStatus;
  };
  const setConnectionStatus = (text, ttlMs) => {
    connectionStatus = text;
    renderStatus();
    if (statusTimeout) {
      clearTimeout(statusTimeout);
    }
    if ((ttlMs && (ttlMs > 0))) {
      statusTimeout = setTimeout(() => {
        connectionStatus = isConnected ? "connected" : "disconnected";
        renderStatus();
      }, ttlMs);
    }
  };
  const setActivityStatus = (text) => {
    activityStatus = text;
    renderStatus();
  };
  const updateFooter = () => {
    const sessionKeyLabel = formatSessionKey(currentSessionKey);
    const sessionLabel = sessionInfo.displayName ? " ()" : sessionKeyLabel;
    const agentLabel = formatAgentLabel(currentAgentId);
    const modelLabel = sessionInfo.model ? sessionInfo.modelProvider ? "/" : sessionInfo.model : "unknown";
    const tokens = formatTokens((sessionInfo.totalTokens ?? null), (sessionInfo.contextTokens ?? null));
    const think = (sessionInfo.thinkingLevel ?? "off");
    const verbose = (sessionInfo.verboseLevel ?? "off");
    const reasoning = (sessionInfo.reasoningLevel ?? "off");
    const reasoningLabel = (reasoning === "on") ? "reasoning" : (reasoning === "stream") ? "reasoning:stream" : null;
    const footerParts = ["agent ", "session ", modelLabel, (think !== "off") ? "think " : null, (verbose !== "off") ? "verbose " : null, reasoningLabel, tokens].filter(Boolean);
    footer.setText(theme.dim(footerParts.join(" | ")));
  };
  const {openOverlay, closeOverlay} = createOverlayHandlers(tui, editor);
  const initialSessionAgentId = () => {
    if (!initialSessionInput) {
      return null;
    }
    const parsed = parseAgentSessionKey(initialSessionInput);
    return parsed ? normalizeAgentId(parsed.agentId) : null;
  }();
  const sessionActions = createSessionActions({ client, chatLog, tui, opts, state, agentNames, initialSessionInput, initialSessionAgentId, resolveSessionKey, updateHeader, updateFooter, updateAutocompleteProvider, setActivityStatus });
  const {refreshAgents, refreshSessionInfo, loadHistory, setSession, abortActive} = sessionActions;
  const {handleChatEvent, handleAgentEvent} = createEventHandlers({ chatLog, tui, state, setActivityStatus, refreshSessionInfo });
  const {handleCommand, sendMessage, openModelSelector, openAgentSelector, openSessionSelector} = createCommandHandlers({ client, chatLog, tui, opts, state, deliverDefault, openOverlay, closeOverlay, refreshSessionInfo, loadHistory, setSession, refreshAgents, abortActive, setActivityStatus, formatSessionKey });
  const {runLocalShellLine} = createLocalShellRunner({ chatLog, tui, openOverlay, closeOverlay });
  updateAutocompleteProvider();
  editor.onSubmit = createEditorSubmitHandler({ editor, handleCommand, sendMessage, handleBangLine: runLocalShellLine });
  editor.onEscape = () => {
    void abortActive();
  };
  editor.onCtrlC = () => {
    const now = Date.now();
    if ((editor.getText().trim().length > 0)) {
      editor.setText("");
      setActivityStatus("cleared input");
      tui.requestRender();
      return;
    }
    if (((now - lastCtrlCAt) < 1000)) {
      client.stop();
      tui.stop();
      process.exit(0);
    }
    lastCtrlCAt = now;
    setActivityStatus("press ctrl+c again to exit");
    tui.requestRender();
  };
  editor.onCtrlD = () => {
    client.stop();
    tui.stop();
    process.exit(0);
  };
  editor.onCtrlO = () => {
    toolsExpanded = !toolsExpanded;
    chatLog.setToolsExpanded(toolsExpanded);
    setActivityStatus(toolsExpanded ? "tools expanded" : "tools collapsed");
    tui.requestRender();
  };
  editor.onCtrlL = () => {
    void openModelSelector();
  };
  editor.onCtrlG = () => {
    void openAgentSelector();
  };
  editor.onCtrlP = () => {
    void openSessionSelector();
  };
  editor.onCtrlT = () => {
    showThinking = !showThinking;
    void loadHistory();
  };
  client.onEvent = (evt) => {
    if ((evt.event === "chat")) {
      handleChatEvent(evt.payload);
    }
    if ((evt.event === "agent")) {
      handleAgentEvent(evt.payload);
    }
  };
  client.onConnected = () => {
    isConnected = true;
    const reconnected = wasDisconnected;
    wasDisconnected = false;
    setConnectionStatus("connected");
    void async () => {
      await refreshAgents();
      updateHeader();
      await loadHistory();
      setConnectionStatus(reconnected ? "gateway reconnected" : "gateway connected", 4000);
      tui.requestRender();
      if ((!autoMessageSent && autoMessage)) {
        autoMessageSent = true;
        await sendMessage(autoMessage);
      }
      updateFooter();
      tui.requestRender();
    }();
  };
  client.onDisconnected = (reason) => {
    isConnected = false;
    wasDisconnected = true;
    historyLoaded = false;
    const reasonLabel = reason?.trim() ? reason.trim() : "closed";
    setConnectionStatus("gateway disconnected: ", 5000);
    setActivityStatus("idle");
    updateFooter();
    tui.requestRender();
  };
  client.onGap = (info) => {
    setConnectionStatus("event gap: expected , got ", 5000);
    tui.requestRender();
  };
  updateHeader();
  setConnectionStatus("connecting");
  updateFooter();
  tui.start();
  client.start();
}

