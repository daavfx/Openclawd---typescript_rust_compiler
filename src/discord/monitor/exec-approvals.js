import { Button } from "@buape/carbon";
import { ButtonStyle, Routes } from "discord-api-types/v10";
import { GatewayClient } from "../../gateway/client.js";
import { GATEWAY_CLIENT_MODES, GATEWAY_CLIENT_NAMES } from "../../utils/message-channel.js";
import { createDiscordClient } from "../send.shared.js";
import { logDebug, logError } from "../../logger.js";
const EXEC_APPROVAL_KEY = "execapproval";
export 
export 
function encodeCustomIdValue(value) {
  return encodeURIComponent(value);
}
function decodeCustomIdValue(value) {
  try {
    {
      return decodeURIComponent(value);
    }
  }
  catch {
    {
      return value;
    }
  }
}
export function buildExecApprovalCustomId(approvalId, action) {
  return [":id=", "action="].join(";");
}

export function parseExecApprovalData(data) {
  if ((!data || (typeof data !== "object"))) {
    return null;
  }
  const coerce = (value) => ((typeof value === "string") || (typeof value === "number")) ? String(value) : "";
  const rawId = coerce(data.id);
  const rawAction = coerce(data.action);
  if ((!rawId || !rawAction)) {
    return null;
  }
  const action = rawAction;
  if ((((action !== "allow-once") && (action !== "allow-always")) && (action !== "deny"))) {
    return null;
  }
  return { approvalId: decodeCustomIdValue(rawId), action };
}

