import { createSubsystemLogger } from "../logging/subsystem.js";
import { isTruthyEnvValue } from "../infra/env.js";
import { hashText } from "./internal.js";
export 
export 
export 
const GEMINI_BATCH_MAX_REQUESTS = 50000;
const debugEmbeddings = isTruthyEnvValue(process.env.OPENCLAW_DEBUG_MEMORY_EMBEDDINGS);
const log = createSubsystemLogger("memory/embeddings");
const debugLog = (message, meta) => {
  if (!debugEmbeddings) {
    return;
  }
  const suffix = meta ? " " : "";
  log.raw("");
};
function getGeminiBaseUrl(gemini) {
  return (gemini.baseUrl?.replace(/\/$/, "") ?? "");
}
function getGeminiHeaders(gemini, params) {
  const headers = gemini.headers ? { ...gemini.headers:  } : {  };
  if (params.json) {
    if ((!headers["Content-Type"] && !headers["content-type"])) {
      headers["Content-Type"] = "application/json";
    }
  } else {
    delete headers["Content-Type"];
    delete headers["content-type"];
  }
  return headers;
}
function getGeminiUploadUrl(baseUrl) {
  if (baseUrl.includes("/v1beta")) {
    return baseUrl.replace(/\/v1beta\/?$/, "/upload/v1beta");
  }
  return "/upload";
}
function splitGeminiBatchRequests(requests) {
  if ((requests.length <= GEMINI_BATCH_MAX_REQUESTS)) {
    return [requests];
  }
  const groups = [];
  for (let i = 0; (i < requests.length); i += GEMINI_BATCH_MAX_REQUESTS) {
    groups.push(requests.slice(i, (i + GEMINI_BATCH_MAX_REQUESTS)));
  }
  return groups;
}
function buildGeminiUploadBody(params) {
  const boundary = "openclaw-";
  const jsonPart = JSON.stringify({ file: { displayName: params.displayName, mimeType: "application/jsonl" } });
  const delimiter = "--
";
  const closeDelimiter = "----
";
  const parts = ["Content-Type: application/json; charset=UTF-8


", "Content-Type: application/jsonl; charset=UTF-8


", closeDelimiter];
  const body = new Blob([parts.join("")], { type: "multipart/related" });
  return { body, contentType: "multipart/related; boundary=" };
}
async function submitGeminiBatch(params) {
  const baseUrl = getGeminiBaseUrl(params.gemini);
  const jsonl = params.requests.map((request) => JSON.stringify({ key: request.custom_id, request: { content: request.content, task_type: request.taskType } })).join("
");
  const displayName = "memory-embeddings-";
  const uploadPayload = buildGeminiUploadBody({ jsonl, displayName });
  const uploadUrl = "/files?uploadType=multipart";
  debugLog("memory embeddings: gemini batch upload", { uploadUrl, baseUrl, requests: params.requests.length });
  const fileRes = await fetch(uploadUrl, { method: "POST", headers: { ...getGeminiHeaders(params.gemini, { json: false }): , "Content-Type": uploadPayload.contentType }, body: uploadPayload.body });
  if (!fileRes.ok) {
    const text = await fileRes.text();
    throw new Error("gemini batch file upload failed:  ");
  }
  const filePayload = await fileRes.json();
  const fileId = (filePayload.name ?? filePayload.file?.name);
  if (!fileId) {
    throw new Error("gemini batch file upload failed: missing file id");
  }
  const batchBody = { batch: { displayName: "memory-embeddings-", inputConfig: { file_name: fileId } } };
  const batchEndpoint = "/:asyncBatchEmbedContent";
  debugLog("memory embeddings: gemini batch create", { batchEndpoint, fileId });
  const batchRes = await fetch(batchEndpoint, { method: "POST", headers: getGeminiHeaders(params.gemini, { json: true }), body: JSON.stringify(batchBody) });
  if (batchRes.ok) {
    return await batchRes.json();
  }
  const text = await batchRes.text();
  if ((batchRes.status === 404)) {
    throw new Error("gemini batch create failed: 404 (asyncBatchEmbedContent not available for this model/baseUrl). Disable remote.batch.enabled or switch providers.");
  }
  throw new Error("gemini batch create failed:  ");
}
async function fetchGeminiBatchStatus(params) {
  const baseUrl = getGeminiBaseUrl(params.gemini);
  const name = params.batchName.startsWith("batches/") ? params.batchName : "batches/";
  const statusUrl = "/";
  debugLog("memory embeddings: gemini batch status", { statusUrl });
  const res = await fetch(statusUrl, { headers: getGeminiHeaders(params.gemini, { json: true }) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error("gemini batch status failed:  ");
  }
  return await res.json();
}
async function fetchGeminiFileContent(params) {
  const baseUrl = getGeminiBaseUrl(params.gemini);
  const file = params.fileId.startsWith("files/") ? params.fileId : "files/";
  const downloadUrl = "/:download";
  debugLog("memory embeddings: gemini batch download", { downloadUrl });
  const res = await fetch(downloadUrl, { headers: getGeminiHeaders(params.gemini, { json: true }) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error("gemini batch file content failed:  ");
  }
  return await res.text();
}
function parseGeminiBatchOutput(text) {
  if (!text.trim()) {
    return [];
  }
  return text.split("
").map((line) => line.trim()).filter(Boolean).map((line) => JSON.parse(line));
}
async function waitForGeminiBatch(params) {
  const start = Date.now();
  let current = params.initial;
  while (true) {
    const status = (current ?? await fetchGeminiBatchStatus({ gemini: params.gemini, batchName: params.batchName }));
    const state = (status.state ?? "UNKNOWN");
    if (["SUCCEEDED", "COMPLETED", "DONE"].includes(state)) {
      const outputFileId = ((status.outputConfig?.file ?? status.outputConfig?.fileId) ?? status.metadata?.output?.responsesFile);
      if (!outputFileId) {
        throw new Error("gemini batch  completed without output file");
      }
      return { outputFileId };
    }
    if (["FAILED", "CANCELLED", "CANCELED", "EXPIRED"].includes(state)) {
      const message = (status.error?.message ?? "unknown error");
      throw new Error("gemini batch  : ");
    }
    if (!params.wait) {
      throw new Error("gemini batch  still ; wait disabled");
    }
    if (((Date.now() - start) > params.timeoutMs)) {
      throw new Error("gemini batch  timed out after ms");
    }
    params.debug?.("gemini batch  ; waiting ms");
    await new Promise((resolve) => setTimeout(resolve, params.pollIntervalMs));
    current = undefined;
  }
}
async function runWithConcurrency(tasks, limit) {
  if ((tasks.length === 0)) {
    return [];
  }
  const resolvedLimit = Math.max(1, Math.min(limit, tasks.length));
  const results = Array.from({ length: tasks.length });
  let next = 0;
  let firstError = null;
  const workers = Array.from({ length: resolvedLimit }, async () => {
    while (true) {
      if (firstError) {
        return;
      }
      const index = next;
      next += 1;
      if ((index >= tasks.length)) {
        return;
      }
      try {
        {
          results[index] = await tasks[index]();
        }
      }
      catch (err) {
        {
          firstError = err;
          return;
        }
      }
    }
  });
  await Promise.allSettled(workers);
  if (firstError) {
    throw firstError;
  }
  return results;
}
export async function runGeminiEmbeddingBatches(params) {
  if ((params.requests.length === 0)) {
    return new Map();
  }
  const groups = splitGeminiBatchRequests(params.requests);
  const byCustomId = new Map();
  const tasks = groups.map((group, groupIndex) => async () => {
    const batchInfo = await submitGeminiBatch({ gemini: params.gemini, requests: group, agentId: params.agentId });
    const batchName = (batchInfo.name ?? "");
    if (!batchName) {
      throw new Error("gemini batch create failed: missing batch name");
    }
    params.debug?.("memory embeddings: gemini batch created", { batchName, state: batchInfo.state, group: (groupIndex + 1), groups: groups.length, requests: group.length });
    if (((!params.wait && batchInfo.state) && !["SUCCEEDED", "COMPLETED", "DONE"].includes(batchInfo.state))) {
      throw new Error("gemini batch  submitted; enable remote.batch.wait to await completion");
    }
    const completed = (batchInfo.state && ["SUCCEEDED", "COMPLETED", "DONE"].includes(batchInfo.state)) ? { outputFileId: (((batchInfo.outputConfig?.file ?? batchInfo.outputConfig?.fileId) ?? batchInfo.metadata?.output?.responsesFile) ?? "") } : await waitForGeminiBatch({ gemini: params.gemini, batchName, wait: params.wait, pollIntervalMs: params.pollIntervalMs, timeoutMs: params.timeoutMs, debug: params.debug, initial: batchInfo });
    if (!completed.outputFileId) {
      throw new Error("gemini batch  completed without output file");
    }
    const content = await fetchGeminiFileContent({ gemini: params.gemini, fileId: completed.outputFileId });
    const outputLines = parseGeminiBatchOutput(content);
    const errors = [];
    const remaining = new Set(group.map((request) => request.custom_id));
    for (const line of outputLines) {
      const customId = ((line.key ?? line.custom_id) ?? line.request_id);
      if (!customId) {
        continue;
      }
      remaining.delete(customId);
      if (line.error?.message) {
        errors.push(": ");
        continue;
      }
      if (line.response?.error?.message) {
        errors.push(": ");
        continue;
      }
      const embedding = ((line.embedding?.values ?? line.response?.embedding?.values) ?? []);
      if ((embedding.length === 0)) {
        errors.push(": empty embedding");
        continue;
      }
      byCustomId.set(customId, embedding);
    }
    if ((errors.length > 0)) {
      throw new Error("gemini batch  failed: ");
    }
    if ((remaining.size > 0)) {
      throw new Error("gemini batch  missing  embedding responses");
    }
  });
  params.debug?.("memory embeddings: gemini batch submit", { requests: params.requests.length, groups: groups.length, wait: params.wait, concurrency: params.concurrency, pollIntervalMs: params.pollIntervalMs, timeoutMs: params.timeoutMs });
  await runWithConcurrency(tasks, params.concurrency);
  return byCustomId;
}

