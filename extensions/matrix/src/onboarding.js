import { addWildcardAllowFrom, formatDocsLink, promptChannelAccessConfig } from "openclaw/plugin-sdk";
import { listMatrixDirectoryGroupsLive } from "./directory-live.js";
import { listMatrixDirectoryPeersLive } from "./directory-live.js";
import { resolveMatrixAccount } from "./matrix/accounts.js";
import { ensureMatrixSdkInstalled, isMatrixSdkAvailable } from "./matrix/deps.js";
const channel = "matrix";
function setMatrixDmPolicy(cfg, policy) {
  const allowFrom = (policy === "open") ? addWildcardAllowFrom(cfg.channels?.matrix?.dm?.allowFrom) : undefined;
  return { ...cfg: , channels: { ...cfg.channels: , matrix: { ...cfg.channels?.matrix: , dm: { ...cfg.channels?.matrix?.dm: , policy, ...allowFrom ? { allowFrom } : {  }:  } } } };
}
async function noteMatrixAuthHelp(prompter) {
  await prompter.note(["Matrix requires a homeserver URL.", "Use an access token (recommended) or a password (logs in and stores a token).", "With access token: user ID is fetched automatically.", "Env vars supported: MATRIX_HOMESERVER, MATRIX_USER_ID, MATRIX_ACCESS_TOKEN, MATRIX_PASSWORD.", "Docs: "].join("
"), "Matrix setup");
}
async function promptMatrixAllowFrom(params) {
  const {cfg, prompter} = params;
  const existingAllowFrom = (cfg.channels?.matrix?.dm?.allowFrom ?? []);
  const account = resolveMatrixAccount({ cfg });
  const canResolve = Boolean(account.configured);
  const parseInput = (raw) => raw.split(/[\n,;]+/g).map((entry) => entry.trim()).filter(Boolean);
  const isFullUserId = (value) => (value.startsWith("@") && value.includes(":"));
  while (true) {
    const entry = await prompter.text({ message: "Matrix allowFrom (username or user id)", placeholder: "@user:server", initialValue: existingAllowFrom[0] ? String(existingAllowFrom[0]) : undefined, validate: (value) => String((value ?? "")).trim() ? undefined : "Required" });
    const parts = parseInput(String(entry));
    const resolvedIds = [];
    let unresolved = [];
    for (const part of parts) {
      if (isFullUserId(part)) {
        resolvedIds.push(part);
        continue;
      }
      if (!canResolve) {
        unresolved.push(part);
        continue;
      }
      const results = await listMatrixDirectoryPeersLive({ cfg, query: part, limit: 5 }).catch(() => []);
      const match = results.find((result) => result.id);
      if (match?.id) {
        resolvedIds.push(match.id);
        if ((results.length > 1)) {
          await prompter.note("Multiple matches for \"\", using .", "Matrix allowlist");
        }
      } else {
        unresolved.push(part);
      }
    }
    if ((unresolved.length > 0)) {
      await prompter.note("Could not resolve: . Use full @user:server IDs.", "Matrix allowlist");
      continue;
    }
    const unique = [...new Set([...existingAllowFrom.map((item) => String(item).trim()).filter(Boolean), ...resolvedIds])];
    return { ...cfg: , channels: { ...cfg.channels: , matrix: { ...cfg.channels?.matrix: , enabled: true, dm: { ...cfg.channels?.matrix?.dm: , policy: "allowlist", allowFrom: unique } } } };
  }
}
function setMatrixGroupPolicy(cfg, groupPolicy) {
  return { ...cfg: , channels: { ...cfg.channels: , matrix: { ...cfg.channels?.matrix: , enabled: true, groupPolicy } } };
}
function setMatrixGroupRooms(cfg, roomKeys) {
  const groups = Object.fromEntries(roomKeys.map((key) => [key, { allow: true }]));
  return { ...cfg: , channels: { ...cfg.channels: , matrix: { ...cfg.channels?.matrix: , enabled: true, groups } } };
}
const dmPolicy = { label: "Matrix", channel, policyKey: "channels.matrix.dm.policy", allowFromKey: "channels.matrix.dm.allowFrom", getCurrent: (cfg) => (cfg.channels?.matrix?.dm?.policy ?? "pairing"), setPolicy: (cfg, policy) => setMatrixDmPolicy(cfg, policy), promptAllowFrom: promptMatrixAllowFrom };
export const matrixOnboardingAdapter = { channel, getStatus: async ({cfg}) => {
  const account = resolveMatrixAccount({ cfg: cfg });
  const configured = account.configured;
  const sdkReady = isMatrixSdkAvailable();
  return { channel, configured, statusLines: ["Matrix: "], selectionHint: !sdkReady ? "install @vector-im/matrix-bot-sdk" : configured ? "configured" : "needs auth" };
}, configure: async ({cfg, runtime, prompter, forceAllowFrom}) => {
  let next = cfg;
  await ensureMatrixSdkInstalled({ runtime, confirm: async (message) => await prompter.confirm({ message, initialValue: true }) });
  const existing = (next.channels?.matrix ?? {  });
  const account = resolveMatrixAccount({ cfg: next });
  if (!account.configured) {
    await noteMatrixAuthHelp(prompter);
  }
  const envHomeserver = process.env.MATRIX_HOMESERVER?.trim();
  const envUserId = process.env.MATRIX_USER_ID?.trim();
  const envAccessToken = process.env.MATRIX_ACCESS_TOKEN?.trim();
  const envPassword = process.env.MATRIX_PASSWORD?.trim();
  const envReady = Boolean((envHomeserver && (envAccessToken || (envUserId && envPassword))));
  if (((((envReady && !existing.homeserver) && !existing.userId) && !existing.accessToken) && !existing.password)) {
    const useEnv = await prompter.confirm({ message: "Matrix env vars detected. Use env values?", initialValue: true });
    if (useEnv) {
      next = { ...next: , channels: { ...next.channels: , matrix: { ...next.channels?.matrix: , enabled: true } } };
      if (forceAllowFrom) {
        next = await promptMatrixAllowFrom({ cfg: next, prompter });
      }
      return { cfg: next };
    }
  }
  const homeserver = String(await prompter.text({ message: "Matrix homeserver URL", initialValue: (existing.homeserver ?? envHomeserver), validate: (value) => {
    const raw = String((value ?? "")).trim();
    if (!raw) {
      return "Required";
    }
    if (!/^https?:\/\//i.test(raw)) {
      return "Use a full URL (https://...)";
    }
    return undefined;
  } })).trim();
  let accessToken = (existing.accessToken ?? "");
  let password = (existing.password ?? "");
  let userId = (existing.userId ?? "");
  if ((accessToken || password)) {
    const keep = await prompter.confirm({ message: "Matrix credentials already configured. Keep them?", initialValue: true });
    if (!keep) {
      accessToken = "";
      password = "";
      userId = "";
    }
  }
  if ((!accessToken && !password)) {
    const authMode = await prompter.select({ message: "Matrix auth method", options: [{ value: "token", label: "Access token (user ID fetched automatically)" }, { value: "password", label: "Password (requires user ID)" }] });
    if ((authMode === "token")) {
      accessToken = String(await prompter.text({ message: "Matrix access token", validate: (value) => value?.trim() ? undefined : "Required" })).trim();
      userId = "";
    } else {
      userId = String(await prompter.text({ message: "Matrix user ID", initialValue: (existing.userId ?? envUserId), validate: (value) => {
        const raw = String((value ?? "")).trim();
        if (!raw) {
          return "Required";
        }
        if (!raw.startsWith("@")) {
          return "Matrix user IDs should start with @";
        }
        if (!raw.includes(":")) {
          return "Matrix user IDs should include a server (:server)";
        }
        return undefined;
      } })).trim();
      password = String(await prompter.text({ message: "Matrix password", validate: (value) => value?.trim() ? undefined : "Required" })).trim();
    }
  }
  const deviceName = String(await prompter.text({ message: "Matrix device name (optional)", initialValue: (existing.deviceName ?? "OpenClaw Gateway") })).trim();
  const enableEncryption = await prompter.confirm({ message: "Enable end-to-end encryption (E2EE)?", initialValue: (existing.encryption ?? false) });
  next = { ...next: , channels: { ...next.channels: , matrix: { ...next.channels?.matrix: , enabled: true, homeserver, userId: (userId || undefined), accessToken: (accessToken || undefined), password: (password || undefined), deviceName: (deviceName || undefined), encryption: (enableEncryption || undefined) } } };
  if (forceAllowFrom) {
    next = await promptMatrixAllowFrom({ cfg: next, prompter });
  }
  const existingGroups = (next.channels?.matrix?.groups ?? next.channels?.matrix?.rooms);
  const accessConfig = await promptChannelAccessConfig({ prompter, label: "Matrix rooms", currentPolicy: (next.channels?.matrix?.groupPolicy ?? "allowlist"), currentEntries: Object.keys((existingGroups ?? {  })), placeholder: "!roomId:server, #alias:server, Project Room", updatePrompt: Boolean(existingGroups) });
  if (accessConfig) {
    if ((accessConfig.policy !== "allowlist")) {
      next = setMatrixGroupPolicy(next, accessConfig.policy);
    } else {
      let roomKeys = accessConfig.entries;
      if ((accessConfig.entries.length > 0)) {
        try {
          {
            const resolvedIds = [];
            const unresolved = [];
            for (const entry of accessConfig.entries) {
              const trimmed = entry.trim();
              if (!trimmed) {
                continue;
              }
              const cleaned = trimmed.replace(/^(room|channel):/i, "").trim();
              if ((cleaned.startsWith("!") && cleaned.includes(":"))) {
                resolvedIds.push(cleaned);
                continue;
              }
              const matches = await listMatrixDirectoryGroupsLive({ cfg: next, query: trimmed, limit: 10 });
              const exact = matches.find((match) => ((match.name ?? "").toLowerCase() === trimmed.toLowerCase()));
              const best = (exact ?? matches[0]);
              if (best?.id) {
                resolvedIds.push(best.id);
              } else {
                unresolved.push(entry);
              }
            }
            roomKeys = [...resolvedIds, ...unresolved.map((entry) => entry.trim()).filter(Boolean)];
            if (((resolvedIds.length > 0) || (unresolved.length > 0))) {
              await prompter.note([(resolvedIds.length > 0) ? "Resolved: " : undefined, (unresolved.length > 0) ? "Unresolved (kept as typed): " : undefined].filter(Boolean).join("
"), "Matrix rooms");
            }
          }
        }
        catch (err) {
          {
            await prompter.note("Room lookup failed; keeping entries as typed. ", "Matrix rooms");
          }
        }
      }
      next = setMatrixGroupPolicy(next, "allowlist");
      next = setMatrixGroupRooms(next, roomKeys);
    }
  }
  return { cfg: next };
}, dmPolicy, disable: (cfg) => { ...cfg: , channels: { ...cfg.channels: , matrix: { ...cfg.channels?.matrix: , enabled: false } } } }
