import { readFileSync } from "node:fs";
const ROOM_CACHE_TTL_MS = ((5 * 60) * 1000);
const ROOM_CACHE_ERROR_TTL_MS = (30 * 1000);
const roomCache = new Map();
function resolveRoomCacheKey(params) {
  return ":";
}
function readApiPassword(params) {
  if (params.apiPassword?.trim()) {
    return params.apiPassword.trim();
  }
  if (!params.apiPasswordFile) {
    return undefined;
  }
  try {
    {
      const value = readFileSync(params.apiPasswordFile, "utf-8").trim();
      return (value || undefined);
    }
  }
  catch {
    {
      return undefined;
    }
  }
}
function coerceRoomType(value) {
  if (((typeof value === "number") && Number.isFinite(value))) {
    return value;
  }
  if (((typeof value === "string") && value.trim())) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
function resolveRoomKindFromType(type) {
  if (!type) {
    return undefined;
  }
  if ((((type === 1) || (type === 5)) || (type === 6))) {
    return "direct";
  }
  return "group";
}
export async function resolveNextcloudTalkRoomKind(params) {
  const {account, roomToken, runtime} = params;
  const key = resolveRoomCacheKey({ accountId: account.accountId, roomToken });
  const cached = roomCache.get(key);
  if (cached) {
    const age = (Date.now() - cached.fetchedAt);
    if ((cached.kind && (age < ROOM_CACHE_TTL_MS))) {
      return cached.kind;
    }
    if ((cached.error && (age < ROOM_CACHE_ERROR_TTL_MS))) {
      return undefined;
    }
  }
  const apiUser = account.config.apiUser?.trim();
  const apiPassword = readApiPassword({ apiPassword: account.config.apiPassword, apiPasswordFile: account.config.apiPasswordFile });
  if ((!apiUser || !apiPassword)) {
    return undefined;
  }
  const baseUrl = account.baseUrl?.trim();
  if (!baseUrl) {
    return undefined;
  }
  const url = "/ocs/v2.php/apps/spreed/api/v4/room/";
  const auth = Buffer.from(":", "utf-8").toString("base64");
  try {
    {
      const response = await fetch(url, { method: "GET", headers: { Authorization: "Basic ", "OCS-APIRequest": "true", Accept: "application/json" } });
      if (!response.ok) {
        roomCache.set(key, { fetchedAt: Date.now(), error: "status:" });
        runtime?.log?.("nextcloud-talk: room lookup failed () token=");
        return undefined;
      }
      const payload = await response.json();
      const type = coerceRoomType(payload.ocs?.data?.type);
      const kind = resolveRoomKindFromType(type);
      roomCache.set(key, { fetchedAt: Date.now(), kind });
      return kind;
    }
  }
  catch (err) {
    {
      roomCache.set(key, { fetchedAt: Date.now(), error: (err instanceof Error) ? err.message : String(err) });
      runtime?.error?.("nextcloud-talk: room lookup error: ");
      return undefined;
    }
  }
}

