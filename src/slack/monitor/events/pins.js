import { danger } from "../../../globals.js";
import { enqueueSystemEvent } from "../../../infra/system-events.js";
import { resolveSlackChannelLabel } from "../channel-config.js";
export function registerSlackPinEvents(params) {
  const {ctx} = params;
  ctx.app.event("pin_added", async ({event, body}) => {
    try {
      {
        if (ctx.shouldDropMismatchedSlackEvent(body)) {
          return;
        }
        const payload = event;
        const channelId = payload.channel_id;
        const channelInfo = channelId ? await ctx.resolveChannelName(channelId) : {  };
        if (!ctx.isChannelAllowed({ channelId, channelName: channelInfo?.name, channelType: channelInfo?.type })) {
          return;
        }
        const label = resolveSlackChannelLabel({ channelId, channelName: channelInfo?.name });
        const userInfo = payload.user ? await ctx.resolveUserName(payload.user) : {  };
        const userLabel = ((userInfo?.name ?? payload.user) ?? "someone");
        const itemType = (payload.item?.type ?? "item");
        const messageId = (payload.item?.message?.ts ?? payload.event_ts);
        const sessionKey = ctx.resolveSlackSystemEventSessionKey({ channelId, channelType: (channelInfo?.type ?? undefined) });
        enqueueSystemEvent("Slack:  pinned a  in .", { sessionKey, contextKey: "slack:pin:added::" });
      }
    }
    catch (err) {
      {
        ctx.runtime.error?.(danger("slack pin added handler failed: "));
      }
    }
  });
  ctx.app.event("pin_removed", async ({event, body}) => {
    try {
      {
        if (ctx.shouldDropMismatchedSlackEvent(body)) {
          return;
        }
        const payload = event;
        const channelId = payload.channel_id;
        const channelInfo = channelId ? await ctx.resolveChannelName(channelId) : {  };
        if (!ctx.isChannelAllowed({ channelId, channelName: channelInfo?.name, channelType: channelInfo?.type })) {
          return;
        }
        const label = resolveSlackChannelLabel({ channelId, channelName: channelInfo?.name });
        const userInfo = payload.user ? await ctx.resolveUserName(payload.user) : {  };
        const userLabel = ((userInfo?.name ?? payload.user) ?? "someone");
        const itemType = (payload.item?.type ?? "item");
        const messageId = (payload.item?.message?.ts ?? payload.event_ts);
        const sessionKey = ctx.resolveSlackSystemEventSessionKey({ channelId, channelType: (channelInfo?.type ?? undefined) });
        enqueueSystemEvent("Slack:  unpinned a  in .", { sessionKey, contextKey: "slack:pin:removed::" });
      }
    }
    catch (err) {
      {
        ctx.runtime.error?.(danger("slack pin removed handler failed: "));
      }
    }
  });
}

