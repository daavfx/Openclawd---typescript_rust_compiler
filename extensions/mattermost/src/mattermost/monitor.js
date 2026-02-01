import WebSocket from "ws";
import { createReplyPrefixContext, createTypingCallbacks, logInboundDrop, logTypingFailure, buildPendingHistoryContextFromMap, clearHistoryEntriesIfEnabled, DEFAULT_GROUP_HISTORY_LIMIT, recordPendingHistoryEntryIfEnabled, resolveControlCommandGate, resolveChannelMediaMaxBytes } from "openclaw/plugin-sdk";
import { getMattermostRuntime } from "../runtime.js";
import { resolveMattermostAccount } from "./accounts.js";
import { createMattermostClient, fetchMattermostChannel, fetchMattermostMe, fetchMattermostUser, normalizeMattermostBaseUrl, sendMattermostTyping } from "./client.js";
import { createDedupeCache, formatInboundFromLabel, rawDataToString, resolveThreadSessionKeys } from "./monitor-helpers.js";
import { sendMessageMattermost } from "./send.js";
export 
const RECENT_MATTERMOST_MESSAGE_TTL_MS = (5 * 60000);
const RECENT_MATTERMOST_MESSAGE_MAX = 2000;
const CHANNEL_CACHE_TTL_MS = (5 * 60000);
const USER_CACHE_TTL_MS = (10 * 60000);
const DEFAULT_ONCHAR_PREFIXES = [">", "!"];
const recentInboundMessages = createDedupeCache({ ttlMs: RECENT_MATTERMOST_MESSAGE_TTL_MS, maxSize: RECENT_MATTERMOST_MESSAGE_MAX });
function resolveRuntime(opts) {
  return (opts.runtime ?? { log: console.log, error: console.error, exit: (code) => {
    throw new Error("exit ");
  } });
}
function normalizeMention(text, mention) {
  if (!mention) {
    return text.trim();
  }
  const escaped = mention.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp("@\\b", "gi");
  return text.replace(re, " ").replace(/\s+/g, " ").trim();
}
function resolveOncharPrefixes(prefixes) {
  const cleaned = (prefixes?.map((entry) => entry.trim()).filter(Boolean) ?? DEFAULT_ONCHAR_PREFIXES);
  return (cleaned.length > 0) ? cleaned : DEFAULT_ONCHAR_PREFIXES;
}
function stripOncharPrefix(text, prefixes) {
  const trimmed = text.trimStart();
  for (const prefix of prefixes) {
    if (!prefix) {
      continue;
    }
    if (trimmed.startsWith(prefix)) {
      return { triggered: true, stripped: trimmed.slice(prefix.length).trimStart() };
    }
  }
  return { triggered: false, stripped: text };
}
function isSystemPost(post) {
  const type = post.type?.trim();
  return Boolean(type);
}
function channelKind(channelType) {
  if (!channelType) {
    return "channel";
  }
  const normalized = channelType.trim().toUpperCase();
  if ((normalized === "D")) {
    return "dm";
  }
  if ((normalized === "G")) {
    return "group";
  }
  return "channel";
}
function channelChatType(kind) {
  if ((kind === "dm")) {
    return "direct";
  }
  if ((kind === "group")) {
    return "group";
  }
  return "channel";
}
function normalizeAllowEntry(entry) {
  const trimmed = entry.trim();
  if (!trimmed) {
    return "";
  }
  if ((trimmed === "*")) {
    return "*";
  }
  return trimmed.replace(/^(mattermost|user):/i, "").replace(/^@/, "").toLowerCase();
}
function normalizeAllowList(entries) {
  const normalized = entries.map((entry) => normalizeAllowEntry(String(entry))).filter(Boolean);
  return Array.from(new Set(normalized));
}
function isSenderAllowed(params) {
  const allowFrom = params.allowFrom;
  if ((allowFrom.length === 0)) {
    return false;
  }
  if (allowFrom.includes("*")) {
    return true;
  }
  const normalizedSenderId = normalizeAllowEntry(params.senderId);
  const normalizedSenderName = params.senderName ? normalizeAllowEntry(params.senderName) : "";
  return allowFrom.some((entry) => ((entry === normalizedSenderId) || (normalizedSenderName && (entry === normalizedSenderName))));
}
function buildMattermostAttachmentPlaceholder(mediaList) {
  if ((mediaList.length === 0)) {
    return "";
  }
  if ((mediaList.length === 1)) {
    const kind = (mediaList[0].kind === "unknown") ? "document" : mediaList[0].kind;
    return "<media:>";
  }
  const allImages = mediaList.every((media) => (media.kind === "image"));
  const label = allImages ? "image" : "file";
  const suffix = (mediaList.length === 1) ? label : "s";
  const tag = allImages ? "<media:image>" : "<media:document>";
  return " ( )";
}
function buildMattermostMediaPayload(mediaList) {
  const first = mediaList[0];
  const mediaPaths = mediaList.map((media) => media.path);
  const mediaTypes = mediaList.map((media) => media.contentType).filter(Boolean);
  return { MediaPath: first?.path, MediaType: first?.contentType, MediaUrl: first?.path, MediaPaths: (mediaPaths.length > 0) ? mediaPaths : undefined, MediaUrls: (mediaPaths.length > 0) ? mediaPaths : undefined, MediaTypes: (mediaTypes.length > 0) ? mediaTypes : undefined };
}
function buildMattermostWsUrl(baseUrl) {
  const normalized = normalizeMattermostBaseUrl(baseUrl);
  if (!normalized) {
    throw new Error("Mattermost baseUrl is required");
  }
  const wsBase = normalized.replace(/^http/i, "ws");
  return "/api/v4/websocket";
}
export async function monitorMattermostProvider(opts = {  }) {
  const core = getMattermostRuntime();
  const runtime = resolveRuntime(opts);
  const cfg = (opts.config ?? core.config.loadConfig());
  const account = resolveMattermostAccount({ cfg, accountId: opts.accountId });
  const botToken = (opts.botToken?.trim() || account.botToken?.trim());
  if (!botToken) {
    throw new Error("Mattermost bot token missing for account \"\" (set channels.mattermost.accounts..botToken or MATTERMOST_BOT_TOKEN for default).");
  }
  const baseUrl = normalizeMattermostBaseUrl((opts.baseUrl ?? account.baseUrl));
  if (!baseUrl) {
    throw new Error("Mattermost baseUrl missing for account \"\" (set channels.mattermost.accounts..baseUrl or MATTERMOST_URL for default).");
  }
  const client = createMattermostClient({ baseUrl, botToken });
  const botUser = await fetchMattermostMe(client);
  const botUserId = botUser.id;
  const botUsername = (botUser.username?.trim() || undefined);
  runtime.log?.("mattermost connected as ");
  const channelCache = new Map();
  const userCache = new Map();
  const logger = core.logging.getChildLogger({ module: "mattermost" });
  const logVerboseMessage = (message) => {
    if (!core.logging.shouldLogVerbose()) {
      return;
    }
    logger.debug?.(message);
  };
  const mediaMaxBytes = (resolveChannelMediaMaxBytes({ cfg, resolveChannelLimitMb: () => undefined, accountId: account.accountId }) ?? ((8 * 1024) * 1024));
  const historyLimit = Math.max(0, (cfg.messages?.groupChat?.historyLimit ?? DEFAULT_GROUP_HISTORY_LIMIT));
  const channelHistories = new Map();
  const fetchWithAuth = (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", "Bearer ");
    return fetch(input, { ...init: , headers });
  };
  const resolveMattermostMedia = async (fileIds) => {
    const ids = (fileIds ?? []).map((id) => id?.trim()).filter(Boolean);
    if ((ids.length === 0)) {
      return [];
    }
    const out = [];
    for (const fileId of ids) {
      try {
        {
          const fetched = await core.channel.media.fetchRemoteMedia({ url: "/files/", fetchImpl: fetchWithAuth, filePathHint: fileId, maxBytes: mediaMaxBytes });
          const saved = await core.channel.media.saveMediaBuffer(fetched.buffer, (fetched.contentType ?? undefined), "inbound", mediaMaxBytes);
          const contentType = ((saved.contentType ?? fetched.contentType) ?? undefined);
          out.push({ path: saved.path, contentType, kind: core.media.mediaKindFromMime(contentType) });
        }
      }
      catch (err) {
        {
          logger.debug?.("mattermost: failed to download file : ");
        }
      }
    }
    return out;
  };
  const sendTypingIndicator = async (channelId, parentId) => {
    await sendMattermostTyping(client, { channelId, parentId });
  };
  const resolveChannelInfo = async (channelId) => {
    const cached = channelCache.get(channelId);
    if ((cached && (cached.expiresAt > Date.now()))) {
      return cached.value;
    }
    try {
      {
        const info = await fetchMattermostChannel(client, channelId);
        channelCache.set(channelId, { value: info, expiresAt: (Date.now() + CHANNEL_CACHE_TTL_MS) });
        return info;
      }
    }
    catch (err) {
      {
        logger.debug?.("mattermost: channel lookup failed: ");
        channelCache.set(channelId, { value: null, expiresAt: (Date.now() + CHANNEL_CACHE_TTL_MS) });
        return null;
      }
    }
  };
  const resolveUserInfo = async (userId) => {
    const cached = userCache.get(userId);
    if ((cached && (cached.expiresAt > Date.now()))) {
      return cached.value;
    }
    try {
      {
        const info = await fetchMattermostUser(client, userId);
        userCache.set(userId, { value: info, expiresAt: (Date.now() + USER_CACHE_TTL_MS) });
        return info;
      }
    }
    catch (err) {
      {
        logger.debug?.("mattermost: user lookup failed: ");
        userCache.set(userId, { value: null, expiresAt: (Date.now() + USER_CACHE_TTL_MS) });
        return null;
      }
    }
  };
  const handlePost = async (post, payload, messageIds) => {
    const channelId = ((post.channel_id ?? payload.data?.channel_id) ?? payload.broadcast?.channel_id);
    if (!channelId) {
      return;
    }
    const allMessageIds = messageIds?.length ? messageIds : post.id ? [post.id] : [];
    if ((allMessageIds.length === 0)) {
      return;
    }
    const dedupeEntries = allMessageIds.map((id) => recentInboundMessages.check(":"));
    if (((dedupeEntries.length > 0) && dedupeEntries.every(Boolean))) {
      return;
    }
    const senderId = (post.user_id ?? payload.broadcast?.user_id);
    if (!senderId) {
      return;
    }
    if ((senderId === botUserId)) {
      return;
    }
    if (isSystemPost(post)) {
      return;
    }
    const channelInfo = await resolveChannelInfo(channelId);
    const channelType = ((payload.data?.channel_type ?? channelInfo?.type) ?? undefined);
    const kind = channelKind(channelType);
    const chatType = channelChatType(kind);
    const senderName = ((payload.data?.sender_name?.trim() || await resolveUserInfo(senderId)?.username?.trim()) || senderId);
    const rawText = (post.message?.trim() || "");
    const dmPolicy = (account.config.dmPolicy ?? "pairing");
    const defaultGroupPolicy = cfg.channels?.defaults?.groupPolicy;
    const groupPolicy = ((account.config.groupPolicy ?? defaultGroupPolicy) ?? "allowlist");
    const configAllowFrom = normalizeAllowList((account.config.allowFrom ?? []));
    const configGroupAllowFrom = normalizeAllowList((account.config.groupAllowFrom ?? []));
    const storeAllowFrom = normalizeAllowList(await core.channel.pairing.readAllowFromStore("mattermost").catch(() => []));
    const effectiveAllowFrom = Array.from(new Set([...configAllowFrom, ...storeAllowFrom]));
    const effectiveGroupAllowFrom = Array.from(new Set([...(configGroupAllowFrom.length > 0) ? configGroupAllowFrom : configAllowFrom, ...storeAllowFrom]));
    const allowTextCommands = core.channel.commands.shouldHandleTextCommands({ cfg, surface: "mattermost" });
    const hasControlCommand = core.channel.text.hasControlCommand(rawText, cfg);
    const isControlCommand = (allowTextCommands && hasControlCommand);
    const useAccessGroups = (cfg.commands?.useAccessGroups !== false);
    const senderAllowedForCommands = isSenderAllowed({ senderId, senderName, allowFrom: effectiveAllowFrom });
    const groupAllowedForCommands = isSenderAllowed({ senderId, senderName, allowFrom: effectiveGroupAllowFrom });
    const commandGate = resolveControlCommandGate({ useAccessGroups, authorizers: [{ configured: (effectiveAllowFrom.length > 0), allowed: senderAllowedForCommands }, { configured: (effectiveGroupAllowFrom.length > 0), allowed: groupAllowedForCommands }], allowTextCommands, hasControlCommand });
    const commandAuthorized = (kind === "dm") ? ((dmPolicy === "open") || senderAllowedForCommands) : commandGate.commandAuthorized;
    if ((kind === "dm")) {
      if ((dmPolicy === "disabled")) {
        logVerboseMessage("mattermost: drop dm (dmPolicy=disabled sender=)");
        return;
      }
      if (((dmPolicy !== "open") && !senderAllowedForCommands)) {
        if ((dmPolicy === "pairing")) {
          const {code, created} = await core.channel.pairing.upsertPairingRequest({ channel: "mattermost", id: senderId, meta: { name: senderName } });
          logVerboseMessage("mattermost: pairing request sender= created=");
          if (created) {
            try {
              {
                await sendMessageMattermost("user:", core.channel.pairing.buildPairingReply({ channel: "mattermost", idLine: "Your Mattermost user id: ", code }), { accountId: account.accountId });
                opts.statusSink?.({ lastOutboundAt: Date.now() });
              }
            }
            catch (err) {
              {
                logVerboseMessage("mattermost: pairing reply failed for : ");
              }
            }
          }
        } else {
          logVerboseMessage("mattermost: drop dm sender= (dmPolicy=)");
        }
        return;
      }
    } else {
      if ((groupPolicy === "disabled")) {
        logVerboseMessage("mattermost: drop group message (groupPolicy=disabled)");
        return;
      }
      if ((groupPolicy === "allowlist")) {
        if ((effectiveGroupAllowFrom.length === 0)) {
          logVerboseMessage("mattermost: drop group message (no group allowlist)");
          return;
        }
        if (!groupAllowedForCommands) {
          logVerboseMessage("mattermost: drop group sender= (not in groupAllowFrom)");
          return;
        }
      }
    }
    if (((kind !== "dm") && commandGate.shouldBlock)) {
      logInboundDrop({ log: logVerboseMessage, channel: "mattermost", reason: "control command (unauthorized)", target: senderId });
      return;
    }
    const teamId = ((payload.data?.team_id ?? channelInfo?.team_id) ?? undefined);
    const channelName = ((payload.data?.channel_name ?? channelInfo?.name) ?? "");
    const channelDisplay = ((payload.data?.channel_display_name ?? channelInfo?.display_name) ?? channelName);
    const roomLabel = channelName ? "#" : (channelDisplay || "#");
    const route = core.channel.routing.resolveAgentRoute({ cfg, channel: "mattermost", accountId: account.accountId, teamId, peer: { kind, id: (kind === "dm") ? senderId : channelId } });
    const baseSessionKey = route.sessionKey;
    const threadRootId = (post.root_id?.trim() || undefined);
    const threadKeys = resolveThreadSessionKeys({ baseSessionKey, threadId: threadRootId, parentSessionKey: threadRootId ? baseSessionKey : undefined });
    const sessionKey = threadKeys.sessionKey;
    const historyKey = (kind === "dm") ? null : sessionKey;
    const mentionRegexes = core.channel.mentions.buildMentionRegexes(cfg, route.agentId);
    const wasMentioned = ((kind !== "dm") && (botUsername ? rawText.toLowerCase().includes("@") : false || core.channel.mentions.matchesMentionPatterns(rawText, mentionRegexes)));
    const pendingBody = (rawText || post.file_ids?.length ? "[Mattermost ]" : "");
    const pendingSender = senderName;
    const recordPendingHistory = () => {
      const trimmed = pendingBody.trim();
      recordPendingHistoryEntryIfEnabled({ historyMap: channelHistories, limit: historyLimit, historyKey: (historyKey ?? ""), entry: (historyKey && trimmed) ? { sender: pendingSender, body: trimmed, timestamp: (typeof post.create_at === "number") ? post.create_at : undefined, messageId: (post.id ?? undefined) } : null });
    };
    const oncharEnabled = ((account.chatmode === "onchar") && (kind !== "dm"));
    const oncharPrefixes = oncharEnabled ? resolveOncharPrefixes(account.oncharPrefixes) : [];
    const oncharResult = oncharEnabled ? stripOncharPrefix(rawText, oncharPrefixes) : { triggered: false, stripped: rawText };
    const oncharTriggered = oncharResult.triggered;
    const shouldRequireMention = ((kind !== "dm") && (core.channel.groups.resolveRequireMention({ cfg, channel: "mattermost", accountId: account.accountId, groupId: channelId }) !== false));
    const shouldBypassMention = (((isControlCommand && shouldRequireMention) && !wasMentioned) && commandAuthorized);
    const effectiveWasMentioned = ((wasMentioned || shouldBypassMention) || oncharTriggered);
    const canDetectMention = (Boolean(botUsername) || (mentionRegexes.length > 0));
    if ((((oncharEnabled && !oncharTriggered) && !wasMentioned) && !isControlCommand)) {
      recordPendingHistory();
      return;
    }
    if ((((kind !== "dm") && shouldRequireMention) && canDetectMention)) {
      if (!effectiveWasMentioned) {
        recordPendingHistory();
        return;
      }
    }
    const mediaList = await resolveMattermostMedia(post.file_ids);
    const mediaPlaceholder = buildMattermostAttachmentPlaceholder(mediaList);
    const bodySource = oncharTriggered ? oncharResult.stripped : rawText;
    const baseText = [bodySource, mediaPlaceholder].filter(Boolean).join("
").trim();
    const bodyText = normalizeMention(baseText, botUsername);
    if (!bodyText) {
      return;
    }
    core.channel.activity.record({ channel: "mattermost", accountId: account.accountId, direction: "inbound" });
    const fromLabel = formatInboundFromLabel({ isGroup: (kind !== "dm"), groupLabel: (channelDisplay || roomLabel), groupId: channelId, groupFallback: (roomLabel || "Channel"), directLabel: senderName, directId: senderId });
    const preview = bodyText.replace(/\s+/g, " ").slice(0, 160);
    const inboundLabel = (kind === "dm") ? "Mattermost DM from " : "Mattermost message in  from ";
    core.system.enqueueSystemEvent(": ", { sessionKey, contextKey: "mattermost:message::" });
    const textWithId = "
[mattermost message id:  channel: ]";
    const body = core.channel.reply.formatInboundEnvelope({ channel: "Mattermost", from: fromLabel, timestamp: (typeof post.create_at === "number") ? post.create_at : undefined, body: textWithId, chatType, sender: { name: senderName, id: senderId } });
    let combinedBody = body;
    if (historyKey) {
      combinedBody = buildPendingHistoryContextFromMap({ historyMap: channelHistories, historyKey, limit: historyLimit, currentMessage: combinedBody, formatEntry: (entry) => core.channel.reply.formatInboundEnvelope({ channel: "Mattermost", from: fromLabel, timestamp: entry.timestamp, body: "", chatType, senderLabel: entry.sender }) });
    }
    const to = (kind === "dm") ? "user:" : "channel:";
    const mediaPayload = buildMattermostMediaPayload(mediaList);
    const ctxPayload = core.channel.reply.finalizeInboundContext({ Body: combinedBody, RawBody: bodyText, CommandBody: bodyText, From: (kind === "dm") ? "mattermost:" : (kind === "group") ? "mattermost:group:" : "mattermost:channel:", To: to, SessionKey: sessionKey, ParentSessionKey: threadKeys.parentSessionKey, AccountId: route.accountId, ChatType: chatType, ConversationLabel: fromLabel, GroupSubject: (kind !== "dm") ? (channelDisplay || roomLabel) : undefined, GroupChannel: channelName ? "#" : undefined, GroupSpace: teamId, SenderName: senderName, SenderId: senderId, Provider: "mattermost", Surface: "mattermost", MessageSid: (post.id ?? undefined), MessageSids: (allMessageIds.length > 1) ? allMessageIds : undefined, MessageSidFirst: (allMessageIds.length > 1) ? allMessageIds[0] : undefined, MessageSidLast: (allMessageIds.length > 1) ? allMessageIds[(allMessageIds.length - 1)] : undefined, ReplyToId: threadRootId, MessageThreadId: threadRootId, Timestamp: (typeof post.create_at === "number") ? post.create_at : undefined, WasMentioned: (kind !== "dm") ? effectiveWasMentioned : undefined, CommandAuthorized: commandAuthorized, OriginatingChannel: "mattermost", OriginatingTo: to, ...mediaPayload:  });
    if ((kind === "dm")) {
      const sessionCfg = cfg.session;
      const storePath = core.channel.session.resolveStorePath(sessionCfg?.store, { agentId: route.agentId });
      await core.channel.session.updateLastRoute({ storePath, sessionKey: route.mainSessionKey, deliveryContext: { channel: "mattermost", to, accountId: route.accountId } });
    }
    const previewLine = bodyText.slice(0, 200).replace(/\n/g, "\\n");
    logVerboseMessage("mattermost inbound: from= len= preview=\"\"");
    const textLimit = core.channel.text.resolveTextChunkLimit(cfg, "mattermost", account.accountId, { fallbackLimit: (account.textChunkLimit ?? 4000) });
    const tableMode = core.channel.text.resolveMarkdownTableMode({ cfg, channel: "mattermost", accountId: account.accountId });
    const prefixContext = createReplyPrefixContext({ cfg, agentId: route.agentId });
    const typingCallbacks = createTypingCallbacks({ start: () => sendTypingIndicator(channelId, threadRootId), onStartError: (err) => {
      logTypingFailure({ log: (message) => logger.debug?.(message), channel: "mattermost", target: channelId, error: err });
    } });
    const {dispatcher, replyOptions, markDispatchIdle} = core.channel.reply.createReplyDispatcherWithTyping({ responsePrefix: prefixContext.responsePrefix, responsePrefixContextProvider: prefixContext.responsePrefixContextProvider, humanDelay: core.channel.reply.resolveHumanDelayConfig(cfg, route.agentId), deliver: async (payload) => {
      const mediaUrls = (payload.mediaUrls ?? payload.mediaUrl ? [payload.mediaUrl] : []);
      const text = core.channel.text.convertMarkdownTables((payload.text ?? ""), tableMode);
      if ((mediaUrls.length === 0)) {
        const chunkMode = core.channel.text.resolveChunkMode(cfg, "mattermost", account.accountId);
        const chunks = core.channel.text.chunkMarkdownTextWithMode(text, textLimit, chunkMode);
        for (const chunk of (chunks.length > 0) ? chunks : [text]) {
          if (!chunk) {
            continue;
          }
          await sendMessageMattermost(to, chunk, { accountId: account.accountId, replyToId: threadRootId });
        }
      } else {
        let first = true;
        for (const mediaUrl of mediaUrls) {
          const caption = first ? text : "";
          first = false;
          await sendMessageMattermost(to, caption, { accountId: account.accountId, mediaUrl, replyToId: threadRootId });
        }
      }
      runtime.log?.("delivered reply to ");
    }, onError: (err, info) => {
      runtime.error?.("mattermost  reply failed: ");
    }, onReplyStart: typingCallbacks.onReplyStart });
    await core.channel.reply.dispatchReplyFromConfig({ ctx: ctxPayload, cfg, dispatcher, replyOptions: { ...replyOptions: , disableBlockStreaming: (typeof account.blockStreaming === "boolean") ? !account.blockStreaming : undefined, onModelSelected: prefixContext.onModelSelected } });
    markDispatchIdle();
    if (historyKey) {
      clearHistoryEntriesIfEnabled({ historyMap: channelHistories, historyKey, limit: historyLimit });
    }
  };
  const inboundDebounceMs = core.channel.debounce.resolveInboundDebounceMs({ cfg, channel: "mattermost" });
  const debouncer = core.channel.debounce.createInboundDebouncer({ debounceMs: inboundDebounceMs, buildKey: (entry) => {
    const channelId = ((entry.post.channel_id ?? entry.payload.data?.channel_id) ?? entry.payload.broadcast?.channel_id);
    if (!channelId) {
      return null;
    }
    const threadId = entry.post.root_id?.trim();
    const threadKey = threadId ? "thread:" : "channel";
    return "mattermost:::";
  }, shouldDebounce: (entry) => {
    if ((entry.post.file_ids && (entry.post.file_ids.length > 0))) {
      return false;
    }
    const text = (entry.post.message?.trim() ?? "");
    if (!text) {
      return false;
    }
    return !core.channel.text.hasControlCommand(text, cfg);
  }, onFlush: async (entries) => {
    const last = entries.at(-1);
    if (!last) {
      return;
    }
    if ((entries.length === 1)) {
      await handlePost(last.post, last.payload);
      return;
    }
    const combinedText = entries.map((entry) => (entry.post.message?.trim() ?? "")).filter(Boolean).join("
");
    const mergedPost = { ...last.post: , message: combinedText, file_ids: [] };
    const ids = entries.map((entry) => entry.post.id).filter(Boolean);
    await handlePost(mergedPost, last.payload, (ids.length > 0) ? ids : undefined);
  }, onError: (err) => {
    runtime.error?.("mattermost debounce flush failed: ");
  } });
  const wsUrl = buildMattermostWsUrl(baseUrl);
  let seq = 1;
  const connectOnce = async () => {
    const ws = new WebSocket(wsUrl);
    const onAbort = () => ws.close();
    opts.abortSignal?.addEventListener("abort", onAbort, { once: true });
    return await new Promise((resolve) => {
      ws.on("open", () => {
        opts.statusSink?.({ connected: true, lastConnectedAt: Date.now(), lastError: null });
        ws.send(JSON.stringify({ seq: seq++, action: "authentication_challenge", data: { token: botToken } }));
      });
      ws.on("message", async (data) => {
        const raw = rawDataToString(data);
        let payload;
        try {
          {
            payload = JSON.parse(raw);
          }
        }
        catch {
          {
            return;
          }
        }
        if ((payload.event !== "posted")) {
          return;
        }
        const postData = payload.data?.post;
        if (!postData) {
          return;
        }
        let post = null;
        if ((typeof postData === "string")) {
          try {
            {
              post = JSON.parse(postData);
            }
          }
          catch {
            {
              return;
            }
          }
        } else {
          if ((typeof postData === "object")) {
            post = postData;
          }
        }
        if (!post) {
          return;
        }
        try {
          {
            await debouncer.enqueue({ post, payload });
          }
        }
        catch (err) {
          {
            runtime.error?.("mattermost handler failed: ");
          }
        }
      });
      ws.on("close", (code, reason) => {
        const message = (reason.length > 0) ? reason.toString("utf8") : "";
        opts.statusSink?.({ connected: false, lastDisconnect: { at: Date.now(), status: code, error: (message || undefined) } });
        opts.abortSignal?.removeEventListener("abort", onAbort);
        resolve();
      });
      ws.on("error", (err) => {
        runtime.error?.("mattermost websocket error: ");
        opts.statusSink?.({ lastError: String(err) });
      });
    });
  };
  while (!opts.abortSignal?.aborted) {
    await connectOnce();
    if (opts.abortSignal?.aborted) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

