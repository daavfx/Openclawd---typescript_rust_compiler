import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { twitchPlugin } from "./src/plugin.js";
import { setTwitchRuntime } from "./src/runtime.js";
export { monitorTwitchProvider } from "./src/monitor.js";
const plugin = { id: "twitch", name: "Twitch", description: "Twitch channel plugin", configSchema: emptyPluginConfigSchema(), register: function(api) {
  setTwitchRuntime(api.runtime);
  api.registerChannel({ plugin: twitchPlugin });
} };
