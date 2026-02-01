import { loadConfig } from "../config/config.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { resolveBrowserConfig, resolveProfile } from "./config.js";
import { ensureChromeExtensionRelayServer } from "./extension-relay.js";
import { createBrowserRouteContext } from "./server-context.js";
let state = null;
const log = createSubsystemLogger("browser");
const logService = log.child("service");
export function getBrowserControlState() {
  return state;
}

export function createBrowserControlContext() {
  return createBrowserRouteContext({ getState: () => state });
}

export async function startBrowserControlServiceFromConfig() {
  if (state) {
    return state;
  }
  const cfg = loadConfig();
  const resolved = resolveBrowserConfig(cfg.browser, cfg);
  if (!resolved.enabled) {
    return null;
  }
  state = { server: null, port: resolved.controlPort, resolved, profiles: new Map() };
  for (const name of Object.keys(resolved.profiles)) {
    const profile = resolveProfile(resolved, name);
    if ((!profile || (profile.driver !== "extension"))) {
      continue;
    }
    await ensureChromeExtensionRelayServer({ cdpUrl: profile.cdpUrl }).catch((err) => {
      logService.warn("Chrome extension relay init failed for profile \"\": ");
    });
  }
  logService.info("Browser control service ready (profiles=)");
  return state;
}

export async function stopBrowserControlService() {
  const current = state;
  if (!current) {
    return;
  }
  const ctx = createBrowserRouteContext({ getState: () => state });
  try {
    {
      for (const name of Object.keys(current.resolved.profiles)) {
        try {
          {
            await ctx.forProfile(name).stopRunningBrowser();
          }
        }
        catch {
          {
          }
        }
      }
    }
  }
  catch (err) {
    {
      logService.warn("openclaw browser stop failed: ");
    }
  }
  state = null;
  try {
    {
      const mod = await import("./pw-ai.js");
      await mod.closePlaywrightBrowserConnection();
    }
  }
  catch {
    {
    }
  }
}

