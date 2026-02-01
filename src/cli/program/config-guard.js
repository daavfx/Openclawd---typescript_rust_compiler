import { readConfigFileSnapshot } from "../../config/config.js";
import { loadAndMaybeMigrateDoctorConfig } from "../../commands/doctor-config-flow.js";
import { colorize, isRich, theme } from "../../terminal/theme.js";
import { formatCliCommand } from "../command-format.js";
import { shortenHomePath } from "../../utils.js";
const ALLOWED_INVALID_COMMANDS = new Set(["doctor", "logs", "health", "help", "status"]);
const ALLOWED_INVALID_GATEWAY_SUBCOMMANDS = new Set(["status", "probe", "health", "discover", "call", "install", "uninstall", "start", "stop", "restart"]);
let didRunDoctorConfigFlow = false;
function formatConfigIssues(issues) {
  return issues.map((issue) => "- : ");
}
export async function ensureConfigReady(params) {
  if (!didRunDoctorConfigFlow) {
    didRunDoctorConfigFlow = true;
    await loadAndMaybeMigrateDoctorConfig({ options: { nonInteractive: true }, confirm: async () => false });
  }
  const snapshot = await readConfigFileSnapshot();
  const commandName = params.commandPath?.[0];
  const subcommandName = params.commandPath?.[1];
  const allowInvalid = commandName ? (ALLOWED_INVALID_COMMANDS.has(commandName) || (((commandName === "gateway") && subcommandName) && ALLOWED_INVALID_GATEWAY_SUBCOMMANDS.has(subcommandName))) : false;
  const issues = (snapshot.exists && !snapshot.valid) ? formatConfigIssues(snapshot.issues) : [];
  const legacyIssues = (snapshot.legacyIssues.length > 0) ? snapshot.legacyIssues.map((issue) => "- : ") : [];
  const invalid = (snapshot.exists && !snapshot.valid);
  if (!invalid) {
    return;
  }
  const rich = isRich();
  const muted = (value) => colorize(rich, theme.muted, value);
  const error = (value) => colorize(rich, theme.error, value);
  const heading = (value) => colorize(rich, theme.heading, value);
  const commandText = (value) => colorize(rich, theme.command, value);
  params.runtime.error(heading("Config invalid"));
  params.runtime.error(" ");
  if ((issues.length > 0)) {
    params.runtime.error(muted("Problem:"));
    params.runtime.error(issues.map((issue) => "  ").join("
"));
  }
  if ((legacyIssues.length > 0)) {
    params.runtime.error(muted("Legacy config keys detected:"));
    params.runtime.error(legacyIssues.map((issue) => "  ").join("
"));
  }
  params.runtime.error("");
  params.runtime.error(" ");
  if (!allowInvalid) {
    params.runtime.exit(1);
  }
}

