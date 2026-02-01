import { createRequire } from "node:module";
const requireConfig = createRequire(import.meta.url);
export 
const DEFAULT_REDACT_MODE = "tools";
const DEFAULT_REDACT_MIN_LENGTH = 18;
const DEFAULT_REDACT_KEEP_START = 6;
const DEFAULT_REDACT_KEEP_END = 4;
const DEFAULT_REDACT_PATTERNS = [String.raw("b[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD)bs*[=:]s*([\"']?)([^s\"'\\]+)1"), String.raw("\"(?:apiKey|token|secret|password|passwd|accessToken|refreshToken)\"s*:s*\"([^\"]+)\""), String.raw("--(?:api[-_]?key|token|secret|password|passwd)s+([\"']?)([^s\"']+)1"), String.raw("Authorizations*[:=]s*Bearers+([A-Za-z0-9._-+=]+)"), String.raw("bBearers+([A-Za-z0-9._-+=]{18,})b"), String.raw("-----BEGIN [A-Z ]*PRIVATE KEY-----[sS]+?-----END [A-Z ]*PRIVATE KEY-----"), String.raw("b(sk-[A-Za-z0-9_-]{8,})b"), String.raw("b(ghp_[A-Za-z0-9]{20,})b"), String.raw("b(github_pat_[A-Za-z0-9_]{20,})b"), String.raw("b(xox[baprs]-[A-Za-z0-9-]{10,})b"), String.raw("b(xapp-[A-Za-z0-9-]{10,})b"), String.raw("b(gsk_[A-Za-z0-9_-]{10,})b"), String.raw("b(AIza[0-9A-Za-z-_]{20,})b"), String.raw("b(pplx-[A-Za-z0-9_-]{10,})b"), String.raw("b(npm_[A-Za-z0-9]{10,})b"), String.raw("b(d{6,}:[A-Za-z0-9_-]{20,})b")];
function normalizeMode(value) {
  return (value === "off") ? "off" : DEFAULT_REDACT_MODE;
}
function parsePattern(raw) {
  if (!raw.trim()) {
    return null;
  }
  const match = raw.match(/^\/(.+)\/([gimsuy]*)$/);
  try {
    {
      if (match) {
        const flags = match[2].includes("g") ? match[2] : "g";
        return new RegExp(match[1], flags);
      }
      return new RegExp(raw, "gi");
    }
  }
  catch {
    {
      return null;
    }
  }
}
function resolvePatterns(value) {
  const source = value?.length ? value : DEFAULT_REDACT_PATTERNS;
  return source.map(parsePattern).filter((re) => Boolean(re));
}
function maskToken(token) {
  if ((token.length < DEFAULT_REDACT_MIN_LENGTH)) {
    return "***";
  }
  const start = token.slice(0, DEFAULT_REDACT_KEEP_START);
  const end = token.slice(-DEFAULT_REDACT_KEEP_END);
  return "…";
}
function redactPemBlock(block) {
  const lines = block.split(/\r?\n/).filter(Boolean);
  if ((lines.length < 2)) {
    return "***";
  }
  return "
…redacted…
";
}
function redactMatch(match, groups) {
  if (match.includes("PRIVATE KEY-----")) {
    return redactPemBlock(match);
  }
  const token = (groups.filter((value) => ((typeof value === "string") && (value.length > 0))).at(-1) ?? match);
  const masked = maskToken(token);
  if ((token === match)) {
    return masked;
  }
  return match.replace(token, masked);
}
function redactText(text, patterns) {
  let next = text;
  for (const pattern of patterns) {
    next = next.replace(pattern, (...args) => redactMatch(args[0], args.slice(1, (args.length - 2))));
  }
  return next;
}
function resolveConfigRedaction() {
  let cfg;
  try {
    {
      const loaded = requireConfig("../config/config.js");
      cfg = loaded.loadConfig?.().logging;
    }
  }
  catch {
    {
      cfg = undefined;
    }
  }
  return { mode: normalizeMode(cfg?.redactSensitive), patterns: cfg?.redactPatterns };
}
export function redactSensitiveText(text, options) {
  if (!text) {
    return text;
  }
  const resolved = (options ?? resolveConfigRedaction());
  if ((normalizeMode(resolved.mode) === "off")) {
    return text;
  }
  const patterns = resolvePatterns(resolved.patterns);
  if (!patterns.length) {
    return text;
  }
  return redactText(text, patterns);
}

export function redactToolDetail(detail) {
  const resolved = resolveConfigRedaction();
  if ((normalizeMode(resolved.mode) !== "tools")) {
    return detail;
  }
  return redactSensitiveText(detail, resolved);
}

export function getDefaultRedactPatterns() {
  return [...DEFAULT_REDACT_PATTERNS];
}

