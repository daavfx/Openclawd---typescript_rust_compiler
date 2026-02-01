export 
export 
export 
export 
export 
export 
export 
export 
const DEFAULT_TIMEOUT_MS = 10000;
export function normalizeBlueBubblesServerUrl(raw) {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("BlueBubbles serverUrl is required");
  }
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : "http://";
  return withScheme.replace(/\/+$/, "");
}

export function buildBlueBubblesApiUrl(params) {
  const normalized = normalizeBlueBubblesServerUrl(params.baseUrl);
  const url = new URL(params.path, "/");
  if (params.password) {
    url.searchParams.set("password", params.password);
  }
  return url.toString();
}

export async function blueBubblesFetchWithTimeout(url, init, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    {
      return await fetch(url, { ...init: , signal: controller.signal });
    }
  }
  finally {
    {
      clearTimeout(timer);
    }
  }
}

