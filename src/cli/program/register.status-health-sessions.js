import { healthCommand } from "../../commands/health.js";
import { sessionsCommand } from "../../commands/sessions.js";
import { statusCommand } from "../../commands/status.js";
import { setVerbose } from "../../globals.js";
import { defaultRuntime } from "../../runtime.js";
import { formatDocsLink } from "../../terminal/links.js";
import { theme } from "../../terminal/theme.js";
import { runCommandWithRuntime } from "../cli-utils.js";
import { formatHelpExamples } from "../help-format.js";
import { parsePositiveIntOrUndefined } from "./helpers.js";
function resolveVerbose(opts) {
  return Boolean((opts.verbose || opts.debug));
}
function parseTimeoutMs(timeout) {
  const parsed = parsePositiveIntOrUndefined(timeout);
  if (((timeout !== undefined) && (parsed === undefined))) {
    defaultRuntime.error("--timeout must be a positive integer (milliseconds)");
    defaultRuntime.exit(1);
    return null;
  }
  return parsed;
}
export function registerStatusHealthSessionsCommands(program) {
  program.command("status").description("Show channel health and recent session recipients").option("--json", "Output JSON instead of text", false).option("--all", "Full diagnosis (read-only, pasteable)", false).option("--usage", "Show model provider usage/quota snapshots", false).option("--deep", "Probe channels (WhatsApp Web + Telegram + Discord + Slack + Signal)", false).option("--timeout <ms>", "Probe timeout in milliseconds", "10000").option("--verbose", "Verbose logging", false).option("--debug", "Alias for --verbose", false).addHelpText("after", () => "

").addHelpText("after", () => "
 
").action(async (opts) => {
    const verbose = resolveVerbose(opts);
    setVerbose(verbose);
    const timeout = parseTimeoutMs(opts.timeout);
    if ((timeout === null)) {
      return;
    }
    await runCommandWithRuntime(defaultRuntime, async () => {
      await statusCommand({ json: Boolean(opts.json), all: Boolean(opts.all), deep: Boolean(opts.deep), usage: Boolean(opts.usage), timeoutMs: timeout, verbose }, defaultRuntime);
    });
  });
  program.command("health").description("Fetch health from the running gateway").option("--json", "Output JSON instead of text", false).option("--timeout <ms>", "Connection timeout in milliseconds", "10000").option("--verbose", "Verbose logging", false).option("--debug", "Alias for --verbose", false).addHelpText("after", () => "
 
").action(async (opts) => {
    const verbose = resolveVerbose(opts);
    setVerbose(verbose);
    const timeout = parseTimeoutMs(opts.timeout);
    if ((timeout === null)) {
      return;
    }
    await runCommandWithRuntime(defaultRuntime, async () => {
      await healthCommand({ json: Boolean(opts.json), timeoutMs: timeout, verbose }, defaultRuntime);
    });
  });
  program.command("sessions").description("List stored conversation sessions").option("--json", "Output as JSON", false).option("--verbose", "Verbose logging", false).option("--store <path>", "Path to session store (default: resolved from config)").option("--active <minutes>", "Only show sessions updated within the past N minutes").addHelpText("after", () => "



").addHelpText("after", () => "
 
").action(async (opts) => {
    setVerbose(Boolean(opts.verbose));
    await sessionsCommand({ json: Boolean(opts.json), store: opts.store, active: opts.active }, defaultRuntime);
  });
}

