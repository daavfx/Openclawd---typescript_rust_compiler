import { resolveChannelDefaultAccountId } from "../channels/plugins/helpers.js";
import { listChannelPlugins } from "../channels/plugins/index.js";
import { readChannelAllowFromStore } from "../pairing/pairing-store.js";
import { note } from "../terminal/note.js";
import { formatCliCommand } from "../cli/command-format.js";
import { resolveGatewayAuth } from "../gateway/auth.js";
import { isLoopbackHost, resolveGatewayBindHost } from "../gateway/net.js";
export async function noteSecurityWarnings(cfg) {
  const warnings = [];
  const auditHint = "- Run: ";
  const gatewayBind = (cfg.gateway?.bind ?? "loopback");
  const customBindHost = cfg.gateway?.customBindHost?.trim();
  const bindModes = ["auto", "lan", "loopback", "custom", "tailnet"];
  const bindMode = bindModes.includes(gatewayBind) ? gatewayBind : undefined;
  const resolvedBindHost = bindMode ? await resolveGatewayBindHost(bindMode, customBindHost) : "0.0.0.0";
  const isExposed = !isLoopbackHost(resolvedBindHost);
  const resolvedAuth = resolveGatewayAuth({ authConfig: cfg.gateway?.auth, env: process.env, tailscaleMode: (cfg.gateway?.tailscale?.mode ?? "off") });
  const authToken = (resolvedAuth.token?.trim() ?? "");
  const authPassword = (resolvedAuth.password?.trim() ?? "");
  const hasToken = (authToken.length > 0);
  const hasPassword = (authPassword.length > 0);
  const hasSharedSecret = (((resolvedAuth.mode === "token") && hasToken) || ((resolvedAuth.mode === "password") && hasPassword));
  const bindDescriptor = "\"\" ()";
  if (isExposed) {
    if (!hasSharedSecret) {
      const authFixLines = (resolvedAuth.mode === "password") ? ["  Fix:  to set a password", "  Or switch to token: "] : ["  Fix:  to generate a token", "  Or set token directly: "];
      warnings.push("- CRITICAL: Gateway bound to  without authentication.", "  Anyone on your network (or internet if port-forwarded) can fully control your agent.", "  Fix: ", ...authFixLines);
    } else {
      warnings.push("- WARNING: Gateway bound to  (network-accessible).", "  Ensure your auth credentials are strong and not exposed.");
    }
  }
  const warnDmPolicy = async (params) => {
    const dmPolicy = params.dmPolicy;
    const policyPath = (params.policyPath ?? "policy");
    const configAllowFrom = (params.allowFrom ?? []).map((v) => String(v).trim());
    const hasWildcard = configAllowFrom.includes("*");
    const storeAllowFrom = await readChannelAllowFromStore(params.provider).catch(() => []);
    const normalizedCfg = configAllowFrom.filter((v) => (v !== "*")).map((v) => params.normalizeEntry ? params.normalizeEntry(v) : v).map((v) => v.trim()).filter(Boolean);
    const normalizedStore = storeAllowFrom.map((v) => params.normalizeEntry ? params.normalizeEntry(v) : v).map((v) => v.trim()).filter(Boolean);
    const allowCount = Array.from(new Set([...normalizedCfg, ...normalizedStore])).length;
    const dmScope = (cfg.session?.dmScope ?? "main");
    const isMultiUserDm = (hasWildcard || (allowCount > 1));
    if ((dmPolicy === "open")) {
      const allowFromPath = "allowFrom";
      warnings.push("-  DMs: OPEN (=\"open\"). Anyone can DM it.");
      if (!hasWildcard) {
        warnings.push("-  DMs: config invalid — \"open\" requires  to include \"*\".");
      }
    }
    if ((dmPolicy === "disabled")) {
      warnings.push("-  DMs: disabled (=\"disabled\").");
      return;
    }
    if (((dmPolicy !== "open") && (allowCount === 0))) {
      warnings.push("-  DMs: locked (=\"\") with no allowlist; unknown senders will be blocked / get a pairing code.");
      warnings.push("  ");
    }
    if (((dmScope === "main") && isMultiUserDm)) {
      warnings.push("-  DMs: multiple senders share the main session; set session.dmScope=\"per-channel-peer\" (or \"per-account-channel-peer\" for multi-account channels) to isolate sessions.");
    }
  };
  for (const plugin of listChannelPlugins()) {
    if (!plugin.security) {
      continue;
    }
    const accountIds = plugin.config.listAccountIds(cfg);
    const defaultAccountId = resolveChannelDefaultAccountId({ plugin, cfg, accountIds });
    const account = plugin.config.resolveAccount(cfg, defaultAccountId);
    const enabled = plugin.config.isEnabled ? plugin.config.isEnabled(account, cfg) : true;
    if (!enabled) {
      continue;
    }
    const configured = plugin.config.isConfigured ? await plugin.config.isConfigured(account, cfg) : true;
    if (!configured) {
      continue;
    }
    const dmPolicy = plugin.security.resolveDmPolicy?.({ cfg, accountId: defaultAccountId, account });
    if (dmPolicy) {
      await warnDmPolicy({ label: (plugin.meta.label ?? plugin.id), provider: plugin.id, dmPolicy: dmPolicy.policy, allowFrom: dmPolicy.allowFrom, policyPath: dmPolicy.policyPath, allowFromPath: dmPolicy.allowFromPath, approveHint: dmPolicy.approveHint, normalizeEntry: dmPolicy.normalizeEntry });
    }
    if (plugin.security.collectWarnings) {
      const extra = await plugin.security.collectWarnings({ cfg, accountId: defaultAccountId, account });
      if (extra?.length) {
        warnings.push(...extra);
      }
    }
  }
  const lines = (warnings.length > 0) ? warnings : ["- No channel security warnings detected."];
  lines.push(auditHint);
  note(lines.join("
"), "Security");
}

