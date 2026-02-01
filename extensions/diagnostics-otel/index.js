import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { createDiagnosticsOtelService } from "./src/service.js";
const plugin = { id: "diagnostics-otel", name: "Diagnostics OpenTelemetry", description: "Export diagnostics events to OpenTelemetry", configSchema: emptyPluginConfigSchema(), register: function(api) {
  api.registerService(createDiagnosticsOtelService());
} };
