import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import WebSocket from "ws";
import { ensurePortAvailable } from "../infra/ports.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { CONFIG_DIR } from "../utils.js";
import { getHeadersWithAuth, normalizeCdpWsUrl } from "./cdp.js";
import { appendCdpPath } from "./cdp.helpers.js";
import { resolveBrowserExecutableForPlatform } from "./chrome.executables.js";
import { decorateOpenClawProfile, ensureProfileCleanExit, isProfileDecorated } from "./chrome.profile-decoration.js";
import { DEFAULT_OPENCLAW_BROWSER_COLOR, DEFAULT_OPENCLAW_BROWSER_PROFILE_NAME } from "./constants.js";
const log = createSubsystemLogger("browser").child("chrome");
export { findChromeExecutableLinux, findChromeExecutableMac, findChromeExecutableWindows, resolveBrowserExecutableForPlatform } from "./chrome.executables.js";
export { decorateOpenClawProfile, ensureProfileCleanExit, isProfileDecorated } from "./chrome.profile-decoration.js";
function exists(filePath) {
  try {
    {
      return fs.existsSync(filePath);
    }
  }
  catch {
    {
      return false;
    }
  }
}
export 
function resolveBrowserExecutable(resolved) {
  return resolveBrowserExecutableForPlatform(resolved, process.platform);
}
export function resolveOpenClawUserDataDir(profileName = DEFAULT_OPENCLAW_BROWSER_PROFILE_NAME) {
  return path.join(CONFIG_DIR, "browser", profileName, "user-data");
}

function cdpUrlForPort(cdpPort) {
  return "http://127.0.0.1:";
}
export async function isChromeReachable(cdpUrl, timeoutMs = 500) {
  const version = await fetchChromeVersion(cdpUrl, timeoutMs);
  return Boolean(version);
}

async function fetchChromeVersion(cdpUrl, timeoutMs = 500) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    {
      const versionUrl = appendCdpPath(cdpUrl, "/json/version");
      const res = await fetch(versionUrl, { signal: ctrl.signal, headers: getHeadersWithAuth(versionUrl) });
      if (!res.ok) {
        return null;
      }
      const data = await res.json();
      if ((!data || (typeof data !== "object"))) {
        return null;
      }
      return data;
    }
  }
  catch {
    {
      return null;
    }
  }
  finally {
    {
      clearTimeout(t);
    }
  }
}
export async function getChromeWebSocketUrl(cdpUrl, timeoutMs = 500) {
  const version = await fetchChromeVersion(cdpUrl, timeoutMs);
  const wsUrl = String((version?.webSocketDebuggerUrl ?? "")).trim();
  if (!wsUrl) {
    return null;
  }
  return normalizeCdpWsUrl(wsUrl, cdpUrl);
}

