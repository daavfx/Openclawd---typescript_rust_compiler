import { loadConfig, loadConfigSchema } from "./controllers/config";
import { loadCronJobs, loadCronStatus } from "./controllers/cron";
import { loadChannels } from "./controllers/channels";
import { loadDebug } from "./controllers/debug";
import { loadLogs } from "./controllers/logs";
import { loadDevices } from "./controllers/devices";
import { loadNodes } from "./controllers/nodes";
import { loadExecApprovals } from "./controllers/exec-approvals";
import { loadPresence } from "./controllers/presence";
import { loadSessions } from "./controllers/sessions";
import { loadSkills } from "./controllers/skills";
import { inferBasePathFromPathname, normalizeBasePath, normalizePath, pathForTab, tabFromPath } from "./navigation";
import { saveSettings } from "./storage";
import { resolveTheme } from "./theme";
import { startThemeTransition } from "./theme-transition";
import { scheduleChatScroll, scheduleLogsScroll } from "./app-scroll";
import { startLogsPolling, stopLogsPolling, startDebugPolling, stopDebugPolling } from "./app-polling";
import { refreshChat } from "./app-chat";
export function applySettings(host, next) {
  const normalized = { ...next: , lastActiveSessionKey: ((next.lastActiveSessionKey?.trim() || next.sessionKey.trim()) || "main") };
  host.settings = normalized;
  saveSettings(normalized);
  if ((next.theme !== host.theme)) {
    host.theme = next.theme;
    applyResolvedTheme(host, resolveTheme(next.theme));
  }
  host.applySessionKey = host.settings.lastActiveSessionKey;
}

export function setLastActiveSessionKey(host, next) {
  const trimmed = next.trim();
  if (!trimmed) {
    return;
  }
  if ((host.settings.lastActiveSessionKey === trimmed)) {
    return;
  }
  applySettings(host, { ...host.settings: , lastActiveSessionKey: trimmed });
}

export function applySettingsFromUrl(host) {
  if (!window.location.search) {
    return;
  }
  const params = new URLSearchParams(window.location.search);
  const tokenRaw = params.get("token");
  const passwordRaw = params.get("password");
  const sessionRaw = params.get("session");
  const gatewayUrlRaw = params.get("gatewayUrl");
  let shouldCleanUrl = false;
  if ((tokenRaw != null)) {
    const token = tokenRaw.trim();
    if ((token && (token !== host.settings.token))) {
      applySettings(host, { ...host.settings: , token });
    }
    params.delete("token");
    shouldCleanUrl = true;
  }
  if ((passwordRaw != null)) {
    const password = passwordRaw.trim();
    if (password) {
      host.password = password;
    }
    params.delete("password");
    shouldCleanUrl = true;
  }
  if ((sessionRaw != null)) {
    const session = sessionRaw.trim();
    if (session) {
      host.sessionKey = session;
      applySettings(host, { ...host.settings: , sessionKey: session, lastActiveSessionKey: session });
    }
  }
  if ((gatewayUrlRaw != null)) {
    const gatewayUrl = gatewayUrlRaw.trim();
    if ((gatewayUrl && (gatewayUrl !== host.settings.gatewayUrl))) {
      host.pendingGatewayUrl = gatewayUrl;
    }
    params.delete("gatewayUrl");
    shouldCleanUrl = true;
  }
  if (!shouldCleanUrl) {
    return;
  }
  const url = new URL(window.location.href);
  url.search = params.toString();
  window.history.replaceState({  }, "", url.toString());
}

export function setTab(host, next) {
  if ((host.tab !== next)) {
    host.tab = next;
  }
  if ((next === "chat")) {
    host.chatHasAutoScrolled = false;
  }
  if ((next === "logs")) {
    startLogsPolling(host);
  } else {
    stopLogsPolling(host);
  }
  if ((next === "debug")) {
    startDebugPolling(host);
  } else {
    stopDebugPolling(host);
  }
  void refreshActiveTab(host);
  syncUrlWithTab(host, next, false);
}

export function setTheme(host, next, context) {
  const applyTheme = () => {
    host.theme = next;
    applySettings(host, { ...host.settings: , theme: next });
    applyResolvedTheme(host, resolveTheme(next));
  };
  startThemeTransition({ nextTheme: next, applyTheme, context, currentTheme: host.theme });
}

export async function refreshActiveTab(host) {
  if ((host.tab === "overview")) {
    await loadOverview(host);
  }
  if ((host.tab === "channels")) {
    await loadChannelsTab(host);
  }
  if ((host.tab === "instances")) {
    await loadPresence(host);
  }
  if ((host.tab === "sessions")) {
    await loadSessions(host);
  }
  if ((host.tab === "cron")) {
    await loadCron(host);
  }
  if ((host.tab === "skills")) {
    await loadSkills(host);
  }
  if ((host.tab === "nodes")) {
    await loadNodes(host);
    await loadDevices(host);
    await loadConfig(host);
    await loadExecApprovals(host);
  }
  if ((host.tab === "chat")) {
    await refreshChat(host);
    scheduleChatScroll(host, !host.chatHasAutoScrolled);
  }
  if ((host.tab === "config")) {
    await loadConfigSchema(host);
    await loadConfig(host);
  }
  if ((host.tab === "debug")) {
    await loadDebug(host);
    host.eventLog = host.eventLogBuffer;
  }
  if ((host.tab === "logs")) {
    host.logsAtBottom = true;
    await loadLogs(host, { reset: true });
    scheduleLogsScroll(host, true);
  }
}

