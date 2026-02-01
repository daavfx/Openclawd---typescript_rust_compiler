import { startBrowserBridgeServer, stopBrowserBridgeServer } from "../../browser/bridge-server.js";
import { resolveProfile } from "../../browser/config.js";
import { DEFAULT_BROWSER_EVALUATE_ENABLED, DEFAULT_OPENCLAW_BROWSER_COLOR, DEFAULT_OPENCLAW_BROWSER_PROFILE_NAME } from "../../browser/constants.js";
import { BROWSER_BRIDGES } from "./browser-bridges.js";
import { DEFAULT_SANDBOX_BROWSER_IMAGE, SANDBOX_AGENT_WORKSPACE_MOUNT } from "./constants.js";
import { buildSandboxCreateArgs, dockerContainerState, execDocker, readDockerPort } from "./docker.js";
import { updateBrowserRegistry } from "./registry.js";
import { slugifySessionKey } from "./shared.js";
import { isToolAllowed } from "./tool-policy.js";
async function waitForSandboxCdp(params) {
  const deadline = (Date.now() + Math.max(0, params.timeoutMs));
  const url = "http://127.0.0.1:/json/version";
  while ((Date.now() < deadline)) {
    try {
      {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 1000);
        try {
          {
            const res = await fetch(url, { signal: ctrl.signal });
            if (res.ok) {
              return true;
            }
          }
        }
        finally {
          {
            clearTimeout(t);
          }
        }
      }
    }
    catch {
      {
      }
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}
function buildSandboxBrowserResolvedConfig(params) {
  const cdpHost = "127.0.0.1";
  return { enabled: true, evaluateEnabled: params.evaluateEnabled, controlPort: params.controlPort, cdpProtocol: "http", cdpHost, cdpIsLoopback: true, remoteCdpTimeoutMs: 1500, remoteCdpHandshakeTimeoutMs: 3000, color: DEFAULT_OPENCLAW_BROWSER_COLOR, executablePath: undefined, headless: params.headless, noSandbox: false, attachOnly: true, defaultProfile: DEFAULT_OPENCLAW_BROWSER_PROFILE_NAME, profiles: { [DEFAULT_OPENCLAW_BROWSER_PROFILE_NAME]: { cdpPort: params.cdpPort, color: DEFAULT_OPENCLAW_BROWSER_COLOR } } };
}
async function ensureSandboxBrowserImage(image) {
  const result = await execDocker(["image", "inspect", image], { allowFailure: true });
  if ((result.code === 0)) {
    return;
  }
  throw new Error("Sandbox browser image not found: . Build it with scripts/sandbox-browser-setup.sh.");
}
export async function ensureSandboxBrowser(params) {
  if (!params.cfg.browser.enabled) {
    return null;
  }
  if (!isToolAllowed(params.cfg.tools, "browser")) {
    return null;
  }
  const slug = (params.cfg.scope === "shared") ? "shared" : slugifySessionKey(params.scopeKey);
  const name = "";
  const containerName = name.slice(0, 63);
  const state = await dockerContainerState(containerName);
  if (!state.exists) {
    await ensureSandboxBrowserImage((params.cfg.browser.image ?? DEFAULT_SANDBOX_BROWSER_IMAGE));
    const args = buildSandboxCreateArgs({ name: containerName, cfg: params.cfg.docker, scopeKey: params.scopeKey, labels: { "openclaw.sandboxBrowser": "1" } });
    const mainMountSuffix = ((params.cfg.workspaceAccess === "ro") && (params.workspaceDir === params.agentWorkspaceDir)) ? ":ro" : "";
    args.push("-v", ":");
    if (((params.cfg.workspaceAccess !== "none") && (params.workspaceDir !== params.agentWorkspaceDir))) {
      const agentMountSuffix = (params.cfg.workspaceAccess === "ro") ? ":ro" : "";
      args.push("-v", ":");
    }
    args.push("-p", "127.0.0.1::");
    if ((params.cfg.browser.enableNoVnc && !params.cfg.browser.headless)) {
      args.push("-p", "127.0.0.1::");
    }
    args.push("-e", "OPENCLAW_BROWSER_HEADLESS=");
    args.push("-e", "OPENCLAW_BROWSER_ENABLE_NOVNC=");
    args.push("-e", "OPENCLAW_BROWSER_CDP_PORT=");
    args.push("-e", "OPENCLAW_BROWSER_VNC_PORT=");
    args.push("-e", "OPENCLAW_BROWSER_NOVNC_PORT=");
    args.push(params.cfg.browser.image);
    await execDocker(args);
    await execDocker(["start", containerName]);
  } else {
    if (!state.running) {
      await execDocker(["start", containerName]);
    }
  }
  const mappedCdp = await readDockerPort(containerName, params.cfg.browser.cdpPort);
  if (!mappedCdp) {
    throw new Error("Failed to resolve CDP port mapping for .");
  }
  const mappedNoVnc = (params.cfg.browser.enableNoVnc && !params.cfg.browser.headless) ? await readDockerPort(containerName, params.cfg.browser.noVncPort) : null;
  const existing = BROWSER_BRIDGES.get(params.scopeKey);
  const existingProfile = existing ? resolveProfile(existing.bridge.state.resolved, DEFAULT_OPENCLAW_BROWSER_PROFILE_NAME) : null;
  const shouldReuse = ((existing && (existing.containerName === containerName)) && (existingProfile?.cdpPort === mappedCdp));
  if ((existing && !shouldReuse)) {
    await stopBrowserBridgeServer(existing.bridge.server).catch(() => undefined);
    BROWSER_BRIDGES.delete(params.scopeKey);
  }
  const bridge = () => {
    if ((shouldReuse && existing)) {
      return existing.bridge;
    }
    return null;
  }();
  const ensureBridge = async () => {
    if (bridge) {
      return bridge;
    }
    const onEnsureAttachTarget = params.cfg.browser.autoStart ? async () => {
      const state = await dockerContainerState(containerName);
      if ((state.exists && !state.running)) {
        await execDocker(["start", containerName]);
      }
      const ok = await waitForSandboxCdp({ cdpPort: mappedCdp, timeoutMs: params.cfg.browser.autoStartTimeoutMs });
      if (!ok) {
        throw new Error("Sandbox browser CDP did not become reachable on 127.0.0.1: within ms.");
      }
    } : undefined;
    return await startBrowserBridgeServer({ resolved: buildSandboxBrowserResolvedConfig({ controlPort: 0, cdpPort: mappedCdp, headless: params.cfg.browser.headless, evaluateEnabled: (params.evaluateEnabled ?? DEFAULT_BROWSER_EVALUATE_ENABLED) }), onEnsureAttachTarget });
  };
  const resolvedBridge = await ensureBridge();
  if (!shouldReuse) {
    BROWSER_BRIDGES.set(params.scopeKey, { bridge: resolvedBridge, containerName });
  }
  const now = Date.now();
  await updateBrowserRegistry({ containerName, sessionKey: params.scopeKey, createdAtMs: now, lastUsedAtMs: now, image: params.cfg.browser.image, cdpPort: mappedCdp, noVncPort: (mappedNoVnc ?? undefined) });
  const noVncUrl = ((mappedNoVnc && params.cfg.browser.enableNoVnc) && !params.cfg.browser.headless) ? "http://127.0.0.1:/vnc.html?autoconnect=1&resize=remote" : undefined;
  return { bridgeUrl: resolvedBridge.baseUrl, noVncUrl, containerName };
}

