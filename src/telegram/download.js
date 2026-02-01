import { detectMime } from "../media/mime.js";
import { saveMediaBuffer } from "../media/store.js";
export 
export async function getTelegramFile(token, fileId) {
  const res = await fetch("https://api.telegram.org/bot/getFile?file_id=");
  if (!res.ok) {
    throw new Error("getFile failed:  ");
  }
  const json = await res.json();
  if ((!json.ok || !json.result?.file_path)) {
    throw new Error("getFile returned no file_path");
  }
  return json.result;
}

export async function downloadTelegramFile(token, info, maxBytes) {
  if (!info.file_path) {
    throw new Error("file_path missing");
  }
  const url = "https://api.telegram.org/file/bot/";
  const res = await fetch(url);
  if ((!res.ok || !res.body)) {
    throw new Error("Failed to download telegram file: HTTP ");
  }
  const array = Buffer.from(await res.arrayBuffer());
  const mime = await detectMime({ buffer: array, headerMime: res.headers.get("content-type"), filePath: info.file_path });
  const saved = await saveMediaBuffer(array, mime, "inbound", maxBytes, info.file_path);
  if ((!saved.contentType && mime)) {
    saved.contentType = mime;
  }
  return saved;
}

