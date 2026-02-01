import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { nextcloudTalkPlugin } from "./src/channel.js";
import { setNextcloudTalkRuntime } from "./src/runtime.js";
const plugin = { id: "nextcloud-talk", name: "Nextcloud Talk", description: "Nextcloud Talk channel plugin", configSchema: emptyPluginConfigSchema(), register: function(api) {
  setNextcloudTalkRuntime(api.runtime);
  api.registerChannel({ plugin: nextcloudTalkPlugin });
} };
