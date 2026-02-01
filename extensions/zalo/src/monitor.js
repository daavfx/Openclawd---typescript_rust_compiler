import { ZaloApiError, deleteWebhook, getUpdates, sendMessage, sendPhoto, setWebhook } from "./api.js";
import { resolveZaloProxyFetch } from "./proxy.js";
import { getZaloRuntime } from "./runtime.js";
export 
export 
export 
const ZALO_TEXT_LIMIT = 2000;
const DEFAULT_MEDIA_MAX_MB = 5;
function logVerbose(core, runtime, message) {
  if (core.logging.shouldLogVerbose()) {
    runtime.log?.("[zalo] ");
  }
}
function isSenderAllowed(senderId, allowFrom) {
  if (allowFrom.includes("*")) {
    return true;
  }
  const normalizedSenderId = senderId.toLowerCase();
  return allowFrom.some((entry) => {
    const normalized = entry.toLowerCase().replace(/^(zalo|zl):/i, "");
    return (normalized === normalizedSenderId);
  });
}
async function readJsonBody(req, maxBytes) {
  const chunks = [];
  let total = 0;
  return await new Promise((resolve) => {
    req.on("data", (chunk) => {
      total += chunk.length;
      if ((total > maxBytes)) {
        resolve({ ok: false, error: "payload too large" });
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        {
          const raw = Buffer.concat(chunks).toString("utf8");
          if (!raw.trim()) {
            resolve({ ok: false, error: "empty payload" });
            return;
          }
          resolve({ ok: true, value: JSON.parse(raw) });
        }
      }
      catch (err) {
        {
          resolve({ ok: false, error: (err instanceof Error) ? err.message : String(err) });
        }
      }
    });
    req.on("error", (err) => {
      resolve({ ok: false, error: (err instanceof Error) ? err.message : String(err) });
    });
  });
}
const webhookTargets = new Map();
function normalizeWebhookPath(raw) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "/";
  }
  const withSlash = trimmed.startsWith("/") ? trimmed : "/";
  if (((withSlash.length > 1) && withSlash.endsWith("/"))) {
    return withSlash.slice(0, -1);
  }
  return withSlash;
}
function resolveWebhookPath(webhookPath, webhookUrl) {
  const trimmedPath = webhookPath?.trim();
  if (trimmedPath) {
    return normalizeWebhookPath(trimmedPath);
  }
  if (webhookUrl?.trim()) {
    try {
      {
        const parsed = new URL(webhookUrl);
        return normalizeWebhookPath((parsed.pathname || "/"));
      }
    }
    catch {
      {
        return null;
      }
    }
  }
  return null;
}
export function registerZaloWebhookTarget(target) {
  const key = normalizeWebhookPath(target.path);
  const normalizedTarget = { ...target: , path: key };
  const existing = (webhookTargets.get(key) ?? []);
  const next = [...existing, normalizedTarget];
  webhookTargets.set(key, next);
  return () => {
    const updated = (webhookTargets.get(key) ?? []).filter((entry) => (entry !== normalizedTarget));
    if ((updated.length > 0)) {
      webhookTargets.set(key, updated);
    } else {
      webhookTargets.delete(key);
    }
  };
}

export async function handleZaloWebhookRequest(req, res) {
  const url = new URL((req.url ?? "/"), "http://localhost");
  const path = normalizeWebhookPath(url.pathname);
  const targets = webhookTargets.get(path);
  if ((!targets || (targets.length === 0))) {
    return false;
  }
  if ((req.method !== "POST")) {
    res.statusCode = 405;
    res.setHeader("Allow", "POST");
    res.end("Method Not Allowed");
    return true;
  }
  const headerToken = String((req.headers["x-bot-api-secret-token"] ?? ""));
  const target = targets.find((entry) => (entry.secret === headerToken));
  if (!target) {
    res.statusCode = 401;
    res.end("unauthorized");
    return true;
  }
  const body = await readJsonBody(req, (1024 * 1024));
  if (!body.ok) {
    res.statusCode = (body.error === "payload too large") ? 413 : 400;
    res.end((body.error ?? "invalid payload"));
    return true;
  }
  const raw = body.value;
  const record = (raw && (typeof raw === "object")) ? raw : null;
  const update = ((record && (record.ok === true)) && record.result) ? record.result : (record ?? undefined);
  if (!update?.event_name) {
    res.statusCode = 400;
    res.end("invalid payload");
    return true;
  }
  target.statusSink?.({ lastInboundAt: Date.now() });
  processUpdate(update, target.token, target.account, target.config, target.runtime, target.core, target.mediaMaxMb, target.statusSink, target.fetcher).catch((err) => {
    target.runtime.error?.("[] Zalo webhook failed: ");
  });
  res.statusCode = 200;
  res.end("ok");
  return true;
}

