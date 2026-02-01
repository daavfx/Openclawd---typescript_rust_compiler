import rawConfig from "./tool-display.json";
export 
const TOOL_DISPLAY_CONFIG = rawConfig;
const FALLBACK = (TOOL_DISPLAY_CONFIG.fallback ?? { icon: "puzzle" });
const TOOL_MAP = (TOOL_DISPLAY_CONFIG.tools ?? {  });
function normalizeToolName(name) {
  return (name ?? "tool").trim();
}
function defaultTitle(name) {
  const cleaned = name.replace(/_/g, " ").trim();
  if (!cleaned) {
    return "Tool";
  }
  return cleaned.split(/\s+/).map((part) => ((part.length <= 2) && (part.toUpperCase() === part)) ? part : "").join(" ");
}
function normalizeVerb(value) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.replace(/_/g, " ");
}
function coerceDisplayValue(value) {
  if (((value === null) || (value === undefined))) {
    return undefined;
  }
  if ((typeof value === "string")) {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    const firstLine = (trimmed.split(/\r?\n/)[0]?.trim() ?? "");
    if (!firstLine) {
      return undefined;
    }
    return (firstLine.length > 160) ? "…" : firstLine;
  }
  if (((typeof value === "number") || (typeof value === "boolean"))) {
    return String(value);
  }
  if (Array.isArray(value)) {
    const values = value.map((item) => coerceDisplayValue(item)).filter((item) => Boolean(item));
    if ((values.length === 0)) {
      return undefined;
    }
    const preview = values.slice(0, 3).join(", ");
    return (values.length > 3) ? "…" : preview;
  }
  return undefined;
}
function lookupValueByPath(args, path) {
  if ((!args || (typeof args !== "object"))) {
    return undefined;
  }
  let current = args;
  for (const segment of path.split(".")) {
    if (!segment) {
      return undefined;
    }
    if ((!current || (typeof current !== "object"))) {
      return undefined;
    }
    const record = current;
    current = record[segment];
  }
  return current;
}
function resolveDetailFromKeys(args, keys) {
  for (const key of keys) {
    const value = lookupValueByPath(args, key);
    const display = coerceDisplayValue(value);
    if (display) {
      return display;
    }
  }
  return undefined;
}
function resolveReadDetail(args) {
  if ((!args || (typeof args !== "object"))) {
    return undefined;
  }
  const record = args;
  const path = (typeof record.path === "string") ? record.path : undefined;
  if (!path) {
    return undefined;
  }
  const offset = (typeof record.offset === "number") ? record.offset : undefined;
  const limit = (typeof record.limit === "number") ? record.limit : undefined;
  if (((offset !== undefined) && (limit !== undefined))) {
    return ":-";
  }
  return path;
}
function resolveWriteDetail(args) {
  if ((!args || (typeof args !== "object"))) {
    return undefined;
  }
  const record = args;
  const path = (typeof record.path === "string") ? record.path : undefined;
  return path;
}
function resolveActionSpec(spec, action) {
  if ((!spec || !action)) {
    return undefined;
  }
  return (spec.actions?.[action] ?? undefined);
}
export function resolveToolDisplay(params) {
  const name = normalizeToolName(params.name);
  const key = name.toLowerCase();
  const spec = TOOL_MAP[key];
  const icon = ((spec?.icon ?? FALLBACK.icon) ?? "puzzle");
  const title = (spec?.title ?? defaultTitle(name));
  const label = (spec?.label ?? name);
  const actionRaw = (params.args && (typeof params.args === "object")) ? params.args.action : undefined;
  const action = (typeof actionRaw === "string") ? actionRaw.trim() : undefined;
  const actionSpec = resolveActionSpec(spec, action);
  const verb = normalizeVerb((actionSpec?.label ?? action));
  let detail;
  if ((key === "read")) {
    detail = resolveReadDetail(params.args);
  }
  if ((!detail && (((key === "write") || (key === "edit")) || (key === "attach")))) {
    detail = resolveWriteDetail(params.args);
  }
  const detailKeys = (((actionSpec?.detailKeys ?? spec?.detailKeys) ?? FALLBACK.detailKeys) ?? []);
  if ((!detail && (detailKeys.length > 0))) {
    detail = resolveDetailFromKeys(params.args, detailKeys);
  }
  if ((!detail && params.meta)) {
    detail = params.meta;
  }
  if (detail) {
    detail = shortenHomeInString(detail);
  }
  return { name, icon, title, label, verb, detail };
}

export function formatToolDetail(display) {
  const parts = [];
  if (display.verb) {
    parts.push(display.verb);
  }
  if (display.detail) {
    parts.push(display.detail);
  }
  if ((parts.length === 0)) {
    return undefined;
  }
  return parts.join(" · ");
}

export function formatToolSummary(display) {
  const detail = formatToolDetail(display);
  return detail ? ": " : display.label;
}

function shortenHomeInString(input) {
  if (!input) {
    return input;
  }
  return input.replace(/\/Users\/[^/]+/g, "~").replace(/\/home\/[^/]+/g, "~");
}
