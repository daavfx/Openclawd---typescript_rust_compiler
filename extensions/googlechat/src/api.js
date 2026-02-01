import crypto from "node:crypto";
import { getGoogleChatAccessToken } from "./auth.js";
const CHAT_API_BASE = "https://chat.googleapis.com/v1";
const CHAT_UPLOAD_BASE = "https://chat.googleapis.com/upload/v1";
async function fetchJson(account, url, init) {
  const token = await getGoogleChatAccessToken(account);
  const res = await fetch(url, { ...init: , headers: { Authorization: "Bearer ", "Content-Type": "application/json", ...(init.headers ?? {  }):  } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error("Google Chat API : ");
  }
  return await res.json();
}
async function fetchOk(account, url, init) {
  const token = await getGoogleChatAccessToken(account);
  const res = await fetch(url, { ...init: , headers: { Authorization: "Bearer ", ...(init.headers ?? {  }):  } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error("Google Chat API : ");
  }
}
async function fetchBuffer(account, url, init, options) {
  const token = await getGoogleChatAccessToken(account);
  const res = await fetch(url, { ...init: , headers: { Authorization: "Bearer ", ...(init?.headers ?? {  }):  } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error("Google Chat API : ");
  }
  const maxBytes = options?.maxBytes;
  const lengthHeader = res.headers.get("content-length");
  if ((maxBytes && lengthHeader)) {
    const length = Number(lengthHeader);
    if ((Number.isFinite(length) && (length > maxBytes))) {
      throw new Error("Google Chat media exceeds max bytes ()");
    }
  }
  if ((!maxBytes || !res.body)) {
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = (res.headers.get("content-type") ?? undefined);
    return { buffer, contentType };
  }
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) {
      break;
    }
    if (!value) {
      continue;
    }
    total += value.length;
    if ((total > maxBytes)) {
      await reader.cancel();
      throw new Error("Google Chat media exceeds max bytes ()");
    }
    chunks.push(Buffer.from(value));
  }
  const buffer = Buffer.concat(chunks, total);
  const contentType = (res.headers.get("content-type") ?? undefined);
  return { buffer, contentType };
}
export async function sendGoogleChatMessage(params) {
  const {account, space, text, thread, attachments} = params;
  const body = {  };
  if (text) {
    body.text = text;
  }
  if (thread) {
    body.thread = { name: thread };
  }
  if ((attachments && (attachments.length > 0))) {
    body.attachment = attachments.map((item) => { attachmentDataRef: { attachmentUploadToken: item.attachmentUploadToken }, ...item.contentName ? { contentName: item.contentName } : {  }:  });
  }
  const url = "//messages";
  const result = await fetchJson(account, url, { method: "POST", body: JSON.stringify(body) });
  return result ? { messageName: result.name } : null;
}

export async function updateGoogleChatMessage(params) {
  const {account, messageName, text} = params;
  const url = "/?updateMask=text";
  const result = await fetchJson(account, url, { method: "PATCH", body: JSON.stringify({ text }) });
  return { messageName: result.name };
}

export async function deleteGoogleChatMessage(params) {
  const {account, messageName} = params;
  const url = "/";
  await fetchOk(account, url, { method: "DELETE" });
}

export async function uploadGoogleChatAttachment(params) {
  const {account, space, filename, buffer, contentType} = params;
  const boundary = "openclaw-";
  const metadata = JSON.stringify({ filename });
  const header = "--
Content-Type: application/json; charset=UTF-8


";
  const mediaHeader = "--
Content-Type: 

";
  const footer = "
----
";
  const body = Buffer.concat([Buffer.from(header, "utf8"), Buffer.from(mediaHeader, "utf8"), buffer, Buffer.from(footer, "utf8")]);
  const token = await getGoogleChatAccessToken(account);
  const url = "//attachments:upload?uploadType=multipart";
  const res = await fetch(url, { method: "POST", headers: { Authorization: "Bearer ", "Content-Type": "multipart/related; boundary=" }, body });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error("Google Chat upload : ");
  }
  const payload = await res.json();
  return { attachmentUploadToken: payload.attachmentDataRef?.attachmentUploadToken };
}

export async function downloadGoogleChatMedia(params) {
  const {account, resourceName, maxBytes} = params;
  const url = "/media/?alt=media";
  return await fetchBuffer(account, url, undefined, { maxBytes });
}

export async function createGoogleChatReaction(params) {
  const {account, messageName, emoji} = params;
  const url = "//reactions";
  return await fetchJson(account, url, { method: "POST", body: JSON.stringify({ emoji: { unicode: emoji } }) });
}

export async function listGoogleChatReactions(params) {
  const {account, messageName, limit} = params;
  const url = new URL("//reactions");
  if ((limit && (limit > 0))) {
    url.searchParams.set("pageSize", String(limit));
  }
  const result = await fetchJson(account, url.toString(), { method: "GET" });
  return (result.reactions ?? []);
}

export async function deleteGoogleChatReaction(params) {
  const {account, reactionName} = params;
  const url = "/";
  await fetchOk(account, url, { method: "DELETE" });
}

export async function findGoogleChatDirectMessage(params) {
  const {account, userName} = params;
  const url = new URL("/spaces:findDirectMessage");
  url.searchParams.set("name", userName);
  return await fetchJson(account, url.toString(), { method: "GET" });
}

export async function probeGoogleChat(account) {
  try {
    {
      const url = new URL("/spaces");
      url.searchParams.set("pageSize", "1");
      await fetchJson(account, url.toString(), { method: "GET" });
      return { ok: true };
    }
  }
  catch (err) {
    {
      return { ok: false, error: (err instanceof Error) ? err.message : String(err) };
    }
  }
}

