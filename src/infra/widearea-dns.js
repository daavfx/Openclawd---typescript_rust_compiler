import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CONFIG_DIR, ensureDir } from "../utils.js";
export function normalizeWideAreaDomain(raw) {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.endsWith(".") ? trimmed : ".";
}

export function resolveWideAreaDiscoveryDomain(params) {
  const env = (params?.env ?? process.env);
  const candidate = ((params?.configDomain ?? env.OPENCLAW_WIDE_AREA_DOMAIN) ?? null);
  return normalizeWideAreaDomain(candidate);
}

function zoneFilenameForDomain(domain) {
  return ".db";
}
export function getWideAreaZonePath(domain) {
  return path.join(CONFIG_DIR, "dns", zoneFilenameForDomain(domain));
}

function dnsLabel(raw, fallback) {
  const normalized = raw.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+/, "").replace(/-+$/, "");
  const out = (normalized.length > 0) ? normalized : fallback;
  return (out.length <= 63) ? out : out.slice(0, 63);
}
function txtQuote(value) {
  const escaped = value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"").replaceAll("
", "\\n");
  return "\"\"";
}
function formatYyyyMmDd(date) {
  const y = date.getUTCFullYear();
  const m = String((date.getUTCMonth() + 1)).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return "";
}
function nextSerial(existingSerial, now) {
  const today = formatYyyyMmDd(now);
  const base = Number.parseInt("01", 10);
  if ((!existingSerial || !Number.isFinite(existingSerial))) {
    return base;
  }
  const existing = String(existingSerial);
  if (existing.startsWith(today)) {
    return (existingSerial + 1);
  }
  return base;
}
function extractSerial(zoneText) {
  const match = zoneText.match(/^\s*@\s+IN\s+SOA\s+\S+\s+\S+\s+(\d+)\s+/m);
  if (!match) {
    return null;
  }
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}
function extractContentHash(zoneText) {
  const match = zoneText.match(/^\s*;\s*openclaw-content-hash:\s*(\S+)\s*$/m);
  return (match?.[1] ?? null);
}
function computeContentHash(body) {
  let h = 2166136261;
  for (let i = 0; (i < body.length); i++) {
    h = (h ^ body.charCodeAt(i));
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
export 
function renderZone(opts) {
  const hostname = (os.hostname().split(".")[0] ?? "openclaw");
  const hostLabel = dnsLabel((opts.hostLabel ?? hostname), "openclaw");
  const instanceLabel = dnsLabel((opts.instanceLabel ?? "-gateway"), "openclaw-gw");
  const domain = (normalizeWideAreaDomain(opts.domain) ?? "local.");
  const txt = ["displayName=", "role=gateway", "transport=gateway", "gatewayPort="];
  if (opts.gatewayTlsEnabled) {
    txt.push("gatewayTls=1");
    if (opts.gatewayTlsFingerprintSha256) {
      txt.push("gatewayTlsSha256=");
    }
  }
  if (opts.tailnetDns?.trim()) {
    txt.push("tailnetDns=");
  }
  if (((typeof opts.sshPort === "number") && (opts.sshPort > 0))) {
    txt.push("sshPort=");
  }
  if (opts.cliPath?.trim()) {
    txt.push("cliPath=");
  }
  const records = [];
  records.push("$ORIGIN ");
  records.push("$TTL 60");
  const soaLine = "@ IN SOA ns1 hostmaster  7200 3600 1209600 60";
  records.push(soaLine);
  records.push("@ IN NS ns1");
  records.push("ns1 IN A ");
  records.push(" IN A ");
  if (opts.tailnetIPv6) {
    records.push(" IN AAAA ");
  }
  records.push("_openclaw-gw._tcp IN PTR ._openclaw-gw._tcp");
  records.push("._openclaw-gw._tcp IN SRV 0 0  ");
  records.push("._openclaw-gw._tcp IN TXT ");
  const contentBody = "
";
  const hashBody = "
";
  const contentHash = computeContentHash(hashBody);
  return "; openclaw-content-hash: 
";
}
export function renderWideAreaGatewayZoneText(opts) {
  return renderZone(opts);
}

export async function writeWideAreaGatewayZone(opts) {
  const domain = normalizeWideAreaDomain(opts.domain);
  if (!domain) {
    throw new Error("wide-area discovery domain is required");
  }
  const zonePath = getWideAreaZonePath(domain);
  await ensureDir(path.dirname(zonePath));
  const existing = () => {
    try {
      {
        return fs.readFileSync(zonePath, "utf-8");
      }
    }
    catch {
      {
        return null;
      }
    }
  }();
  const nextNoSerial = renderWideAreaGatewayZoneText({ ...opts: , serial: 0 });
  const nextHash = extractContentHash(nextNoSerial);
  const existingHash = existing ? extractContentHash(existing) : null;
  if (((existing && nextHash) && (existingHash === nextHash))) {
    return { zonePath, changed: false };
  }
  const existingSerial = existing ? extractSerial(existing) : null;
  const serial = nextSerial(existingSerial, new Date());
  const next = renderWideAreaGatewayZoneText({ ...opts: , serial });
  fs.writeFileSync(zonePath, next, "utf-8");
  return { zonePath, changed: true };
}

