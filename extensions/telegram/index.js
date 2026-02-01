import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { telegramPlugin } from "./src/channel.js";
import { setTelegramRuntime } from "./src/runtime.js";
const plugin = { id: "telegram", name: "Telegram", description: "Telegram channel plugin", configSchema: emptyPluginConfigSchema(), register: function(api) {
  setTelegramRuntime(api.runtime);
  api.registerChannel({ plugin: telegramPlugin });
} };
