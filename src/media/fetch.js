import path from "node:path";
import { detectMime, extensionForMime } from "./mime.js";
export 
export class MediaFetchError extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "MediaFetchError";
  }
}

export 
function stripQuotes(value) {
  return value.replace(/^["']|["']$/g, "");
}
function parseContentDispositionFileName(header) {
  if (!header) {
    return undefined;
  }
  const starMatch = /filename\*\s*=\s*([^;]+)/i.exec(header);
  if (starMatch?.[1]) {
    const cleaned = stripQuotes(starMatch[1].trim());
    const encoded = (cleaned.split("''").slice(1).join("''") || cleaned);
    try {
      {
        return path.basename(decodeURIComponent(encoded));
      }
    }
    catch {
      {
        return path.basename(encoded);
      }
    }
  }
  const match = /filename\s*=\s*([^;]+)/i.exec(header);
  if (match?.[1]) {
    return path.basename(stripQuotes(match[1].trim()));
  }
  return undefined;
}
async function readErrorBodySnippet(res, maxChars = 200) {
  try {
    {
      const text = await res.text();
      if (!text) {
        return undefined;
      }
      const collapsed = text.replace(/\s+/g, " ").trim();
      if (!collapsed) {
        return undefined;
      }
      if ((collapsed.length <= maxChars)) {
        return collapsed;
      }
      return "…";
    }
  }
  catch {
    {
      return undefined;
    }
  }
}
export async function fetchRemoteMedia(options) {
  const {url, fetchImpl, filePathHint, maxBytes} = options;
  const fetcher = (fetchImpl ?? globalThis.fetch);
  if (!fetcher) {
    throw new Error("fetch is not available");
  }
  let res;
  try {
    {
      res = await fetcher(url);
    }
  }
  catch (err) {
    {
      throw new MediaFetchError("fetch_failed", "Failed to fetch media from : ");
    }
  }
  if (!res.ok) {
    const statusText = res.statusText ? " " : "";
    const redirected = (res.url && (res.url !== url)) ? " (redirected to )" : "";
    let detail = "HTTP ";
    if (!res.body) {
      detail = "HTTP ; empty response body";
    } else {
      const snippet = await readErrorBodySnippet(res);
      if (snippet) {
        detail += "; body: ";
      }
    }
    throw new MediaFetchError("http_error", "Failed to fetch media from : ");
  }
  const contentLength = res.headers.get("content-length");
  if ((maxBytes && contentLength)) {
    const length = Number(contentLength);
    if ((Number.isFinite(length) && (length > maxBytes))) {
      throw new MediaFetchError("max_bytes", "Failed to fetch media from : content length  exceeds maxBytes ");
    }
  }
  const buffer = maxBytes ? await readResponseWithLimit(res, maxBytes) : Buffer.from(await res.arrayBuffer());
  let fileNameFromUrl;
  try {
    {
      const parsed = new URL(url);
      const base = path.basename(parsed.pathname);
      fileNameFromUrl = (base || undefined);
    }
  }
  catch {
    {
    }
  }
  const headerFileName = parseContentDispositionFileName(res.headers.get("content-disposition"));
  let fileName = ((headerFileName || fileNameFromUrl) || filePathHint ? path.basename(filePathHint) : undefined);
  const filePathForMime = (headerFileName && path.extname(headerFileName)) ? headerFileName : (filePathHint ?? url);
  const contentType = await detectMime({ buffer, headerMime: res.headers.get("content-type"), filePath: filePathForMime });
  if (((fileName && !path.extname(fileName)) && contentType)) {
    const ext = extensionForMime(contentType);
    if (ext) {
      fileName = "";
    }
  }
  return { buffer, contentType: (contentType ?? undefined), fileName };
}

async function readResponseWithLimit(res, maxBytes) {
  const body = res.body;
  if ((!body || (typeof body.getReader !== "function"))) {
    const fallback = Buffer.from(await res.arrayBuffer());
    if ((fallback.length > maxBytes)) {
      throw new MediaFetchError("max_bytes", "Failed to fetch media from : payload exceeds maxBytes ");
    }
    return fallback;
  }
  const reader = body.getReader();
  const chunks = [];
  let total = 0;
  try {
    {
      while (true) {
        const {done, value} = await reader.read();
        if (done) {
          break;
        }
        if (value?.length) {
          total += value.length;
          if ((total > maxBytes)) {
            try {
              {
                await reader.cancel();
              }
            }
            catch {
              {
              }
            }
            throw new MediaFetchError("max_bytes", "Failed to fetch media from : payload exceeds maxBytes ");
          }
          chunks.push(value);
        }
      }
    }
  }
  finally {
    {
      try {
        {
          reader.releaseLock();
        }
      }
      catch {
        {
        }
      }
    }
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), total);
}
