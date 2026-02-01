import { formatDocsLink } from "../../terminal/links.js";
import { theme } from "../../terminal/theme.js";
import { registerCronAddCommand, registerCronListCommand, registerCronStatusCommand } from "./register.cron-add.js";
import { registerCronEditCommand } from "./register.cron-edit.js";
import { registerCronSimpleCommands } from "./register.cron-simple.js";
export function registerCronCli(program) {
  const cron = program.command("cron").description("Manage cron jobs (via Gateway)").addHelpText("after", () => "
 
");
  registerCronStatusCommand(cron);
  registerCronListCommand(cron);
  registerCronAddCommand(cron);
  registerCronSimpleCommands(cron);
  registerCronEditCommand(cron);
}

