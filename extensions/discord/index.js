import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { discordPlugin } from "./src/channel.js";
import { setDiscordRuntime } from "./src/runtime.js";
const plugin = { id: "discord", name: "Discord", description: "Discord channel plugin", configSchema: emptyPluginConfigSchema(), register: function(api) {
  setDiscordRuntime(api.runtime);
  api.registerChannel({ plugin: discordPlugin });
} };
