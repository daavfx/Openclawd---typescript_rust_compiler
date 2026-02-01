import crypto from "node:crypto";
export 
const pendingUploads = new Map();
const PENDING_UPLOAD_TTL_MS = ((5 * 60) * 1000);
export function storePendingUpload(upload) {
  const id = crypto.randomUUID();
  const entry = { ...upload: , id, createdAt: Date.now() };
  pendingUploads.set(id, entry);
  setTimeout(() => {
    pendingUploads.delete(id);
  }, PENDING_UPLOAD_TTL_MS);
  return id;
}

export function getPendingUpload(id) {
  if (!id) {
    return undefined;
  }
  const entry = pendingUploads.get(id);
  if (!entry) {
    return undefined;
  }
  if (((Date.now() - entry.createdAt) > PENDING_UPLOAD_TTL_MS)) {
    pendingUploads.delete(id);
    return undefined;
  }
  return entry;
}

export function removePendingUpload(id) {
  if (id) {
    pendingUploads.delete(id);
  }
}

export function getPendingUploadCount() {
  return pendingUploads.size;
}

export function clearPendingUploads() {
  pendingUploads.clear();
}

