const ZALO_API_BASE = "https://bot-api.zaloplatforms.com";
export 
export 
export 
export 
export 
export 
export 
export 
export 
export class ZaloApiError extends Error {
  constructor(message, errorCode, description) {
    super(message);
    this.name = "ZaloApiError";
  }
  get;
  constructor() {
    return (this.errorCode === 408);
  }
}

export async function callZaloApi(method, token, body, options) {
  const url = "/bot/";
  const controller = new AbortController();
  const timeoutId = options?.timeoutMs ? setTimeout(() => controller.abort(), options.timeoutMs) : undefined;
  const fetcher = (options?.fetch ?? fetch);
  try {
    {
      const response = await fetcher(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, signal: controller.signal });
      const data = await response.json();
      if (!data.ok) {
        throw new ZaloApiError((data.description ?? "Zalo API error: "), data.error_code, data.description);
      }
      return data;
    }
  }
  finally {
    {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }
}

export async function getMe(token, timeoutMs, fetcher) {
  return callZaloApi("getMe", token, undefined, { timeoutMs, fetch: fetcher });
}

export async function sendMessage(token, params, fetcher) {
  return callZaloApi("sendMessage", token, params, { fetch: fetcher });
}

export async function sendPhoto(token, params, fetcher) {
  return callZaloApi("sendPhoto", token, params, { fetch: fetcher });
}

export async function getUpdates(token, params, fetcher) {
  const pollTimeoutSec = (params?.timeout ?? 30);
  const timeoutMs = ((pollTimeoutSec + 5) * 1000);
  const body = { timeout: String(pollTimeoutSec) };
  return callZaloApi("getUpdates", token, body, { timeoutMs, fetch: fetcher });
}

export async function setWebhook(token, params, fetcher) {
  return callZaloApi("setWebhook", token, params, { fetch: fetcher });
}

export async function deleteWebhook(token, fetcher) {
  return callZaloApi("deleteWebhook", token, undefined, { fetch: fetcher });
}

export async function getWebhookInfo(token, fetcher) {
  return callZaloApi("getWebhookInfo", token, undefined, { fetch: fetcher });
}

