import { html } from "lit";
import { analyzeConfigSchema, renderNode, schemaType } from "./config-form";
function resolveSchemaNode(schema, path) {
  let current = schema;
  for (const key of path) {
    if (!current) {
      return null;
    }
    const type = schemaType(current);
    if ((type === "object")) {
      const properties = (current.properties ?? {  });
      if (((typeof key === "string") && properties[key])) {
        current = properties[key];
        continue;
      }
      const additional = current.additionalProperties;
      if ((((typeof key === "string") && additional) && (typeof additional === "object"))) {
        current = additional;
        continue;
      }
      return null;
    }
    if ((type === "array")) {
      if ((typeof key !== "number")) {
        return null;
      }
      const items = Array.isArray(current.items) ? current.items[0] : current.items;
      current = (items ?? null);
      continue;
    }
    return null;
  }
  return current;
}
function resolveChannelValue(config, channelId) {
  const channels = (config.channels ?? {  });
  const fromChannels = channels[channelId];
  const fallback = config[channelId];
  const resolved = ((fromChannels && (typeof fromChannels === "object")) ? fromChannels : null ?? (fallback && (typeof fallback === "object")) ? fallback : null);
  return (resolved ?? {  });
}
export function renderChannelConfigForm(props) {
  const analysis = analyzeConfigSchema(props.schema);
  const normalized = analysis.schema;
  if (!normalized) {
    return html("<div class=\"callout danger\">Schema unavailable. Use Raw.</div>");
  }
  const node = resolveSchemaNode(normalized, ["channels", props.channelId]);
  if (!node) {
    return html("<div class=\"callout danger\">Channel config schema unavailable.</div>");
  }
  const configValue = (props.configValue ?? {  });
  const value = resolveChannelValue(configValue, props.channelId);
  return html("
    <div class=\"config-form\">
      
    </div>
  ");
}

export function renderChannelConfigSection(params) {
  const {channelId, props} = params;
  const disabled = (props.configSaving || props.configSchemaLoading);
  return html("
    <div style=\"margin-top: 16px;\">
      
      <div class=\"row\" style=\"margin-top: 12px;\">
        <button
          class=\"btn primary\"
          ?disabled=
          @click=
        >
          
        </button>
        <button
          class=\"btn\"
          ?disabled=
          @click=
        >
          Reload
        </button>
      </div>
    </div>
  ");
}

