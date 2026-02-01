import { detectMime } from "../media/mime.js";
export 
export 
export 
function normalizeMime(mime) {
  if (!mime) {
    return undefined;
  }
  const cleaned = mime.split(";")[0]?.trim().toLowerCase();
  return (cleaned || undefined);
}
async function sniffMimeFromBase64(base64) {
  const trimmed = base64.trim();
  if (!trimmed) {
    return undefined;
  }
  const take = Math.min(256, trimmed.length);
  const sliceLen = (take - (take % 4));
  if ((sliceLen < 8)) {
    return undefined;
  }
  try {
    {
      const head = Buffer.from(trimmed.slice(0, sliceLen), "base64");
      return await detectMime({ buffer: head });
    }
  }
  catch {
    {
      return undefined;
    }
  }
}
function isImageMime(mime) {
  return ((typeof mime === "string") && mime.startsWith("image/"));
}
export async function parseMessageWithAttachments(message, attachments, opts) {
  const maxBytes = (opts?.maxBytes ?? 5000000);
  const log = opts?.log;
  if ((!attachments || (attachments.length === 0))) {
    return { message, images: [] };
  }
  const images = [];
  for (const [idx, att] of attachments.entries()) {
    if (!att) {
      continue;
    }
    const mime = (att.mimeType ?? "");
    const content = att.content;
    const label = ((att.fileName || att.type) || "attachment-");
    if ((typeof content !== "string")) {
      throw new Error("attachment : content must be base64 string");
    }
    let sizeBytes = 0;
    let b64 = content.trim();
    const dataUrlMatch = /^data:[^;]+;base64,(.*)$/.exec(b64);
    if (dataUrlMatch) {
      b64 = dataUrlMatch[1];
    }
    if ((((b64.length % 4) !== 0) || /[^A-Za-z0-9+/=]/.test(b64))) {
      throw new Error("attachment : invalid base64 content");
    }
    try {
      {
        sizeBytes = Buffer.from(b64, "base64").byteLength;
      }
    }
    catch {
      {
        throw new Error("attachment : invalid base64 content");
      }
    }
    if (((sizeBytes <= 0) || (sizeBytes > maxBytes))) {
      throw new Error("attachment : exceeds size limit ( >  bytes)");
    }
    const providedMime = normalizeMime(mime);
    const sniffedMime = normalizeMime(await sniffMimeFromBase64(b64));
    if ((sniffedMime && !isImageMime(sniffedMime))) {
      log?.warn("attachment : detected non-image (), dropping");
      continue;
    }
    if ((!sniffedMime && !isImageMime(providedMime))) {
      log?.warn("attachment : unable to detect image mime type, dropping");
      continue;
    }
    if (((sniffedMime && providedMime) && (sniffedMime !== providedMime))) {
      log?.warn("attachment : mime mismatch ( -> ), using sniffed");
    }
    images.push({ type: "image", data: b64, mimeType: ((sniffedMime ?? providedMime) ?? mime) });
  }
  return { message, images };
}

export function buildMessageWithAttachments(message, attachments, opts) {
  const maxBytes = (opts?.maxBytes ?? 2000000);
  if ((!attachments || (attachments.length === 0))) {
    return message;
  }
  const blocks = [];
  for (const [idx, att] of attachments.entries()) {
    if (!att) {
      continue;
    }
    const mime = (att.mimeType ?? "");
    const content = att.content;
    const label = ((att.fileName || att.type) || "attachment-");
    if ((typeof content !== "string")) {
      throw new Error("attachment : content must be base64 string");
    }
    if (!mime.startsWith("image/")) {
      throw new Error("attachment : only image/* supported");
    }
    let sizeBytes = 0;
    const b64 = content.trim();
    if ((((b64.length % 4) !== 0) || /[^A-Za-z0-9+/=]/.test(b64))) {
      throw new Error("attachment : invalid base64 content");
    }
    try {
      {
        sizeBytes = Buffer.from(b64, "base64").byteLength;
      }
    }
    catch {
      {
        throw new Error("attachment : invalid base64 content");
      }
    }
    if (((sizeBytes <= 0) || (sizeBytes > maxBytes))) {
      throw new Error("attachment : exceeds size limit ( >  bytes)");
    }
    const safeLabel = label.replace(/\s+/g, "_");
    const dataUrl = "![](data:;base64,)";
    blocks.push(dataUrl);
  }
  if ((blocks.length === 0)) {
    return message;
  }
  const separator = (message.trim().length > 0) ? "

" : "";
  return "";
}

