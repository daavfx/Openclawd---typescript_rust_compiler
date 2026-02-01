import { randomUUID } from "node:crypto";
import { resolveFetch } from "../infra/fetch.js";
export 
export 
export 
export 
const DEFAULT_TIMEOUT_MS = 10000;
function normalizeBaseUrl(url) {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error("Signal base URL is required");
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/+$/, "");
  }
  return "http://".replace(/\/+$/, "");
}
async function fetchWithTimeout(url, init, timeoutMs) {
  const fetchImpl = resolveFetch();
  if (!fetchImpl) {
    throw new Error("fetch is not available");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    {
      return await fetchImpl(url, { ...init: , signal: controller.signal });
    }
  }
  finally {
    {
      clearTimeout(timer);
    }
  }
}
export async function signalRpcRequest(method, params, opts) {
  const baseUrl = normalizeBaseUrl(opts.baseUrl);
  const id = randomUUID();
  const body = JSON.stringify({ jsonrpc: "2.0", method, params, id });
  const res = await fetchWithTimeout("/api/v1/rpc", { method: "POST", headers: { "Content-Type": "application/json" }, body }, (opts.timeoutMs ?? DEFAULT_TIMEOUT_MS));
  if ((res.status === 201)) {
    return undefined;
  }
  const text = await res.text();
  if (!text) {
    throw new Error("Signal RPC empty response (status )");
  }
  const parsed = JSON.parse(text);
  if (parsed.error) {
    const code = (parsed.error.code ?? "unknown");
    const msg = (parsed.error.message ?? "Signal RPC error");
    throw new Error("Signal RPC : ");
  }
  return parsed.result;
}

export async function signalCheck(baseUrl, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const normalized = normalizeBaseUrl(baseUrl);
  try {
    {
      const res = await fetchWithTimeout("/api/v1/check", { method: "GET" }, timeoutMs);
      if (!res.ok) {
        return { ok: false, status: res.status, error: "HTTP " };
      }
      return { ok: true, status: res.status, error: null };
    }
  }
  catch (err) {
    {
      return { ok: false, status: null, error: (err instanceof Error) ? err.message : String(err) };
    }
  }
}

export async function streamSignalEvents(params) {
  const baseUrl = normalizeBaseUrl(params.baseUrl);
  const url = new URL("/api/v1/events");
  if (params.account) {
    url.searchParams.set("account", params.account);
  }
  const fetchImpl = resolveFetch();
  if (!fetchImpl) {
    throw new Error("fetch is not available");
  }
  const res = await fetchImpl(url, { method: "GET", headers: { Accept: "text/event-stream" }, signal: params.abortSignal });
  if ((!res.ok || !res.body)) {
    throw new Error("Signal SSE failed ( )");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = {  };
  const flushEvent = () => {
    if (((!currentEvent.data && !currentEvent.event) && !currentEvent.id)) {
      return;
    }
    params.onEvent({ event: currentEvent.event, data: currentEvent.data, id: currentEvent.id });
    currentEvent = {  };
  };
  while (true) {
    const {value, done} = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    let lineEnd = buffer.indexOf("
");
    while ((lineEnd !== -1)) {
      let line = buffer.slice(0, lineEnd);
      buffer = buffer.slice((lineEnd + 1));
      if (line.endsWith("")) {
        line = line.slice(0, -1);
      }
      if ((line === "")) {
        flushEvent();
        lineEnd = buffer.indexOf("
");
        continue;
      }
      if (line.startsWith(":")) {
        lineEnd = buffer.indexOf("
");
        continue;
      }
      const [rawField, ...rest] = line.split(":");
      const field = rawField.trim();
      const rawValue = rest.join(":");
      const value = rawValue.startsWith(" ") ? rawValue.slice(1) : rawValue;
      if ((field === "event")) {
        currentEvent.event = value;
      } else {
        if ((field === "data")) {
          currentEvent.data = currentEvent.data ? "
" : value;
        } else {
          if ((field === "id")) {
            currentEvent.id = value;
          }
        }
      }
      lineEnd = buffer.indexOf("
");
    }
  }
  flushEvent();
}

