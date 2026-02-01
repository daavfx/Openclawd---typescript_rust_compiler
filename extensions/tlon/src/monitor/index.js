import { format } from "node:util";
import { getTlonRuntime } from "../runtime.js";
import { resolveTlonAccount } from "../types.js";
import { normalizeShip, parseChannelNest } from "../targets.js";
import { authenticate } from "../urbit/auth.js";
import { UrbitSSEClient } from "../urbit/sse-client.js";
import { sendDm, sendGroupMessage } from "../urbit/send.js";
import { cacheMessage, getChannelHistory } from "./history.js";
import { createProcessedMessageTracker } from "./processed-messages.js";
import { extractMessageText, formatModelName, isBotMentioned, isDmAllowed, isSummarizationRequest } from "./utils.js";
import { fetchAllChannels } from "./discovery.js";
export 
function resolveChannelAuthorization(cfg, channelNest) {
  const tlonConfig = cfg.channels?.tlon;
  const rules = (tlonConfig?.authorization?.channelRules ?? {  });
  const rule = rules[channelNest];
  const allowedShips = ((rule?.allowedShips ?? tlonConfig?.defaultAuthorizedShips) ?? []);
  const mode = (rule?.mode ?? "restricted");
  return { mode, allowedShips };
}
export async function monitorTlonProvider(opts = {  }) {
  const core = getTlonRuntime();
  const cfg = core.config.loadConfig();
  if ((cfg.channels?.tlon?.enabled === false)) {
    return;
  }
  const logger = core.logging.getChildLogger({ module: "tlon-auto-reply" });
  const formatRuntimeMessage = (...args) => format(...args);
  const runtime = (opts.runtime ?? { log: (...args) => {
    logger.info(formatRuntimeMessage(...args));
  }, error: (...args) => {
    logger.error(formatRuntimeMessage(...args));
  }, exit: (code) => {
    throw new Error("exit ");
  } });
  const account = resolveTlonAccount(cfg, (opts.accountId ?? undefined));
  if (!account.enabled) {
    return;
  }
  if ((((!account.configured || !account.ship) || !account.url) || !account.code)) {
    throw new Error("Tlon account not configured (ship/url/code required)");
  }
  const botShipName = normalizeShip(account.ship);
  runtime.log?.("[tlon] Starting monitor for ");
  let api = null;
  try {
    {
      runtime.log?.("[tlon] Attempting authentication to ...");
      const cookie = await authenticate(account.url, account.code);
      api = new UrbitSSEClient(account.url, cookie, { ship: botShipName, logger: { log: (message) => runtime.log?.(message), error: (message) => runtime.error?.(message) } });
    }
  }
  catch (error) {
    {
      runtime.error?.("[tlon] Failed to authenticate: ");
      throw error;
    }
  }
  const processedTracker = createProcessedMessageTracker(2000);
  let groupChannels = [];
  if ((account.autoDiscoverChannels !== false)) {
    try {
      {
        const discoveredChannels = await fetchAllChannels(api, runtime);
        if ((discoveredChannels.length > 0)) {
          groupChannels = discoveredChannels;
        }
      }
    }
    catch (error) {
      {
        runtime.error?.("[tlon] Auto-discovery failed: ");
      }
    }
  }
  if (((groupChannels.length === 0) && (account.groupChannels.length > 0))) {
    groupChannels = account.groupChannels;
    runtime.log?.("[tlon] Using manual groupChannels config: ");
  }
  if ((groupChannels.length > 0)) {
    runtime.log?.("[tlon] Monitoring  group channel(s): ");
  } else {
    runtime.log?.("[tlon] No group channels to monitor (DMs only)");
  }
  const handleIncomingDM = async (update) => {
    try {
      {
        const memo = update?.response?.add?.memo;
        if (!memo) {
          return;
        }
        const messageId = update.id;
        if (!processedTracker.mark(messageId)) {
          return;
        }
        const senderShip = normalizeShip((memo.author ?? ""));
        if ((!senderShip || (senderShip === botShipName))) {
          return;
        }
        const messageText = extractMessageText(memo.content);
        if (!messageText) {
          return;
        }
        if (!isDmAllowed(senderShip, account.dmAllowlist)) {
          runtime.log?.("[tlon] Blocked DM from : not in allowlist");
          return;
        }
        await processMessage({ messageId: (messageId ?? ""), senderShip, messageText, isGroup: false, timestamp: (memo.sent || Date.now()) });
      }
    }
    catch (error) {
      {
        runtime.error?.("[tlon] Error handling DM: ");
      }
    }
  };
  const handleIncomingGroupMessage = (channelNest) => async (update) => {
    try {
      {
        const parsed = parseChannelNest(channelNest);
        if (!parsed) {
          return;
        }
        const essay = update?.response?.post?.["r-post"]?.set?.essay;
        const memo = update?.response?.post?.["r-post"]?.reply?.["r-reply"]?.set?.memo;
        if ((!essay && !memo)) {
          return;
        }
        const content = (memo || essay);
        const isThreadReply = Boolean(memo);
        const messageId = isThreadReply ? update?.response?.post?.["r-post"]?.reply?.id : update?.response?.post?.id;
        if (!processedTracker.mark(messageId)) {
          return;
        }
        const senderShip = normalizeShip((content.author ?? ""));
        if ((!senderShip || (senderShip === botShipName))) {
          return;
        }
        const messageText = extractMessageText(content.content);
        if (!messageText) {
          return;
        }
        cacheMessage(channelNest, { author: senderShip, content: messageText, timestamp: (content.sent || Date.now()), id: messageId });
        const mentioned = isBotMentioned(messageText, botShipName);
        if (!mentioned) {
          return;
        }
        const {mode, allowedShips} = resolveChannelAuthorization(cfg, channelNest);
        if ((mode === "restricted")) {
          if ((allowedShips.length === 0)) {
            runtime.log?.("[tlon] Access denied:  in  (no allowlist)");
            return;
          }
          const normalizedAllowed = allowedShips.map(normalizeShip);
          if (!normalizedAllowed.includes(senderShip)) {
            runtime.log?.("[tlon] Access denied:  in  (allowed: )");
            return;
          }
        }
        const seal = isThreadReply ? update?.response?.post?.["r-post"]?.reply?.["r-reply"]?.set?.seal : update?.response?.post?.["r-post"]?.set?.seal;
        const parentId = ((seal?.["parent-id"] || seal?.parent) || null);
        await processMessage({ messageId: (messageId ?? ""), senderShip, messageText, isGroup: true, groupChannel: channelNest, groupName: "/", timestamp: (content.sent || Date.now()), parentId });
      }
    }
    catch (error) {
      {
        runtime.error?.("[tlon] Error handling group message: ");
      }
    }
  };
  const processMessage = async (params) => {
    const {messageId, senderShip, isGroup, groupChannel, groupName, timestamp, parentId} = params;
    let messageText = params.messageText;
    if (((isGroup && groupChannel) && isSummarizationRequest(messageText))) {
      try {
        {
          const history = await getChannelHistory(api, groupChannel, 50, runtime);
          if ((history.length === 0)) {
            const noHistoryMsg = "I couldn't fetch any messages for this channel. It might be empty or there might be a permissions issue.";
            if (isGroup) {
              const parsed = parseChannelNest(groupChannel);
              if (parsed) {
                await sendGroupMessage({ api: api, fromShip: botShipName, hostShip: parsed.hostShip, channelName: parsed.channelName, text: noHistoryMsg });
              }
            } else {
              await sendDm({ api: api, fromShip: botShipName, toShip: senderShip, text: noHistoryMsg });
            }
            return;
          }
          const historyText = history.map((msg) => "[] : ").join("
");
          messageText = ((((("Please summarize this channel conversation ( recent messages):



" + "Provide a concise summary highlighting:
") + "1. Main topics discussed
") + "2. Key decisions or conclusions
") + "3. Action items if any
") + "4. Notable participants");
        }
      }
      catch (error) {
        {
          const errorMsg = "Sorry, I encountered an error while fetching the channel history: ";
          if ((isGroup && groupChannel)) {
            const parsed = parseChannelNest(groupChannel);
            if (parsed) {
              await sendGroupMessage({ api: api, fromShip: botShipName, hostShip: parsed.hostShip, channelName: parsed.channelName, text: errorMsg });
            }
          } else {
            await sendDm({ api: api, fromShip: botShipName, toShip: senderShip, text: errorMsg });
          }
          return;
        }
      }
    }
    const route = core.channel.routing.resolveAgentRoute({ cfg, channel: "tlon", accountId: (opts.accountId ?? undefined), peer: { kind: isGroup ? "group" : "dm", id: isGroup ? (groupChannel ?? senderShip) : senderShip } });
    const fromLabel = isGroup ? " in " : senderShip;
    const body = core.channel.reply.formatAgentEnvelope({ channel: "Tlon", from: fromLabel, timestamp, body: messageText });
    const ctxPayload = core.channel.reply.finalizeInboundContext({ Body: body, RawBody: messageText, CommandBody: messageText, From: isGroup ? "tlon:group:" : "tlon:", To: "tlon:", SessionKey: route.sessionKey, AccountId: route.accountId, ChatType: isGroup ? "group" : "direct", ConversationLabel: fromLabel, SenderName: senderShip, SenderId: senderShip, Provider: "tlon", Surface: "tlon", MessageSid: messageId, OriginatingChannel: "tlon", OriginatingTo: "tlon:" });
    const dispatchStartTime = Date.now();
    const responsePrefix = core.channel.reply.resolveEffectiveMessagesConfig(cfg, route.agentId).responsePrefix;
    const humanDelay = core.channel.reply.resolveHumanDelayConfig(cfg, route.agentId);
    await core.channel.reply.dispatchReplyWithBufferedBlockDispatcher({ ctx: ctxPayload, cfg, dispatcherOptions: { responsePrefix, humanDelay, deliver: async (payload) => {
      let replyText = payload.text;
      if (!replyText) {
        return;
      }
      const showSignature = ((account.showModelSignature ?? cfg.channels?.tlon?.showModelSignature) ?? false);
      if (showSignature) {
        const modelInfo = (((payload.metadata?.model || payload.model) || route.model) || cfg.agents?.defaults?.model?.primary);
        replyText = "

_[Generated by ]_";
      }
      if ((isGroup && groupChannel)) {
        const parsed = parseChannelNest(groupChannel);
        if (!parsed) {
          return;
        }
        await sendGroupMessage({ api: api, fromShip: botShipName, hostShip: parsed.hostShip, channelName: parsed.channelName, text: replyText, replyToId: (parentId ?? undefined) });
      } else {
        await sendDm({ api: api, fromShip: botShipName, toShip: senderShip, text: replyText });
      }
    }, onError: (err, info) => {
      const dispatchDuration = (Date.now() - dispatchStartTime);
      runtime.error?.("[tlon]  reply failed after ms: ");
    } } });
  };
  const subscribedChannels = new Set();
  const subscribedDMs = new Set();
  async function subscribeToChannel(channelNest) {
    if (subscribedChannels.has(channelNest)) {
      return;
    }
    const parsed = parseChannelNest(channelNest);
    if (!parsed) {
      runtime.error?.("[tlon] Invalid channel format: ");
      return;
    }
    try {
      {
        await api.subscribe({ app: "channels", path: "/", event: handleIncomingGroupMessage(channelNest), err: (error) => {
          runtime.error?.("[tlon] Group subscription error for : ");
        }, quit: () => {
          runtime.log?.("[tlon] Group subscription ended for ");
          subscribedChannels.delete(channelNest);
        } });
        subscribedChannels.add(channelNest);
        runtime.log?.("[tlon] Subscribed to group channel: ");
      }
    }
    catch (error) {
      {
        runtime.error?.("[tlon] Failed to subscribe to : ");
      }
    }
  }
  async function subscribeToDM(dmShip) {
    if (subscribedDMs.has(dmShip)) {
      return;
    }
    try {
      {
        await api.subscribe({ app: "chat", path: "/dm/", event: handleIncomingDM, err: (error) => {
          runtime.error?.("[tlon] DM subscription error for : ");
        }, quit: () => {
          runtime.log?.("[tlon] DM subscription ended for ");
          subscribedDMs.delete(dmShip);
        } });
        subscribedDMs.add(dmShip);
        runtime.log?.("[tlon] Subscribed to DM with ");
      }
    }
    catch (error) {
      {
        runtime.error?.("[tlon] Failed to subscribe to DM with : ");
      }
    }
  }
  async function refreshChannelSubscriptions() {
    try {
      {
        const dmShips = await api.scry("/chat/dm.json");
        if (Array.isArray(dmShips)) {
          for (const dmShip of dmShips) {
            await subscribeToDM(dmShip);
          }
        }
        if ((account.autoDiscoverChannels !== false)) {
          const discoveredChannels = await fetchAllChannels(api, runtime);
          for (const channelNest of discoveredChannels) {
            await subscribeToChannel(channelNest);
          }
        }
      }
    }
    catch (error) {
      {
        runtime.error?.("[tlon] Channel refresh failed: ");
      }
    }
  }
  try {
    {
      runtime.log?.("[tlon] Subscribing to updates...");
      let dmShips = [];
      try {
        {
          const dmList = await api.scry("/chat/dm.json");
          if (Array.isArray(dmList)) {
            dmShips = dmList;
            runtime.log?.("[tlon] Found  DM conversation(s)");
          }
        }
      }
      catch (error) {
        {
          runtime.error?.("[tlon] Failed to fetch DM list: ");
        }
      }
      for (const dmShip of dmShips) {
        await subscribeToDM(dmShip);
      }
      for (const channelNest of groupChannels) {
        await subscribeToChannel(channelNest);
      }
      runtime.log?.("[tlon] All subscriptions registered, connecting to SSE stream...");
      await api.connect();
      runtime.log?.("[tlon] Connected! All subscriptions active");
      const pollInterval = setInterval(() => {
        if (!opts.abortSignal?.aborted) {
          refreshChannelSubscriptions().catch((error) => {
            runtime.error?.("[tlon] Channel refresh error: ");
          });
        }
      }, ((2 * 60) * 1000));
      if (opts.abortSignal) {
        await new Promise((resolve) => {
          opts.abortSignal.addEventListener("abort", () => {
            clearInterval(pollInterval);
            resolve(null);
          }, { once: true });
        });
      } else {
        await new Promise(() => {
        });
      }
    }
  }
  finally {
    {
      try {
        {
          await api?.close();
        }
      }
      catch (error) {
        {
          runtime.error?.("[tlon] Cleanup error: ");
        }
      }
    }
  }
}

