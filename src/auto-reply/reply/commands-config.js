import { readConfigFileSnapshot, validateConfigObjectWithPlugins, writeConfigFile } from "../../config/config.js";
import { getConfigValueAtPath, parseConfigPath, setConfigValueAtPath, unsetConfigValueAtPath } from "../../config/config-paths.js";
import { getConfigOverrides, resetConfigOverrides, setConfigOverride, unsetConfigOverride } from "../../config/runtime-overrides.js";
import { resolveChannelConfigWrites } from "../../channels/plugins/config-writes.js";
import { normalizeChannelId } from "../../channels/registry.js";
import { logVerbose } from "../../globals.js";
import { parseConfigCommand } from "./config-commands.js";
import { parseDebugCommand } from "./debug-commands.js";
export const handleConfigCommand = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }
  const configCommand = parseConfigCommand(params.command.commandBodyNormalized);
  if (!configCommand) {
    return null;
  }
  if (!params.command.isAuthorizedSender) {
    logVerbose("Ignoring /config from unauthorized sender: ");
    return { shouldContinue: false };
  }
  if ((params.cfg.commands?.config !== true)) {
    return { shouldContinue: false, reply: { text: "⚠️ /config is disabled. Set commands.config=true to enable." } };
  }
  if ((configCommand.action === "error")) {
    return { shouldContinue: false, reply: { text: "⚠️ " } };
  }
  if (((configCommand.action === "set") || (configCommand.action === "unset"))) {
    const channelId = (params.command.channelId ?? normalizeChannelId(params.command.channel));
    const allowWrites = resolveChannelConfigWrites({ cfg: params.cfg, channelId, accountId: params.ctx.AccountId });
    if (!allowWrites) {
      const channelLabel = (channelId ?? "this channel");
      const hint = channelId ? "channels..configWrites=true" : "channels.<channel>.configWrites=true";
      return { shouldContinue: false, reply: { text: "⚠️ Config writes are disabled for . Set  to enable." } };
    }
  }
  const snapshot = await readConfigFileSnapshot();
  if (((!snapshot.valid || !snapshot.parsed) || (typeof snapshot.parsed !== "object"))) {
    return { shouldContinue: false, reply: { text: "⚠️ Config file is invalid; fix it before using /config." } };
  }
  const parsedBase = structuredClone(snapshot.parsed);
  if ((configCommand.action === "show")) {
    const pathRaw = configCommand.path?.trim();
    if (pathRaw) {
      const parsedPath = parseConfigPath(pathRaw);
      if ((!parsedPath.ok || !parsedPath.path)) {
        return { shouldContinue: false, reply: { text: "⚠️ " } };
      }
      const value = getConfigValueAtPath(parsedBase, parsedPath.path);
      const rendered = JSON.stringify((value ?? null), null, 2);
      return { shouldContinue: false, reply: { text: "⚙️ Config :
```json

```" } };
    }
    const json = JSON.stringify(parsedBase, null, 2);
    return { shouldContinue: false, reply: { text: "⚙️ Config (raw):
```json

```" } };
  }
  if ((configCommand.action === "unset")) {
    const parsedPath = parseConfigPath(configCommand.path);
    if ((!parsedPath.ok || !parsedPath.path)) {
      return { shouldContinue: false, reply: { text: "⚠️ " } };
    }
    const removed = unsetConfigValueAtPath(parsedBase, parsedPath.path);
    if (!removed) {
      return { shouldContinue: false, reply: { text: "⚙️ No config value found for ." } };
    }
    const validated = validateConfigObjectWithPlugins(parsedBase);
    if (!validated.ok) {
      const issue = validated.issues[0];
      return { shouldContinue: false, reply: { text: "⚠️ Config invalid after unset (: )." } };
    }
    await writeConfigFile(validated.config);
    return { shouldContinue: false, reply: { text: "⚙️ Config updated:  removed." } };
  }
  if ((configCommand.action === "set")) {
    const parsedPath = parseConfigPath(configCommand.path);
    if ((!parsedPath.ok || !parsedPath.path)) {
      return { shouldContinue: false, reply: { text: "⚠️ " } };
    }
    setConfigValueAtPath(parsedBase, parsedPath.path, configCommand.value);
    const validated = validateConfigObjectWithPlugins(parsedBase);
    if (!validated.ok) {
      const issue = validated.issues[0];
      return { shouldContinue: false, reply: { text: "⚠️ Config invalid after set (: )." } };
    }
    await writeConfigFile(validated.config);
    const valueLabel = (typeof configCommand.value === "string") ? "\"\"" : JSON.stringify(configCommand.value);
    return { shouldContinue: false, reply: { text: "⚙️ Config updated: =" } };
  }
  return null;
}
export const handleDebugCommand = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }
  const debugCommand = parseDebugCommand(params.command.commandBodyNormalized);
  if (!debugCommand) {
    return null;
  }
  if (!params.command.isAuthorizedSender) {
    logVerbose("Ignoring /debug from unauthorized sender: ");
    return { shouldContinue: false };
  }
  if ((params.cfg.commands?.debug !== true)) {
    return { shouldContinue: false, reply: { text: "⚠️ /debug is disabled. Set commands.debug=true to enable." } };
  }
  if ((debugCommand.action === "error")) {
    return { shouldContinue: false, reply: { text: "⚠️ " } };
  }
  if ((debugCommand.action === "show")) {
    const overrides = getConfigOverrides();
    const hasOverrides = (Object.keys(overrides).length > 0);
    if (!hasOverrides) {
      return { shouldContinue: false, reply: { text: "⚙️ Debug overrides: (none)" } };
    }
    const json = JSON.stringify(overrides, null, 2);
    return { shouldContinue: false, reply: { text: "⚙️ Debug overrides (memory-only):
```json

```" } };
  }
  if ((debugCommand.action === "reset")) {
    resetConfigOverrides();
    return { shouldContinue: false, reply: { text: "⚙️ Debug overrides cleared; using config on disk." } };
  }
  if ((debugCommand.action === "unset")) {
    const result = unsetConfigOverride(debugCommand.path);
    if (!result.ok) {
      return { shouldContinue: false, reply: { text: "⚠️ " } };
    }
    if (!result.removed) {
      return { shouldContinue: false, reply: { text: "⚙️ No debug override found for ." } };
    }
    return { shouldContinue: false, reply: { text: "⚙️ Debug override removed for ." } };
  }
  if ((debugCommand.action === "set")) {
    const result = setConfigOverride(debugCommand.path, debugCommand.value);
    if (!result.ok) {
      return { shouldContinue: false, reply: { text: "⚠️ " } };
    }
    const valueLabel = (typeof debugCommand.value === "string") ? "\"\"" : JSON.stringify(debugCommand.value);
    return { shouldContinue: false, reply: { text: "⚙️ Debug override set: =" } };
  }
  return null;
}
