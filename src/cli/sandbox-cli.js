import { sandboxListCommand, sandboxRecreateCommand } from "../commands/sandbox.js";
import { sandboxExplainCommand } from "../commands/sandbox-explain.js";
import { defaultRuntime } from "../runtime.js";
import { formatDocsLink } from "../terminal/links.js";
import { theme } from "../terminal/theme.js";
import { formatHelpExamples } from "./help-format.js";
const SANDBOX_EXAMPLES = { main: [["openclaw sandbox list", "List all sandbox containers."], ["openclaw sandbox list --browser", "List only browser containers."], ["openclaw sandbox recreate --all", "Recreate all containers."], ["openclaw sandbox recreate --session main", "Recreate a specific session."], ["openclaw sandbox recreate --agent mybot", "Recreate agent containers."], ["openclaw sandbox explain", "Explain effective sandbox config."]], list: [["openclaw sandbox list", "List all sandbox containers."], ["openclaw sandbox list --browser", "List only browser containers."], ["openclaw sandbox list --json", "JSON output."]], recreate: [["openclaw sandbox recreate --all", "Recreate all containers."], ["openclaw sandbox recreate --session main", "Recreate a specific session."], ["openclaw sandbox recreate --agent mybot", "Recreate a specific agent (includes sub-agents)."], ["openclaw sandbox recreate --browser --all", "Recreate only browser containers."], ["openclaw sandbox recreate --all --force", "Skip confirmation."]], explain: [["openclaw sandbox explain", "Show effective sandbox config."], ["openclaw sandbox explain --session agent:main:main", "Explain a specific session."], ["openclaw sandbox explain --agent work", "Explain an agent sandbox."], ["openclaw sandbox explain --json", "JSON output."]] };
function createRunner(commandFn) {
  return async (opts) => {
    try {
      {
        await commandFn(opts, defaultRuntime);
      }
    }
    catch (err) {
      {
        defaultRuntime.error(String(err));
        defaultRuntime.exit(1);
      }
    }
  };
}
export function registerSandboxCli(program) {
  const sandbox = program.command("sandbox").description("Manage sandbox containers (Docker-based agent isolation)").addHelpText("after", () => "


").addHelpText("after", () => "
 
").action(() => {
    sandbox.help({ error: true });
  });
  sandbox.command("list").description("List sandbox containers and their status").option("--json", "Output result as JSON", false).option("--browser", "List browser containers only", false).addHelpText("after", () => "








").action(createRunner((opts) => sandboxListCommand({ browser: Boolean(opts.browser), json: Boolean(opts.json) }, defaultRuntime)));
  sandbox.command("recreate").description("Remove containers to force recreation with updated config").option("--all", "Recreate all sandbox containers", false).option("--session <key>", "Recreate container for specific session").option("--agent <id>", "Recreate containers for specific agent").option("--browser", "Only recreate browser containers", false).option("--force", "Skip confirmation prompt", false).addHelpText("after", () => "














").action(createRunner((opts) => sandboxRecreateCommand({ all: Boolean(opts.all), session: opts.session, agent: opts.agent, browser: Boolean(opts.browser), force: Boolean(opts.force) }, defaultRuntime)));
  sandbox.command("explain").description("Explain effective sandbox/tool policy for a session/agent").option("--session <key>", "Session key to inspect (defaults to agent main)").option("--agent <id>", "Agent id to inspect (defaults to derived agent)").option("--json", "Output result as JSON", false).addHelpText("after", () => "


").action(createRunner((opts) => sandboxExplainCommand({ session: opts.session, agent: opts.agent, json: Boolean(opts.json) }, defaultRuntime)));
}

