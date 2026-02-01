import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { tlonPlugin } from "./src/channel.js";
import { setTlonRuntime } from "./src/runtime.js";
const plugin = { id: "tlon", name: "Tlon", description: "Tlon/Urbit channel plugin", configSchema: emptyPluginConfigSchema(), register: function(api) {
  setTlonRuntime(api.runtime);
  api.registerChannel({ plugin: tlonPlugin });
} };
