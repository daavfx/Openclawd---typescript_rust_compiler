import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { whatsappPlugin } from "./src/channel.js";
import { setWhatsAppRuntime } from "./src/runtime.js";
const plugin = { id: "whatsapp", name: "WhatsApp", description: "WhatsApp channel plugin", configSchema: emptyPluginConfigSchema(), register: function(api) {
  setWhatsAppRuntime(api.runtime);
  api.registerChannel({ plugin: whatsappPlugin });
} };