function startPollingLoop(params) {
  const {token, account, config, runtime, core, abortSignal, isStopped, mediaMaxMb, statusSink, fetcher} = params;
  const pollTimeout = 30;
  const poll = async () => {
    if ((isStopped() || abortSignal.aborted)) {
      return;
    }
    try {
      {
        const response = await getUpdates(token, { timeout: pollTimeout }, fetcher);
        if ((response.ok && response.result)) {
          statusSink?.({ lastInboundAt: Date.now() });
          await processUpdate(response.result, token, account, config, runtime, core, mediaMaxMb, statusSink, fetcher);
        }
      }
    }
    catch (err) {
      {
        if (((err instanceof ZaloApiError) && err.isPollingTimeout)) {
        } else {
          if ((!isStopped() && !abortSignal.aborted)) {
            console.error("[] Zalo polling error:", err);
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        }
      }
    }
    if ((!isStopped() && !abortSignal.aborted)) {
      setImmediate(poll);
    }
  };
  void poll();
}
async function processUpdate(update, token, account, config, runtime, core, mediaMaxMb, statusSink, fetcher) {
  const {event_name, message} = update;
  if (!message) {
    return;
  }
  switch (event_name) {
    case "message.text.received":
      await handleTextMessage(message, token, account, config, runtime, core, statusSink, fetcher);
      break;
    case "message.image.received":
      await handleImageMessage(message, token, account, config, runtime, core, mediaMaxMb, statusSink, fetcher);
      break;
    case "message.sticker.received":
      console.log("[] Received sticker from ");
      break;
    case "message.unsupported.received":
      console.log("[] Received unsupported message type from ");
      break;
  }
}
async function handleTextMessage(message, token, account, config, runtime, core, statusSink, fetcher) {
  const {text} = message;
  if (!text?.trim()) {
    return;
  }
  await processMessageWithPipeline({ message, token, account, config, runtime, core, text, mediaPath: undefined, mediaType: undefined, statusSink, fetcher });
}
async function handleImageMessage(message, token, account, config, runtime, core, mediaMaxMb, statusSink, fetcher) {
  const {photo, caption} = message;
  let mediaPath;
  let mediaType;
  if (photo) {
    try {
      {
        const maxBytes = ((mediaMaxMb * 1024) * 1024);
        const fetched = await core.channel.media.fetchRemoteMedia({ url: photo });
        const saved = await core.channel.media.saveMediaBuffer(fetched.buffer, fetched.contentType, "inbound", maxBytes);
        mediaPath = saved.path;
        mediaType = saved.contentType;
      }
    }
    catch (err) {
      {
        console.error("[] Failed to download Zalo image:", err);
      }
    }
  }
  await processMessageWithPipeline({ message, token, account, config, runtime, core, text: caption, mediaPath, mediaType, statusSink, fetcher });
}
async function processMessageWithPipeline(params) {
  const {message, token, account, config, runtime, core, text, mediaPath, mediaType, statusSink, fetcher} = params;
  const {from, chat, message_id, date} = message;
  const isGroup = (chat.chat_type === "GROUP");
  const chatId = chat.id;
  const senderId = from.id;
  const senderName = from.name;
  const dmPolicy = (account.config.dmPolicy ?? "pairing");
  const configAllowFrom = (account.config.allowFrom ?? []).map((v) => String(v));
  const rawBody = (text?.trim() || mediaPath ? "<media:image>" : "");
  const shouldComputeAuth = core.channel.commands.shouldComputeCommandAuthorized(rawBody, config);
  const storeAllowFrom = (!isGroup && ((dmPolicy !== "open") || shouldComputeAuth)) ? await core.channel.pairing.readAllowFromStore("zalo").catch(() => []) : [];
  const effectiveAllowFrom = [...configAllowFrom, ...storeAllowFrom];
  const useAccessGroups = (config.commands?.useAccessGroups !== false);
  const senderAllowedForCommands = isSenderAllowed(senderId, effectiveAllowFrom);
  const commandAuthorized = shouldComputeAuth ? core.channel.commands.resolveCommandAuthorizedFromAuthorizers({ useAccessGroups, authorizers: [{ configured: (effectiveAllowFrom.length > 0), allowed: senderAllowedForCommands }] }) : undefined;
  if (!isGroup) {
    if ((dmPolicy === "disabled")) {
      logVerbose(core, runtime, "Blocked zalo DM from  (dmPolicy=disabled)");
      return;
    }
    if ((dmPolicy !== "open")) {
      const allowed = senderAllowedForCommands;
      if (!allowed) {
        if ((dmPolicy === "pairing")) {
          const {code, created} = await core.channel.pairing.upsertPairingRequest({ channel: "zalo", id: senderId, meta: { name: (senderName ?? undefined) } });
          if (created) {
            logVerbose(core, runtime, "zalo pairing request sender=");
            try {
              {
                await sendMessage(token, { chat_id: chatId, text: core.channel.pairing.buildPairingReply({ channel: "zalo", idLine: "Your Zalo user id: ", code }) }, fetcher);
                statusSink?.({ lastOutboundAt: Date.now() });
              }
            }
            catch (err) {
              {
                logVerbose(core, runtime, "zalo pairing reply failed for : ");
              }
            }
          }
        } else {
          logVerbose(core, runtime, "Blocked unauthorized zalo sender  (dmPolicy=)");
        }
        return;
      }
    }
  }
  const route = core.channel.routing.resolveAgentRoute({ cfg: config, channel: "zalo", accountId: account.accountId, peer: { kind: isGroup ? "group" : "dm", id: chatId } });
  if (((isGroup && core.channel.commands.isControlCommandMessage(rawBody, config)) && (commandAuthorized !== true))) {
    logVerbose(core, runtime, "zalo: drop control command from unauthorized sender ");
    return;
  }
  const fromLabel = isGroup ? "group:" : (senderName || "user:");
  const storePath = core.channel.session.resolveStorePath(config.session?.store, { agentId: route.agentId });
  const envelopeOptions = core.channel.reply.resolveEnvelopeFormatOptions(config);
  const previousTimestamp = core.channel.session.readSessionUpdatedAt({ storePath, sessionKey: route.sessionKey });
  const body = core.channel.reply.formatAgentEnvelope({ channel: "Zalo", from: fromLabel, timestamp: date ? (date * 1000) : undefined, previousTimestamp, envelope: envelopeOptions, body: rawBody });
  const ctxPayload = core.channel.reply.finalizeInboundContext({ Body: body, RawBody: rawBody, CommandBody: rawBody, From: isGroup ? "zalo:group:" : "zalo:", To: "zalo:", SessionKey: route.sessionKey, AccountId: route.accountId, ChatType: isGroup ? "group" : "direct", ConversationLabel: fromLabel, SenderName: (senderName || undefined), SenderId: senderId, CommandAuthorized: commandAuthorized, Provider: "zalo", Surface: "zalo", MessageSid: message_id, MediaPath: mediaPath, MediaType: mediaType, MediaUrl: mediaPath, OriginatingChannel: "zalo", OriginatingTo: "zalo:" });
  await core.channel.session.recordInboundSession({ storePath, sessionKey: (ctxPayload.SessionKey ?? route.sessionKey), ctx: ctxPayload, onRecordError: (err) => {
    runtime.error?.("zalo: failed updating session meta: ");
  } });
  const tableMode = core.channel.text.resolveMarkdownTableMode({ cfg: config, channel: "zalo", accountId: account.accountId });
  await core.channel.reply.dispatchReplyWithBufferedBlockDispatcher({ ctx: ctxPayload, cfg: config, dispatcherOptions: { deliver: async (payload) => {
    await deliverZaloReply({ payload, token, chatId, runtime, core, config, accountId: account.accountId, statusSink, fetcher, tableMode });
  }, onError: (err, info) => {
    runtime.error?.("[] Zalo  reply failed: ");
  } } });
}
async function deliverZaloReply(params) {
  const {payload, token, chatId, runtime, core, config, accountId, statusSink, fetcher} = params;
  const tableMode = (params.tableMode ?? "code");
  const text = core.channel.text.convertMarkdownTables((payload.text ?? ""), tableMode);
  const mediaList = payload.mediaUrls?.length ? payload.mediaUrls : payload.mediaUrl ? [payload.mediaUrl] : [];
  if ((mediaList.length > 0)) {
    let first = true;
    for (const mediaUrl of mediaList) {
      const caption = first ? text : undefined;
      first = false;
      try {
        {
          await sendPhoto(token, { chat_id: chatId, photo: mediaUrl, caption }, fetcher);
          statusSink?.({ lastOutboundAt: Date.now() });
        }
      }
      catch (err) {
        {
          runtime.error?.("Zalo photo send failed: ");
        }
      }
    }
    return;
  }
  if (text) {
    const chunkMode = core.channel.text.resolveChunkMode(config, "zalo", accountId);
    const chunks = core.channel.text.chunkMarkdownTextWithMode(text, ZALO_TEXT_LIMIT, chunkMode);
    for (const chunk of chunks) {
      try {
        {
          await sendMessage(token, { chat_id: chatId, text: chunk }, fetcher);
          statusSink?.({ lastOutboundAt: Date.now() });
        }
      }
      catch (err) {
        {
          runtime.error?.("Zalo message send failed: ");
        }
      }
    }
  }
}
export async function monitorZaloProvider(options) {
  const {token, account, config, runtime, abortSignal, useWebhook, webhookUrl, webhookSecret, webhookPath, statusSink, fetcher: fetcherOverride} = options;
  const core = getZaloRuntime();
  const effectiveMediaMaxMb = (account.config.mediaMaxMb ?? DEFAULT_MEDIA_MAX_MB);
  const fetcher = (fetcherOverride ?? resolveZaloProxyFetch(account.config.proxy));
  let stopped = false;
  const stopHandlers = [];
  const stop = () => {
    stopped = true;
    for (const handler of stopHandlers) {
      handler();
    }
  };
  if (useWebhook) {
    if ((!webhookUrl || !webhookSecret)) {
      throw new Error("Zalo webhookUrl and webhookSecret are required for webhook mode");
    }
    if (!webhookUrl.startsWith("https://")) {
      throw new Error("Zalo webhook URL must use HTTPS");
    }
    if (((webhookSecret.length < 8) || (webhookSecret.length > 256))) {
      throw new Error("Zalo webhook secret must be 8-256 characters");
    }
    const path = resolveWebhookPath(webhookPath, webhookUrl);
    if (!path) {
      throw new Error("Zalo webhookPath could not be derived");
    }
    await setWebhook(token, { url: webhookUrl, secret_token: webhookSecret }, fetcher);
    const unregister = registerZaloWebhookTarget({ token, account, config, runtime, core, path, secret: webhookSecret, statusSink: (patch) => statusSink?.(patch), mediaMaxMb: effectiveMediaMaxMb, fetcher });
    stopHandlers.push(unregister);
    abortSignal.addEventListener("abort", () => {
      void deleteWebhook(token, fetcher).catch(() => {
      });
    }, { once: true });
    return { stop };
  }
  try {
    {
      await deleteWebhook(token, fetcher);
    }
  }
  catch {
    {
    }
  }
  startPollingLoop({ token, account, config, runtime, core, abortSignal, isStopped: () => stopped, mediaMaxMb: effectiveMediaMaxMb, statusSink, fetcher });
  return { stop };
}

