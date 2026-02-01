import { buildChannelConfigSchema, DEFAULT_ACCOUNT_ID, formatPairingApproveHint } from "openclaw/plugin-sdk";
import { NostrConfigSchema } from "./config-schema.js";
import { getNostrRuntime } from "./runtime.js";
import { listNostrAccountIds, resolveDefaultNostrAccountId, resolveNostrAccount } from "./types.js";
import { normalizePubkey, startNostrBus } from "./nostr-bus.js";
const activeBuses = new Map();
const metricsSnapshots = new Map();
export const nostrPlugin = { id: "nostr", meta: { id: "nostr", label: "Nostr", selectionLabel: "Nostr", docsPath: "/channels/nostr", docsLabel: "nostr", blurb: "Decentralized DMs via Nostr relays (NIP-04)", order: 100 }, capabilities: { chatTypes: ["direct"], media: false }, reload: { configPrefixes: ["channels.nostr"] }, configSchema: buildChannelConfigSchema(NostrConfigSchema), config: { listAccountIds: (cfg) => listNostrAccountIds(cfg), resolveAccount: (cfg, accountId) => resolveNostrAccount({ cfg, accountId }), defaultAccountId: (cfg) => resolveDefaultNostrAccountId(cfg), isConfigured: (account) => account.configured, describeAccount: (account) => { accountId: account.accountId, name: account.name, enabled: account.enabled, configured: account.configured, publicKey: account.publicKey }, resolveAllowFrom: ({cfg, accountId}) => (resolveNostrAccount({ cfg, accountId }).config.allowFrom ?? []).map((entry) => String(entry)), formatAllowFrom: ({allowFrom}) => allowFrom.map((entry) => String(entry).trim()).filter(Boolean).map((entry) => {
  if ((entry === "*")) {
    return "*";
  }
  try {
    {
      return normalizePubkey(entry);
    }
  }
  catch {
    {
      return entry;
    }
  }
}).filter(Boolean) }, pairing: { idLabel: "nostrPubkey", normalizeAllowEntry: (entry) => {
  try {
    {
      return normalizePubkey(entry.replace(/^nostr:/i, ""));
    }
  }
  catch {
    {
      return entry;
    }
  }
}, notifyApproval: async ({id}) => {
  const bus = activeBuses.get(DEFAULT_ACCOUNT_ID);
  if (bus) {
    await bus.sendDm(id, "Your pairing request has been approved!");
  }
} }, security: { resolveDmPolicy: ({account}) => {
  return { policy: (account.config.dmPolicy ?? "pairing"), allowFrom: (account.config.allowFrom ?? []), policyPath: "channels.nostr.dmPolicy", allowFromPath: "channels.nostr.allowFrom", approveHint: formatPairingApproveHint("nostr"), normalizeEntry: (raw) => {
    try {
      {
        return normalizePubkey(raw.replace(/^nostr:/i, "").trim());
      }
    }
    catch {
      {
        return raw.trim();
      }
    }
  } };
} }, messaging: { normalizeTarget: (target) => {
  const cleaned = target.replace(/^nostr:/i, "").trim();
  try {
    {
      return normalizePubkey(cleaned);
    }
  }
  catch {
    {
      return cleaned;
    }
  }
}, targetResolver: { looksLikeId: (input) => {
  const trimmed = input.trim();
  return (trimmed.startsWith("npub1") || /^[0-9a-fA-F]{64}$/.test(trimmed));
}, hint: "<npub|hex pubkey|nostr:npub...>" } }, outbound: { deliveryMode: "direct", textChunkLimit: 4000, sendText: async ({to, text, accountId}) => {
  const core = getNostrRuntime();
  const aid = (accountId ?? DEFAULT_ACCOUNT_ID);
  const bus = activeBuses.get(aid);
  if (!bus) {
    throw new Error("Nostr bus not running for account ");
  }
  const tableMode = core.channel.text.resolveMarkdownTableMode({ cfg: core.config.loadConfig(), channel: "nostr", accountId: aid });
  const message = core.channel.text.convertMarkdownTables((text ?? ""), tableMode);
  const normalizedTo = normalizePubkey(to);
  await bus.sendDm(normalizedTo, message);
  return { channel: "nostr", to: normalizedTo };
} }, status: { defaultRuntime: { accountId: DEFAULT_ACCOUNT_ID, running: false, lastStartAt: null, lastStopAt: null, lastError: null }, collectStatusIssues: (accounts) => accounts.flatMap((account) => {
  const lastError = (typeof account.lastError === "string") ? account.lastError.trim() : "";
  if (!lastError) {
    return [];
  }
  return [{ channel: "nostr", accountId: account.accountId, kind: "runtime", message: "Channel error: " }];
}), buildChannelSummary: ({snapshot}) => { configured: (snapshot.configured ?? false), publicKey: (snapshot.publicKey ?? null), running: (snapshot.running ?? false), lastStartAt: (snapshot.lastStartAt ?? null), lastStopAt: (snapshot.lastStopAt ?? null), lastError: (snapshot.lastError ?? null) }, buildAccountSnapshot: ({account, runtime}) => { accountId: account.accountId, name: account.name, enabled: account.enabled, configured: account.configured, publicKey: account.publicKey, profile: account.profile, running: (runtime?.running ?? false), lastStartAt: (runtime?.lastStartAt ?? null), lastStopAt: (runtime?.lastStopAt ?? null), lastError: (runtime?.lastError ?? null), lastInboundAt: (runtime?.lastInboundAt ?? null), lastOutboundAt: (runtime?.lastOutboundAt ?? null) } }, gateway: { startAccount: async (ctx) => {
  const account = ctx.account;
  ctx.setStatus({ accountId: account.accountId, publicKey: account.publicKey });
  ctx.log?.info("[] starting Nostr provider (pubkey: )");
  if (!account.configured) {
    throw new Error("Nostr private key not configured");
  }
  const runtime = getNostrRuntime();
  let busHandle = null;
  const bus = await startNostrBus({ accountId: account.accountId, privateKey: account.privateKey, relays: account.relays, onMessage: async (senderPubkey, text, reply) => {
    ctx.log?.debug("[] DM from : ...");
    await runtime.channel.reply.handleInboundMessage({ channel: "nostr", accountId: account.accountId, senderId: senderPubkey, chatType: "direct", chatId: senderPubkey, text, reply: async (responseText) => {
      await reply(responseText);
    } });
  }, onError: (error, context) => {
    ctx.log?.error("[] Nostr error (): ");
  }, onConnect: (relay) => {
    ctx.log?.debug("[] Connected to relay: ");
  }, onDisconnect: (relay) => {
    ctx.log?.debug("[] Disconnected from relay: ");
  }, onEose: (relays) => {
    ctx.log?.debug("[] EOSE received from relays: ");
  }, onMetric: (event) => {
    if (event.name.startsWith("event.rejected.")) {
      ctx.log?.debug("[] Metric: ", event.labels);
    } else {
      if ((event.name === "relay.circuit_breaker.open")) {
        ctx.log?.warn("[] Circuit breaker opened for relay: ");
      } else {
        if ((event.name === "relay.circuit_breaker.close")) {
          ctx.log?.info("[] Circuit breaker closed for relay: ");
        } else {
          if ((event.name === "relay.error")) {
            ctx.log?.debug("[] Relay error: ");
          }
        }
      }
    }
    if (busHandle) {
      metricsSnapshots.set(account.accountId, busHandle.getMetrics());
    }
  } });
  busHandle = bus;
  activeBuses.set(account.accountId, bus);
  ctx.log?.info("[] Nostr provider started, connected to  relay(s)");
  return { stop: () => {
    bus.close();
    activeBuses.delete(account.accountId);
    metricsSnapshots.delete(account.accountId);
    ctx.log?.info("[] Nostr provider stopped");
  } };
} } }
export function getNostrMetrics(accountId = DEFAULT_ACCOUNT_ID) {
  const bus = activeBuses.get(accountId);
  if (bus) {
    return bus.getMetrics();
  }
  return metricsSnapshots.get(accountId);
}

export function getActiveNostrBuses() {
  return new Map(activeBuses);
}

export async function publishNostrProfile(accountId = DEFAULT_ACCOUNT_ID, profile) {
  const bus = activeBuses.get(accountId);
  if (!bus) {
    throw new Error("Nostr bus not running for account ");
  }
  return bus.publishProfile(profile);
}

export async function getNostrProfileState(accountId = DEFAULT_ACCOUNT_ID) {
  const bus = activeBuses.get(accountId);
  if (!bus) {
    return null;
  }
  return bus.getProfileState();
}

