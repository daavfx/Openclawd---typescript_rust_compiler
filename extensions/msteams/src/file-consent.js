export 
export 
export function buildFileConsentCard(params) {
  return { contentType: "application/vnd.microsoft.teams.card.file.consent", name: params.filename, content: { description: (params.description ?? "File: "), sizeInBytes: params.sizeInBytes, acceptContext: { filename: params.filename, ...params.context:  }, declineContext: { filename: params.filename, ...params.context:  } } };
}

export function buildFileInfoCard(params) {
  return { contentType: "application/vnd.microsoft.teams.card.file.info", contentUrl: params.contentUrl, name: params.filename, content: { uniqueId: params.uniqueId, fileType: params.fileType } };
}

export 
export 
export function parseFileConsentInvoke(activity) {
  if ((activity.name !== "fileConsent/invoke")) {
    return null;
  }
  const value = activity.value;
  if ((value?.type !== "fileUpload")) {
    return null;
  }
  return { action: (value.action === "accept") ? "accept" : "decline", uploadInfo: value.uploadInfo, context: value.context };
}

export async function uploadToConsentUrl(params) {
  const fetchFn = (params.fetchFn ?? fetch);
  const res = await fetchFn(params.url, { method: "PUT", headers: { "Content-Type": (params.contentType ?? "application/octet-stream"), "Content-Range": "bytes 0-/" }, body: new Uint8Array(params.buffer) });
  if (!res.ok) {
    throw new Error("File upload to consent URL failed:  ");
  }
}