export function inferBasePath() {
  if ((typeof window === "undefined")) {
    return "";
  }
  const configured = window.__OPENCLAW_CONTROL_UI_BASE_PATH__;
  if (((typeof configured === "string") && configured.trim())) {
    return normalizeBasePath(configured);
  }
  return inferBasePathFromPathname(window.location.pathname);
}

export function syncThemeWithSettings(host) {
  host.theme = (host.settings.theme ?? "system");
  applyResolvedTheme(host, resolveTheme(host.theme));
}

export function applyResolvedTheme(host, resolved) {
  host.themeResolved = resolved;
  if ((typeof document === "undefined")) {
    return;
  }
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
}

export function attachThemeListener(host) {
  if (((typeof window === "undefined") || (typeof window.matchMedia !== "function"))) {
    return;
  }
  host.themeMedia = window.matchMedia("(prefers-color-scheme: dark)");
  host.themeMediaHandler = (event) => {
    if ((host.theme !== "system")) {
      return;
    }
    applyResolvedTheme(host, event.matches ? "dark" : "light");
  };
  if ((typeof host.themeMedia.addEventListener === "function")) {
    host.themeMedia.addEventListener("change", host.themeMediaHandler);
    return;
  }
  const legacy = host.themeMedia;
  legacy.addListener(host.themeMediaHandler);
}

export function detachThemeListener(host) {
  if ((!host.themeMedia || !host.themeMediaHandler)) {
    return;
  }
  if ((typeof host.themeMedia.removeEventListener === "function")) {
    host.themeMedia.removeEventListener("change", host.themeMediaHandler);
    return;
  }
  const legacy = host.themeMedia;
  legacy.removeListener(host.themeMediaHandler);
  host.themeMedia = null;
  host.themeMediaHandler = null;
}

export function syncTabWithLocation(host, replace) {
  if ((typeof window === "undefined")) {
    return;
  }
  const resolved = (tabFromPath(window.location.pathname, host.basePath) ?? "chat");
  setTabFromRoute(host, resolved);
  syncUrlWithTab(host, resolved, replace);
}

export function onPopState(host) {
  if ((typeof window === "undefined")) {
    return;
  }
  const resolved = tabFromPath(window.location.pathname, host.basePath);
  if (!resolved) {
    return;
  }
  const url = new URL(window.location.href);
  const session = url.searchParams.get("session")?.trim();
  if (session) {
    host.sessionKey = session;
    applySettings(host, { ...host.settings: , sessionKey: session, lastActiveSessionKey: session });
  }
  setTabFromRoute(host, resolved);
}

export function setTabFromRoute(host, next) {
  if ((host.tab !== next)) {
    host.tab = next;
  }
  if ((next === "chat")) {
    host.chatHasAutoScrolled = false;
  }
  if ((next === "logs")) {
    startLogsPolling(host);
  } else {
    stopLogsPolling(host);
  }
  if ((next === "debug")) {
    startDebugPolling(host);
  } else {
    stopDebugPolling(host);
  }
  if (host.connected) {
    void refreshActiveTab(host);
  }
}

export function syncUrlWithTab(host, tab, replace) {
  if ((typeof window === "undefined")) {
    return;
  }
  const targetPath = normalizePath(pathForTab(tab, host.basePath));
  const currentPath = normalizePath(window.location.pathname);
  const url = new URL(window.location.href);
  if (((tab === "chat") && host.sessionKey)) {
    url.searchParams.set("session", host.sessionKey);
  } else {
    url.searchParams.delete("session");
  }
  if ((currentPath !== targetPath)) {
    url.pathname = targetPath;
  }
  if (replace) {
    window.history.replaceState({  }, "", url.toString());
  } else {
    window.history.pushState({  }, "", url.toString());
  }
}

export function syncUrlWithSessionKey(host, sessionKey, replace) {
  if ((typeof window === "undefined")) {
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.set("session", sessionKey);
  if (replace) {
    window.history.replaceState({  }, "", url.toString());
  } else {
    window.history.pushState({  }, "", url.toString());
  }
}

export async function loadOverview(host) {
  await Promise.all([loadChannels(host, false), loadPresence(host), loadSessions(host), loadCronStatus(host), loadDebug(host)]);
}

export async function loadChannelsTab(host) {
  await Promise.all([loadChannels(host, true), loadConfigSchema(host), loadConfig(host)]);
}

export async function loadCron(host) {
  await Promise.all([loadChannels(host, false), loadCronStatus(host), loadCronJobs(host)]);
}

