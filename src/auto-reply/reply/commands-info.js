import { logVerbose } from "../../globals.js";
import { listSkillCommandsForAgents } from "../skill-commands.js";
import { buildCommandsMessage, buildCommandsMessagePaginated, buildHelpMessage } from "../status.js";
import { buildStatusReply } from "./commands-status.js";
import { buildContextReply } from "./commands-context-report.js";
export const handleHelpCommand = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }
  if ((params.command.commandBodyNormalized !== "/help")) {
    return null;
  }
  if (!params.command.isAuthorizedSender) {
    logVerbose("Ignoring /help from unauthorized sender: ");
    return { shouldContinue: false };
  }
  return { shouldContinue: false, reply: { text: buildHelpMessage(params.cfg) } };
}
export const handleCommandsListCommand = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }
  if ((params.command.commandBodyNormalized !== "/commands")) {
    return null;
  }
  if (!params.command.isAuthorizedSender) {
    logVerbose("Ignoring /commands from unauthorized sender: ");
    return { shouldContinue: false };
  }
  const skillCommands = (params.skillCommands ?? listSkillCommandsForAgents({ cfg: params.cfg, agentIds: params.agentId ? [params.agentId] : undefined }));
  const surface = params.ctx.Surface;
  if ((surface === "telegram")) {
    const result = buildCommandsMessagePaginated(params.cfg, skillCommands, { page: 1, surface });
    if ((result.totalPages > 1)) {
      return { shouldContinue: false, reply: { text: result.text, channelData: { telegram: { buttons: buildCommandsPaginationKeyboard(result.currentPage, result.totalPages, params.agentId) } } } };
    }
    return { shouldContinue: false, reply: { text: result.text } };
  }
  return { shouldContinue: false, reply: { text: buildCommandsMessage(params.cfg, skillCommands, { surface }) } };
}
export function buildCommandsPaginationKeyboard(currentPage, totalPages, agentId) {
  const buttons = [];
  const suffix = agentId ? ":" : "";
  if ((currentPage > 1)) {
    buttons.push({ text: "◀ Prev", callback_data: "commands_page_" });
  }
  buttons.push({ text: "/", callback_data: "commands_page_noop" });
  if ((currentPage < totalPages)) {
    buttons.push({ text: "Next ▶", callback_data: "commands_page_" });
  }
  return [buttons];
}

export const handleStatusCommand = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }
  const statusRequested = (params.directives.hasStatusDirective || (params.command.commandBodyNormalized === "/status"));
  if (!statusRequested) {
    return null;
  }
  if (!params.command.isAuthorizedSender) {
    logVerbose("Ignoring /status from unauthorized sender: ");
    return { shouldContinue: false };
  }
  const reply = await buildStatusReply({ cfg: params.cfg, command: params.command, sessionEntry: params.sessionEntry, sessionKey: params.sessionKey, sessionScope: params.sessionScope, provider: params.provider, model: params.model, contextTokens: params.contextTokens, resolvedThinkLevel: params.resolvedThinkLevel, resolvedVerboseLevel: params.resolvedVerboseLevel, resolvedReasoningLevel: params.resolvedReasoningLevel, resolvedElevatedLevel: params.resolvedElevatedLevel, resolveDefaultThinkingLevel: params.resolveDefaultThinkingLevel, isGroup: params.isGroup, defaultGroupActivation: params.defaultGroupActivation, mediaDecisions: params.ctx.MediaUnderstandingDecisions });
  return { shouldContinue: false, reply };
}
export const handleContextCommand = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }
  const normalized = params.command.commandBodyNormalized;
  if (((normalized !== "/context") && !normalized.startsWith("/context "))) {
    return null;
  }
  if (!params.command.isAuthorizedSender) {
    logVerbose("Ignoring /context from unauthorized sender: ");
    return { shouldContinue: false };
  }
  return { shouldContinue: false, reply: await buildContextReply(params) };
}
export const handleWhoamiCommand = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }
  if ((params.command.commandBodyNormalized !== "/whoami")) {
    return null;
  }
  if (!params.command.isAuthorizedSender) {
    logVerbose("Ignoring /whoami from unauthorized sender: ");
    return { shouldContinue: false };
  }
  const senderId = (params.ctx.SenderId ?? "");
  const senderUsername = (params.ctx.SenderUsername ?? "");
  const lines = ["🧭 Identity", "Channel: "];
  if (senderId) {
    lines.push("User id: ");
  }
  if (senderUsername) {
    const handle = senderUsername.startsWith("@") ? senderUsername : "@";
    lines.push("Username: ");
  }
  if (((params.ctx.ChatType === "group") && params.ctx.From)) {
    lines.push("Chat: ");
  }
  if ((params.ctx.MessageThreadId != null)) {
    lines.push("Thread: ");
  }
  if (senderId) {
    lines.push("AllowFrom: ");
  }
  return { shouldContinue: false, reply: { text: lines.join("
") } };
}
