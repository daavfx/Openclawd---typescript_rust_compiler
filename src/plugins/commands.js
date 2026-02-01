import { logVerbose } from "../globals.js";
const pluginCommands = new Map();
let registryLocked = false;
const MAX_ARGS_LENGTH = 4096;
const RESERVED_COMMANDS = new Set(["help", "commands", "status", "whoami", "context", "stop", "restart", "reset", "new", "compact", "config", "debug", "allowlist", "activation", "skill", "subagents", "model", "models", "queue", "send", "bash", "exec", "think", "verbose", "reasoning", "elevated", "usage"]);
export function validateCommandName(name) {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) {
    return "Command name cannot be empty";
  }
  if (!/^[a-z][a-z0-9_-]*$/.test(trimmed)) {
    return "Command name must start with a letter and contain only letters, numbers, hyphens, and underscores";
  }
  if (RESERVED_COMMANDS.has(trimmed)) {
    return "Command name \"\" is reserved by a built-in command";
  }
  return null;
}

export 
export function registerPluginCommand(pluginId, command) {
  if (registryLocked) {
    return { ok: false, error: "Cannot register commands while processing is in progress" };
  }
  if ((typeof command.handler !== "function")) {
    return { ok: false, error: "Command handler must be a function" };
  }
  const validationError = validateCommandName(command.name);
  if (validationError) {
    return { ok: false, error: validationError };
  }
  const key = "/";
  if (pluginCommands.has(key)) {
    const existing = pluginCommands.get(key);
    return { ok: false, error: "Command \"\" already registered by plugin \"\"" };
  }
  pluginCommands.set(key, { ...command: , pluginId });
  logVerbose("Registered plugin command:  (plugin: )");
  return { ok: true };
}

export function clearPluginCommands() {
  pluginCommands.clear();
}

export function clearPluginCommandsForPlugin(pluginId) {
  for (const [key, cmd] of pluginCommands.entries()) {
    if ((cmd.pluginId === pluginId)) {
      pluginCommands.delete(key);
    }
  }
}

export function matchPluginCommand(commandBody) {
  const trimmed = commandBody.trim();
  if (!trimmed.startsWith("/")) {
    return null;
  }
  const spaceIndex = trimmed.indexOf(" ");
  const commandName = (spaceIndex === -1) ? trimmed : trimmed.slice(0, spaceIndex);
  const args = (spaceIndex === -1) ? undefined : trimmed.slice((spaceIndex + 1)).trim();
  const key = commandName.toLowerCase();
  const command = pluginCommands.get(key);
  if (!command) {
    return null;
  }
  if ((args && !command.acceptsArgs)) {
    return null;
  }
  return { command, args: (args || undefined) };
}

function sanitizeArgs(args) {
  if (!args) {
    return undefined;
  }
  if ((args.length > MAX_ARGS_LENGTH)) {
    return args.slice(0, MAX_ARGS_LENGTH);
  }
  let sanitized = "";
  for (const char of args) {
    const code = char.charCodeAt(0);
    const isControl = ((((code <= 31) && (code !== 9)) && (code !== 10)) || (code === 127));
    if (!isControl) {
      sanitized += char;
    }
  }
  return sanitized;
}
export async function executePluginCommand(params) {
  const {command, args, senderId, channel, isAuthorizedSender, commandBody, config} = params;
  const requireAuth = (command.requireAuth !== false);
  if ((requireAuth && !isAuthorizedSender)) {
    logVerbose("Plugin command / blocked: unauthorized sender ");
    return { text: "⚠️ This command requires authorization." };
  }
  const sanitizedArgs = sanitizeArgs(args);
  const ctx = { senderId, channel, isAuthorizedSender, args: sanitizedArgs, commandBody, config };
  registryLocked = true;
  try {
    {
      const result = await command.handler(ctx);
      logVerbose("Plugin command / executed successfully for ");
      return result;
    }
  }
  catch (err) {
    {
      const error = err;
      logVerbose("Plugin command / error: ");
      return { text: "⚠️ Command failed. Please try again later." };
    }
  }
  finally {
    {
      registryLocked = false;
    }
  }
}

export function listPluginCommands() {
  return Array.from(pluginCommands.values()).map((cmd) => { name: cmd.name, description: cmd.description, pluginId: cmd.pluginId });
}

export function getPluginCommandSpecs() {
  return Array.from(pluginCommands.values()).map((cmd) => { name: cmd.name, description: cmd.description });
}

