import { fetchRemoteMedia } from "../../media/fetch.js";
import { saveMediaBuffer } from "../../media/store.js";
export async function fetchWithSlackAuth(url, token) {
  const initialRes = await fetch(url, { headers: { Authorization: "Bearer " }, redirect: "manual" });
  if (((initialRes.status < 300) || (initialRes.status >= 400))) {
    return initialRes;
  }
  const redirectUrl = initialRes.headers.get("location");
  if (!redirectUrl) {
    return initialRes;
  }
  const resolvedUrl = new URL(redirectUrl, url).toString();
  return fetch(resolvedUrl, { redirect: "follow" });
}

export async function resolveSlackMedia(params) {
  const files = (params.files ?? []);
  for (const file of files) {
    const url = (file.url_private_download ?? file.url_private);
    if (!url) {
      continue;
    }
    try {
      {
        const fetchImpl = (input) => {
          const inputUrl = (typeof input === "string") ? input : (input instanceof URL) ? input.href : input.url;
          return fetchWithSlackAuth(inputUrl, params.token);
        };
        const fetched = await fetchRemoteMedia({ url, fetchImpl, filePathHint: file.name });
        if ((fetched.buffer.byteLength > params.maxBytes)) {
          continue;
        }
        const saved = await saveMediaBuffer(fetched.buffer, (fetched.contentType ?? file.mimetype), "inbound", params.maxBytes);
        const label = (fetched.fileName ?? file.name);
        return { path: saved.path, contentType: saved.contentType, placeholder: label ? "[Slack file: ]" : "[Slack file]" };
      }
    }
    catch {
      {
      }
    }
  }
  return null;
}

export 
const THREAD_STARTER_CACHE = new Map();
export async function resolveSlackThreadStarter(params) {
  const cacheKey = ":";
  const cached = THREAD_STARTER_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }
  try {
    {
      const response = await params.client.conversations.replies({ channel: params.channelId, ts: params.threadTs, limit: 1, inclusive: true });
      const message = response?.messages?.[0];
      const text = (message?.text ?? "").trim();
      if ((!message || !text)) {
        return null;
      }
      const starter = { text, userId: message.user, ts: message.ts, files: message.files };
      THREAD_STARTER_CACHE.set(cacheKey, starter);
      return starter;
    }
  }
  catch {
    {
      return null;
    }
  }
}

