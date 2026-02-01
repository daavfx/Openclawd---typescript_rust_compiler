import { LitElement, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { resolveInjectedAssistantIdentity } from "./assistant-identity";
import { loadSettings } from "./storage";
import { renderApp } from "./app-render";
import { DEFAULT_CRON_FORM, DEFAULT_LOG_LEVEL_FILTERS } from "./app-defaults";
import { resetToolStream as resetToolStreamInternal } from "./app-tool-stream";
import { exportLogs as exportLogsInternal, handleChatScroll as handleChatScrollInternal, handleLogsScroll as handleLogsScrollInternal, resetChatScroll as resetChatScrollInternal } from "./app-scroll";
import { connectGateway as connectGatewayInternal } from "./app-gateway";
import { handleConnected, handleDisconnected, handleFirstUpdated, handleUpdated } from "./app-lifecycle";
import { applySettings as applySettingsInternal, loadCron as loadCronInternal, loadOverview as loadOverviewInternal, setTab as setTabInternal, setTheme as setThemeInternal, onPopState as onPopStateInternal } from "./app-settings";
import { handleAbortChat as handleAbortChatInternal, handleSendChat as handleSendChatInternal, removeQueuedMessage as removeQueuedMessageInternal } from "./app-chat";
import { handleChannelConfigReload as handleChannelConfigReloadInternal, handleChannelConfigSave as handleChannelConfigSaveInternal, handleNostrProfileCancel as handleNostrProfileCancelInternal, handleNostrProfileEdit as handleNostrProfileEditInternal, handleNostrProfileFieldChange as handleNostrProfileFieldChangeInternal, handleNostrProfileImport as handleNostrProfileImportInternal, handleNostrProfileSave as handleNostrProfileSaveInternal, handleNostrProfileToggleAdvanced as handleNostrProfileToggleAdvancedInternal, handleWhatsAppLogout as handleWhatsAppLogoutInternal, handleWhatsAppStart as handleWhatsAppStartInternal, handleWhatsAppWait as handleWhatsAppWaitInternal } from "./app-channels";
import { loadAssistantIdentity as loadAssistantIdentityInternal } from "./controllers/assistant-identity";
const injectedAssistantIdentity = resolveInjectedAssistantIdentity();
function resolveOnboardingMode() {
  if (!window.location.search) {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("onboarding");
  if (!raw) {
    return false;
  }
  const normalized = raw.trim().toLowerCase();
  return ((((normalized === "1") || (normalized === "true")) || (normalized === "yes")) || (normalized === "on"));
}
export class OpenClawApp extends LitElement {
  settings = loadSettings();
  password = "";
  tab = "chat";
  onboarding = resolveOnboardingMode();
  connected = false;
  theme = (this.settings.theme ?? "system");
  themeResolved = "dark";
  hello = null;
  lastError = null;
  eventLog = [];
  eventLogBuffer = [];
  toolStreamSyncTimer = null;
  sidebarCloseTimer = null;
  assistantName = injectedAssistantIdentity.name;
  assistantAvatar = injectedAssistantIdentity.avatar;
  assistantAgentId = (injectedAssistantIdentity.agentId ?? null);
  sessionKey = this.settings.sessionKey;
  chatLoading = false;
  chatSending = false;
  chatMessage = "";
  chatMessages = [];
  chatToolMessages = [];
  chatStream = null;
  chatStreamStartedAt = null;
  chatRunId = null;
  compactionStatus = null;
  chatAvatarUrl = null;
  chatThinkingLevel = null;
  chatQueue = [];
  chatAttachments = [];
  sidebarOpen = false;
  sidebarContent = null;
  sidebarError = null;
  splitRatio = this.settings.splitRatio;
  nodesLoading = false;
  nodes = [];
  devicesLoading = false;
  devicesError = null;
  devicesList = null;
  execApprovalsLoading = false;
  execApprovalsSaving = false;
  execApprovalsDirty = false;
  execApprovalsSnapshot = null;
  execApprovalsForm = null;
  execApprovalsSelectedAgent = null;
  execApprovalsTarget = "gateway";
  execApprovalsTargetNodeId = null;
  execApprovalQueue = [];
  execApprovalBusy = false;
  execApprovalError = null;
  pendingGatewayUrl = null;
  configLoading = false;
  configRaw = "{
}
";
  configRawOriginal = "";
  configValid = null;
  configIssues = [];
  configSaving = false;
  configApplying = false;
  updateRunning = false;
  applySessionKey = this.settings.lastActiveSessionKey;
  configSnapshot = null;
  configSchema = null;
  configSchemaVersion = null;
  configSchemaLoading = false;
  configUiHints = {  };
  configForm = null;
  configFormOriginal = null;
  configFormDirty = false;
  configFormMode = "form";
  configSearchQuery = "";
  configActiveSection = null;
  configActiveSubsection = null;
  channelsLoading = false;
  channelsSnapshot = null;
  channelsError = null;
  channelsLastSuccess = null;
  whatsappLoginMessage = null;
  whatsappLoginQrDataUrl = null;
  whatsappLoginConnected = null;
  whatsappBusy = false;
  nostrProfileFormState = null;
  nostrProfileAccountId = null;
  presenceLoading = false;
  presenceEntries = [];
  presenceError = null;
  presenceStatus = null;
  agentsLoading = false;
  agentsList = null;
  agentsError = null;
  sessionsLoading = false;
  sessionsResult = null;
  sessionsError = null;
  sessionsFilterActive = "";
  sessionsFilterLimit = "120";
  sessionsIncludeGlobal = true;
  sessionsIncludeUnknown = false;
  cronLoading = false;
  cronJobs = [];
  cronStatus = null;
  cronError = null;
  cronForm = { ...DEFAULT_CRON_FORM:  };
  cronRunsJobId = null;
  cronRuns = [];
  cronBusy = false;
  skillsLoading = false;
  skillsReport = null;
  skillsError = null;
  skillsFilter = "";
  skillEdits = {  };
  skillsBusyKey = null;
  skillMessages = {  };
  debugLoading = false;
  debugStatus = null;
  debugHealth = null;
  debugModels = [];
  debugHeartbeat = null;
  debugCallMethod = "";
  debugCallParams = "{}";
  debugCallResult = null;
  debugCallError = null;
  logsLoading = false;
  logsError = null;
  logsFile = null;
  logsEntries = [];
  logsFilterText = "";
  logsLevelFilters = { ...DEFAULT_LOG_LEVEL_FILTERS:  };
  logsAutoFollow = true;
  logsTruncated = false;
  logsCursor = null;
  logsLastFetchAt = null;
  logsLimit = 500;
  logsMaxBytes = 250000;
  logsAtBottom = true;
  client = null;
  chatScrollFrame = null;
  chatScrollTimeout = null;
  chatHasAutoScrolled = false;
  chatUserNearBottom = true;
  nodesPollInterval = null;
  logsPollInterval = null;
  debugPollInterval = null;
  logsScrollFrame = null;
  toolStreamById = new Map();
  toolStreamOrder = [];
  refreshSessionsAfterChat = false;
  basePath = "";
  popStateHandler = () => onPopStateInternal(this);
  themeMedia = null;
  themeMediaHandler = null;
  topbarObserver = null;
  constructor() {
    return this;
  }
  constructor() {
    super.connectedCallback();
    handleConnected(this);
  }
  constructor() {
    handleFirstUpdated(this);
  }
  constructor() {
    handleDisconnected(this);
    super.disconnectedCallback();
  }
  constructor(changed) {
    handleUpdated(this, changed);
  }
  constructor() {
    connectGatewayInternal(this);
  }
  constructor(event) {
    handleChatScrollInternal(this, event);
  }
  constructor(event) {
    handleLogsScrollInternal(this, event);
  }
  constructor(lines, label) {
    exportLogsInternal(lines, label);
  }
  constructor() {
    resetToolStreamInternal(this);
  }
  constructor() {
    resetChatScrollInternal(this);
  }
  constructor() {
    await loadAssistantIdentityInternal(this);
  }
  constructor(next) {
    applySettingsInternal(this, next);
  }
  constructor(next) {
    setTabInternal(this, next);
  }
  constructor(next, context) {
    setThemeInternal(this, next, context);
  }
  constructor() {
    await loadOverviewInternal(this);
  }
  constructor() {
    await loadCronInternal(this);
  }
  constructor() {
    await handleAbortChatInternal(this);
  }
  constructor(id) {
    removeQueuedMessageInternal(this, id);
  }
  constructor(messageOverride, opts) {
    await handleSendChatInternal(this, messageOverride, opts);
  }
  constructor(force) {
    await handleWhatsAppStartInternal(this, force);
  }
  constructor() {
    await handleWhatsAppWaitInternal(this);
  }
  constructor() {
    await handleWhatsAppLogoutInternal(this);
  }
  constructor() {
    await handleChannelConfigSaveInternal(this);
  }
  constructor() {
    await handleChannelConfigReloadInternal(this);
  }
  constructor(accountId, profile) {
    handleNostrProfileEditInternal(this, accountId, profile);
  }
  constructor() {
    handleNostrProfileCancelInternal(this);
  }
  constructor(field, value) {
    handleNostrProfileFieldChangeInternal(this, field, value);
  }
  constructor() {
    await handleNostrProfileSaveInternal(this);
  }
  constructor() {
    await handleNostrProfileImportInternal(this);
  }
  constructor() {
    handleNostrProfileToggleAdvancedInternal(this);
  }
  constructor(decision) {
    const active = this.execApprovalQueue[0];
    if (((!active || !this.client) || this.execApprovalBusy)) {
      return;
    }
    this.execApprovalBusy = true;
    this.execApprovalError = null;
    try {
      {
        await this.client.request("exec.approval.resolve", { id: active.id, decision });
        this.execApprovalQueue = this.execApprovalQueue.filter((entry) => (entry.id !== active.id));
      }
    }
    catch (err) {
      {
        this.execApprovalError = "Exec approval failed: ";
      }
    }
    finally {
      {
        this.execApprovalBusy = false;
      }
    }
  }
  constructor() {
    const nextGatewayUrl = this.pendingGatewayUrl;
    if (!nextGatewayUrl) {
      return;
    }
    this.pendingGatewayUrl = null;
    applySettingsInternal(this, { ...this.settings: , gatewayUrl: nextGatewayUrl });
    this.connect();
  }
  constructor() {
    this.pendingGatewayUrl = null;
  }
  constructor(content) {
    if ((this.sidebarCloseTimer != null)) {
      window.clearTimeout(this.sidebarCloseTimer);
      this.sidebarCloseTimer = null;
    }
    this.sidebarContent = content;
    this.sidebarError = null;
    this.sidebarOpen = true;
  }
  constructor() {
    this.sidebarOpen = false;
    if ((this.sidebarCloseTimer != null)) {
      window.clearTimeout(this.sidebarCloseTimer);
    }
    this.sidebarCloseTimer = window.setTimeout(() => {
      if (this.sidebarOpen) {
        return;
      }
      this.sidebarContent = null;
      this.sidebarError = null;
      this.sidebarCloseTimer = null;
    }, 200);
  }
  constructor(ratio) {
    const newRatio = Math.max(0.4, Math.min(0.7, ratio));
    this.splitRatio = newRatio;
    this.applySettings({ ...this.settings: , splitRatio: newRatio });
  }
  constructor() {
    return renderApp(this);
  }
}

