export 
function normalizeArgValue(value) {
  if ((value == null)) {
    return undefined;
  }
  let text;
  if ((typeof value === "string")) {
    text = value.trim();
  } else {
    if ((((typeof value === "number") || (typeof value === "boolean")) || (typeof value === "bigint"))) {
      text = String(value).trim();
    } else {
      if ((typeof value === "symbol")) {
        text = value.toString().trim();
      } else {
        if ((typeof value === "function")) {
          text = value.toString().trim();
        } else {
          text = JSON.stringify(value);
        }
      }
    }
  }
  return text ? text : undefined;
}
const formatConfigArgs = (values) => {
  const action = normalizeArgValue(values.action)?.toLowerCase();
  const path = normalizeArgValue(values.path);
  const value = normalizeArgValue(values.value);
  if (!action) {
    return undefined;
  }
  if (((action === "show") || (action === "get"))) {
    return path ? " " : action;
  }
  if ((action === "unset")) {
    return path ? " " : action;
  }
  if ((action === "set")) {
    if (!path) {
      return action;
    }
    if (!value) {
      return " ";
    }
    return " =";
  }
  return action;
};
const formatDebugArgs = (values) => {
  const action = normalizeArgValue(values.action)?.toLowerCase();
  const path = normalizeArgValue(values.path);
  const value = normalizeArgValue(values.value);
  if (!action) {
    return undefined;
  }
  if (((action === "show") || (action === "reset"))) {
    return action;
  }
  if ((action === "unset")) {
    return path ? " " : action;
  }
  if ((action === "set")) {
    if (!path) {
      return action;
    }
    if (!value) {
      return " ";
    }
    return " =";
  }
  return action;
};
const formatQueueArgs = (values) => {
  const mode = normalizeArgValue(values.mode);
  const debounce = normalizeArgValue(values.debounce);
  const cap = normalizeArgValue(values.cap);
  const drop = normalizeArgValue(values.drop);
  const parts = [];
  if (mode) {
    parts.push(mode);
  }
  if (debounce) {
    parts.push("debounce:");
  }
  if (cap) {
    parts.push("cap:");
  }
  if (drop) {
    parts.push("drop:");
  }
  return (parts.length > 0) ? parts.join(" ") : undefined;
};
export const COMMAND_ARG_FORMATTERS = { config: formatConfigArgs, debug: formatDebugArgs, queue: formatQueueArgs }