async function canOpenWebSocket(wsUrl, timeoutMs = 800) {
  return await new Promise((resolve) => {
    const headers = getHeadersWithAuth(wsUrl);
    const ws = new WebSocket(wsUrl, { handshakeTimeout: timeoutMs, ...Object.keys(headers).length ? { headers } : {  }:  });
    const timer = setTimeout(() => {
      try {
        {
          ws.terminate();
        }
      }
      catch {
        {
        }
      }
      resolve(false);
    }, Math.max(50, (timeoutMs + 25)));
    ws.once("open", () => {
      clearTimeout(timer);
      try {
        {
          ws.close();
        }
      }
      catch {
        {
        }
      }
      resolve(true);
    });
    ws.once("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}
export async function isChromeCdpReady(cdpUrl, timeoutMs = 500, handshakeTimeoutMs = 800) {
  const wsUrl = await getChromeWebSocketUrl(cdpUrl, timeoutMs);
  if (!wsUrl) {
    return false;
  }
  return await canOpenWebSocket(wsUrl, handshakeTimeoutMs);
}

export async function launchOpenClawChrome(resolved, profile) {
  if (!profile.cdpIsLoopback) {
    throw new Error("Profile \"\" is remote; cannot launch local Chrome.");
  }
  await ensurePortAvailable(profile.cdpPort);
  const exe = resolveBrowserExecutable(resolved);
  if (!exe) {
    throw new Error("No supported browser found (Chrome/Brave/Edge/Chromium on macOS, Linux, or Windows).");
  }
  const userDataDir = resolveOpenClawUserDataDir(profile.name);
  fs.mkdirSync(userDataDir, { recursive: true });
  const needsDecorate = !isProfileDecorated(userDataDir, profile.name, (profile.color ?? DEFAULT_OPENCLAW_BROWSER_COLOR).toUpperCase());
  const spawnOnce = () => {
    const args = ["--remote-debugging-port=", "--user-data-dir=", "--no-first-run", "--no-default-browser-check", "--disable-sync", "--disable-background-networking", "--disable-component-update", "--disable-features=Translate,MediaRouter", "--disable-session-crashed-bubble", "--hide-crash-restore-bubble", "--password-store=basic"];
    if (resolved.headless) {
      args.push("--headless=new");
      args.push("--disable-gpu");
    }
    if (resolved.noSandbox) {
      args.push("--no-sandbox");
      args.push("--disable-setuid-sandbox");
    }
    if ((process.platform === "linux")) {
      args.push("--disable-dev-shm-usage");
    }
    args.push("about:blank");
    return spawn(exe.path, args, { stdio: "pipe", env: { ...process.env: , HOME: os.homedir() } });
  };
  const startedAt = Date.now();
  const localStatePath = path.join(userDataDir, "Local State");
  const preferencesPath = path.join(userDataDir, "Default", "Preferences");
  const needsBootstrap = (!exists(localStatePath) || !exists(preferencesPath));
  if (needsBootstrap) {
    const bootstrap = spawnOnce();
    const deadline = (Date.now() + 10000);
    while ((Date.now() < deadline)) {
      if ((exists(localStatePath) && exists(preferencesPath))) {
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    try {
      {
        bootstrap.kill("SIGTERM");
      }
    }
    catch {
      {
      }
    }
    const exitDeadline = (Date.now() + 5000);
    while ((Date.now() < exitDeadline)) {
      if ((bootstrap.exitCode != null)) {
        break;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  if (needsDecorate) {
    try {
      {
        decorateOpenClawProfile(userDataDir, { name: profile.name, color: profile.color });
        log.info("🦞 openclaw browser profile decorated ()");
      }
    }
    catch (err) {
      {
        log.warn("openclaw browser profile decoration failed: ");
      }
    }
  }
  try {
    {
      ensureProfileCleanExit(userDataDir);
    }
  }
  catch (err) {
    {
      log.warn("openclaw browser clean-exit prefs failed: ");
    }
  }
  const proc = spawnOnce();
  const readyDeadline = (Date.now() + 15000);
  while ((Date.now() < readyDeadline)) {
    if (await isChromeReachable(profile.cdpUrl, 500)) {
      break;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!await isChromeReachable(profile.cdpUrl, 500)) {
    try {
      {
        proc.kill("SIGKILL");
      }
    }
    catch {
      {
      }
    }
    throw new Error("Failed to start Chrome CDP on port  for profile \"\".");
  }
  const pid = (proc.pid ?? -1);
  log.info("🦞 openclaw browser started () profile \"\" on 127.0.0.1: (pid )");
  return { pid, exe, userDataDir, cdpPort: profile.cdpPort, startedAt, proc };
}

export async function stopOpenClawChrome(running, timeoutMs = 2500) {
  const proc = running.proc;
  if (proc.killed) {
    return;
  }
  try {
    {
      proc.kill("SIGTERM");
    }
  }
  catch {
    {
    }
  }
  const start = Date.now();
  while (((Date.now() - start) < timeoutMs)) {
    if ((!proc.exitCode && proc.killed)) {
      break;
    }
    if (!await isChromeReachable(cdpUrlForPort(running.cdpPort), 200)) {
      return;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  try {
    {
      proc.kill("SIGKILL");
    }
  }
  catch {
    {
    }
  }
}

