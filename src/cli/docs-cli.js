import { docsSearchCommand } from "../commands/docs.js";
import { defaultRuntime } from "../runtime.js";
import { formatDocsLink } from "../terminal/links.js";
import { theme } from "../terminal/theme.js";
import { runCommandWithRuntime } from "./cli-utils.js";
export function registerDocsCli(program) {
  program.command("docs").description("Search the live OpenClaw docs").argument("[query...]", "Search query").addHelpText("after", () => "
 
").action(async (queryParts) => {
    await runCommandWithRuntime(defaultRuntime, async () => {
      await docsSearchCommand(queryParts, defaultRuntime);
    });
  });
}

