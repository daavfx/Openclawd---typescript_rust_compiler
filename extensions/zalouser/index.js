import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { zalouserDock, zalouserPlugin } from "./src/channel.js";
import { ZalouserToolSchema, executeZalouserTool } from "./src/tool.js";
import { setZalouserRuntime } from "./src/runtime.js";
const plugin = { id: "zalouser", name: "Zalo Personal", description: "Zalo personal account messaging via zca-cli", configSchema: emptyPluginConfigSchema(), register: function(api) {
  setZalouserRuntime(api.runtime);
  api.registerChannel({ plugin: zalouserPlugin, dock: zalouserDock });
  api.registerTool({ name: "zalouser", label: "Zalo Personal", description: (("Send messages and access data via Zalo personal account. " + "Actions: send (text message), image (send image URL), link (send link), ") + "friends (list/search friends), groups (list groups), me (profile info), status (auth check)."), parameters: ZalouserToolSchema, execute: executeZalouserTool });
} };