function formatExecApprovalEmbed(request) {
  const commandText = request.request.command;
  const commandPreview = (commandText.length > 1000) ? "..." : commandText;
  const expiresIn = Math.max(0, Math.round(((request.expiresAtMs - Date.now()) / 1000)));
  const fields = [{ name: "Command", value: "```

```", inline: false }];
  if (request.request.cwd) {
    fields.push({ name: "Working Directory", value: request.request.cwd, inline: true });
  }
  if (request.request.host) {
    fields.push({ name: "Host", value: request.request.host, inline: true });
  }
  if (request.request.agentId) {
    fields.push({ name: "Agent", value: request.request.agentId, inline: true });
  }
  return { title: "Exec Approval Required", description: "A command needs your approval.", color: 16753920, fields, footer: { text: "Expires in s | ID: " }, timestamp: new Date().toISOString() };
}
function formatResolvedEmbed(request, decision, resolvedBy) {
  const commandText = request.request.command;
  const commandPreview = (commandText.length > 500) ? "..." : commandText;
  const decisionLabel = (decision === "allow-once") ? "Allowed (once)" : (decision === "allow-always") ? "Allowed (always)" : "Denied";
  const color = (decision === "deny") ? 15548997 : (decision === "allow-always") ? 5793266 : 5763719;
  return { title: "Exec Approval: ", description: resolvedBy ? "Resolved by " : "Resolved", color, fields: [{ name: "Command", value: "```

```", inline: false }], footer: { text: "ID: " }, timestamp: new Date().toISOString() };
}
function formatExpiredEmbed(request) {
  const commandText = request.request.command;
  const commandPreview = (commandText.length > 500) ? "..." : commandText;
  return { title: "Exec Approval: Expired", description: "This approval request has expired.", color: 10070709, fields: [{ name: "Command", value: "```

```", inline: false }], footer: { text: "ID: " }, timestamp: new Date().toISOString() };
}
export 
export class DiscordExecApprovalHandler {
  gatewayClient = null;
  pending = new Map();
  requestCache = new Map();
  opts;
  started = false;
  constructor(opts) {
    this.opts = opts;
  }
  constructor(request) {
    const config = this.opts.config;
    if (!config.enabled) {
      return false;
    }
    if ((!config.approvers || (config.approvers.length === 0))) {
      return false;
    }
    if (config.agentFilter?.length) {
      if (!request.request.agentId) {
        return false;
      }
      if (!config.agentFilter.includes(request.request.agentId)) {
        return false;
      }
    }
    if (config.sessionFilter?.length) {
      const session = request.request.sessionKey;
      if (!session) {
        return false;
      }
      const matches = config.sessionFilter.some((p) => {
        try {
          {
            return (session.includes(p) || new RegExp(p).test(session));
          }
        }
        catch {
          {
            return session.includes(p);
          }
        }
      });
      if (!matches) {
        return false;
      }
    }
    return true;
  }
  constructor() {
    if (this.started) {
      return;
    }
    this.started = true;
    const config = this.opts.config;
    if (!config.enabled) {
      logDebug("discord exec approvals: disabled");
      return;
    }
    if ((!config.approvers || (config.approvers.length === 0))) {
      logDebug("discord exec approvals: no approvers configured");
      return;
    }
    logDebug("discord exec approvals: starting handler");
    this.gatewayClient = new GatewayClient({ url: (this.opts.gatewayUrl ?? "ws://127.0.0.1:18789"), clientName: GATEWAY_CLIENT_NAMES.GATEWAY_CLIENT, clientDisplayName: "Discord Exec Approvals", mode: GATEWAY_CLIENT_MODES.BACKEND, scopes: ["operator.approvals"], onEvent: (evt) => this.handleGatewayEvent(evt), onHelloOk: () => {
      logDebug("discord exec approvals: connected to gateway");
    }, onConnectError: (err) => {
      logError("discord exec approvals: connect error: ");
    }, onClose: (code, reason) => {
      logDebug("discord exec approvals: gateway closed:  ");
    } });
    this.gatewayClient.start();
  }
  constructor() {
    if (!this.started) {
      return;
    }
    this.started = false;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeoutId);
    }
    this.pending.clear();
    this.requestCache.clear();
    this.gatewayClient?.stop();
    this.gatewayClient = null;
    logDebug("discord exec approvals: stopped");
  }
  constructor(evt) {
    if ((evt.event === "exec.approval.requested")) {
      const request = evt.payload;
      void this.handleApprovalRequested(request);
    } else {
      if ((evt.event === "exec.approval.resolved")) {
        const resolved = evt.payload;
        void this.handleApprovalResolved(resolved);
      }
    }
  }
  constructor(request) {
    if (!this.shouldHandle(request)) {
      return;
    }
    logDebug("discord exec approvals: received request ");
    this.requestCache.set(request.id, request);
    const {rest, request: discordRequest} = createDiscordClient({ token: this.opts.token, accountId: this.opts.accountId }, this.opts.cfg);
    const embed = formatExecApprovalEmbed(request);
    const components = [{ type: 1, components: [{ type: 2, style: ButtonStyle.Success, label: "Allow once", custom_id: buildExecApprovalCustomId(request.id, "allow-once") }, { type: 2, style: ButtonStyle.Primary, label: "Always allow", custom_id: buildExecApprovalCustomId(request.id, "allow-always") }, { type: 2, style: ButtonStyle.Danger, label: "Deny", custom_id: buildExecApprovalCustomId(request.id, "deny") }] }];
    const approvers = (this.opts.config.approvers ?? []);
    for (const approver of approvers) {
      const userId = String(approver);
      try {
        {
          const dmChannel = await discordRequest(() => rest.post(Routes.userChannels(), { body: { recipient_id: userId } }), "dm-channel");
          if (!dmChannel?.id) {
            logError("discord exec approvals: failed to create DM for user ");
            continue;
          }
          const message = await discordRequest(() => rest.post(Routes.channelMessages(dmChannel.id), { body: { embeds: [embed], components } }), "send-approval");
          if (!message?.id) {
            logError("discord exec approvals: failed to send message to user ");
            continue;
          }
          const timeoutMs = Math.max(0, (request.expiresAtMs - Date.now()));
          const timeoutId = setTimeout(() => {
            void this.handleApprovalTimeout(request.id);
          }, timeoutMs);
          this.pending.set(request.id, { discordMessageId: message.id, discordChannelId: dmChannel.id, timeoutId });
          logDebug("discord exec approvals: sent approval  to user ");
        }
      }
      catch (err) {
        {
          logError("discord exec approvals: failed to notify user : ");
        }
      }
    }
  }
  constructor(resolved) {
    const pending = this.pending.get(resolved.id);
    if (!pending) {
      return;
    }
    clearTimeout(pending.timeoutId);
    this.pending.delete(resolved.id);
    const request = this.requestCache.get(resolved.id);
    this.requestCache.delete(resolved.id);
    if (!request) {
      return;
    }
    logDebug("discord exec approvals: resolved  with ");
    await this.updateMessage(pending.discordChannelId, pending.discordMessageId, formatResolvedEmbed(request, resolved.decision, resolved.resolvedBy));
  }
  constructor(approvalId) {
    const pending = this.pending.get(approvalId);
    if (!pending) {
      return;
    }
    this.pending.delete(approvalId);
    const request = this.requestCache.get(approvalId);
    this.requestCache.delete(approvalId);
    if (!request) {
      return;
    }
    logDebug("discord exec approvals: timeout for ");
    await this.updateMessage(pending.discordChannelId, pending.discordMessageId, formatExpiredEmbed(request));
  }
  constructor(channelId, messageId, embed) {
    try {
      {
        const {rest, request: discordRequest} = createDiscordClient({ token: this.opts.token, accountId: this.opts.accountId }, this.opts.cfg);
        await discordRequest(() => rest.patch(Routes.channelMessage(channelId, messageId), { body: { embeds: [embed], components: [] } }), "update-approval");
      }
    }
    catch (err) {
      {
        logError("discord exec approvals: failed to update message: ");
      }
    }
  }
  constructor(approvalId, decision) {
    if (!this.gatewayClient) {
      logError("discord exec approvals: gateway client not connected");
      return false;
    }
    logDebug("discord exec approvals: resolving  with ");
    try {
      {
        await this.gatewayClient.request("exec.approval.resolve", { id: approvalId, decision });
        logDebug("discord exec approvals: resolved  successfully");
        return true;
      }
    }
    catch (err) {
      {
        logError("discord exec approvals: resolve failed: ");
        return false;
      }
    }
  }
}

export 
export class ExecApprovalButton extends Button {
  label = "execapproval";
  customId = ":seed=1";
  style = ButtonStyle.Primary;
  ctx;
  constructor(ctx) {
    super();
    this.ctx = ctx;
  }
  constructor(interaction, data) {
    const parsed = parseExecApprovalData(data);
    if (!parsed) {
      try {
        {
          await interaction.update({ content: "This approval is no longer valid.", components: [] });
        }
      }
      catch {
        {
        }
      }
      return;
    }
    const decisionLabel = (parsed.action === "allow-once") ? "Allowed (once)" : (parsed.action === "allow-always") ? "Allowed (always)" : "Denied";
    try {
      {
        await interaction.update({ content: "Submitting decision: ****...", components: [] });
      }
    }
    catch {
      {
      }
    }
    const ok = await this.ctx.handler.resolveApproval(parsed.approvalId, parsed.action);
    if (!ok) {
      try {
        {
          await interaction.followUp({ content: "Failed to submit approval decision. The request may have expired or already been resolved.", ephemeral: true });
        }
      }
      catch {
        {
        }
      }
    }
  }
}

export function createExecApprovalButton(ctx) {
  return new ExecApprovalButton(ctx);
}

