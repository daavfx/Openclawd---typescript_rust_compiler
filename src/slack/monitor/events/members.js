import { danger } from "../../../globals.js";
import { enqueueSystemEvent } from "../../../infra/system-events.js";
import { resolveSlackChannelLabel } from "../channel-config.js";
export function registerSlackMemberEvents(params) {
  const {ctx} = params;
  ctx.app.event("member_joined_channel", async ({event, body}) => {
    try {
      {
        if (ctx.shouldDropMismatchedSlackEvent(body)) {
          return;
        }
        const payload = event;
        const channelId = payload.channel;
        const channelInfo = channelId ? await ctx.resolveChannelName(channelId) : {  };
        const channelType = (payload.channel_type ?? channelInfo?.type);
        if (!ctx.isChannelAllowed({ channelId, channelName: channelInfo?.name, channelType })) {
          return;
        }
        const userInfo = payload.user ? await ctx.resolveUserName(payload.user) : {  };
        const userLabel = ((userInfo?.name ?? payload.user) ?? "someone");
        const label = resolveSlackChannelLabel({ channelId, channelName: channelInfo?.name });
        const sessionKey = ctx.resolveSlackSystemEventSessionKey({ channelId, channelType });
        enqueueSystemEvent("Slack:  joined .", { sessionKey, contextKey: "slack:member:joined::" });
      }
    }
    catch (err) {
      {
        ctx.runtime.error?.(danger("slack join handler failed: "));
      }
    }
  });
  ctx.app.event("member_left_channel", async ({event, body}) => {
    try {
      {
        if (ctx.shouldDropMismatchedSlackEvent(body)) {
          return;
        }
        const payload = event;
        const channelId = payload.channel;
        const channelInfo = channelId ? await ctx.resolveChannelName(channelId) : {  };
        const channelType = (payload.channel_type ?? channelInfo?.type);
        if (!ctx.isChannelAllowed({ channelId, channelName: channelInfo?.name, channelType })) {
          return;
        }
        const userInfo = payload.user ? await ctx.resolveUserName(payload.user) : {  };
        const userLabel = ((userInfo?.name ?? payload.user) ?? "someone");
        const label = resolveSlackChannelLabel({ channelId, channelName: channelInfo?.name });
        const sessionKey = ctx.resolveSlackSystemEventSessionKey({ channelId, channelType });
        enqueueSystemEvent("Slack:  left .", { sessionKey, contextKey: "slack:member:left::" });
      }
    }
    catch (err) {
      {
        ctx.runtime.error?.(danger("slack leave handler failed: "));
      }
    }
  });
}

