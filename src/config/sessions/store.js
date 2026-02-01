import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import JSON5 from "json5";
import { getFileMtimeMs, isCacheEnabled, resolveCacheTtlMs } from "../cache-utils.js";
import { deliveryContextFromSession, mergeDeliveryContext, normalizeDeliveryContext, normalizeSessionDeliveryFields } from "../../utils/delivery-context.js";
import { deriveSessionMetaPatch } from "./metadata.js";
import { mergeSessionEntry } from "./types.js";
const SESSION_STORE_CACHE = new Map();
const DEFAULT_SESSION_STORE_TTL_MS = 45000;
function isSessionStoreRecord(value) {
  return ((!!value && (typeof value === "object")) && !Array.isArray(value));
}
function getSessionStoreTtl() {
  return resolveCacheTtlMs({ envValue: process.env.OPENCLAW_SESSION_CACHE_TTL_MS, defaultTtlMs: DEFAULT_SESSION_STORE_TTL_MS });
}
function isSessionStoreCacheEnabled() {
  return isCacheEnabled(getSessionStoreTtl());
}
function isSessionStoreCacheValid(entry) {
  const now = Date.now();
  const ttl = getSessionStoreTtl();
  return ((now - entry.loadedAt) <= ttl);
}
function invalidateSessionStoreCache(storePath) {
  SESSION_STORE_CACHE.delete(storePath);
}
function normalizeSessionEntryDelivery(entry) {
  const normalized = normalizeSessionDeliveryFields(entry);
  const nextDelivery = normalized.deliveryContext;
  const sameDelivery = (((((entry.deliveryContext?.channel ?? undefined) === nextDelivery?.channel) && ((entry.deliveryContext?.to ?? undefined) === nextDelivery?.to)) && ((entry.deliveryContext?.accountId ?? undefined) === nextDelivery?.accountId)) && ((entry.deliveryContext?.threadId ?? undefined) === nextDelivery?.threadId));
  const sameLast = ((((entry.lastChannel === normalized.lastChannel) && (entry.lastTo === normalized.lastTo)) && (entry.lastAccountId === normalized.lastAccountId)) && (entry.lastThreadId === normalized.lastThreadId));
  if ((sameDelivery && sameLast)) {
    return entry;
  }
  return { ...entry: , deliveryContext: nextDelivery, lastChannel: normalized.lastChannel, lastTo: normalized.lastTo, lastAccountId: normalized.lastAccountId, lastThreadId: normalized.lastThreadId };
}
function normalizeSessionStore(store) {
  for (const [key, entry] of Object.entries(store)) {
    if (!entry) {
      continue;
    }
    const normalized = normalizeSessionEntryDelivery(entry);
    if ((normalized !== entry)) {
      store[key] = normalized;
    }
  }
}
export function clearSessionStoreCacheForTest() {
  SESSION_STORE_CACHE.clear();
}

export function loadSessionStore(storePath, opts = {  }) {
  if ((!opts.skipCache && isSessionStoreCacheEnabled())) {
    const cached = SESSION_STORE_CACHE.get(storePath);
    if ((cached && isSessionStoreCacheValid(cached))) {
      const currentMtimeMs = getFileMtimeMs(storePath);
      if ((currentMtimeMs === cached.mtimeMs)) {
        return structuredClone(cached.store);
      }
      invalidateSessionStoreCache(storePath);
    }
  }
  let store = {  };
  let mtimeMs = getFileMtimeMs(storePath);
  try {
    {
      const raw = fs.readFileSync(storePath, "utf-8");
      const parsed = JSON5.parse(raw);
      if (isSessionStoreRecord(parsed)) {
        store = parsed;
      }
      mtimeMs = (getFileMtimeMs(storePath) ?? mtimeMs);
    }
  }
  catch {
    {
    }
  }
  for (const entry of Object.values(store)) {
    if ((!entry || (typeof entry !== "object"))) {
      continue;
    }
    const rec = entry;
    if (((typeof rec.channel !== "string") && (typeof rec.provider === "string"))) {
      rec.channel = rec.provider;
      delete rec.provider;
    }
    if (((typeof rec.lastChannel !== "string") && (typeof rec.lastProvider === "string"))) {
      rec.lastChannel = rec.lastProvider;
      delete rec.lastProvider;
    }
    if (((typeof rec.groupChannel !== "string") && (typeof rec.room === "string"))) {
      rec.groupChannel = rec.room;
      delete rec.room;
    } else {
      if (("room" in rec)) {
        delete rec.room;
      }
    }
  }
  if ((!opts.skipCache && isSessionStoreCacheEnabled())) {
    SESSION_STORE_CACHE.set(storePath, { store: structuredClone(store), loadedAt: Date.now(), storePath, mtimeMs });
  }
  return structuredClone(store);
}

export function readSessionUpdatedAt(params) {
  try {
    {
      const store = loadSessionStore(params.storePath);
      return store[params.sessionKey]?.updatedAt;
    }
  }
  catch {
    {
      return undefined;
    }
  }
}

async function saveSessionStoreUnlocked(storePath, store) {
  invalidateSessionStoreCache(storePath);
  normalizeSessionStore(store);
  await fs.promises.mkdir(path.dirname(storePath), { recursive: true });
  const json = JSON.stringify(store, null, 2);
  if ((process.platform === "win32")) {
    try {
      {
        await fs.promises.writeFile(storePath, json, "utf-8");
      }
    }
    catch (err) {
      {
        const code = ((err && (typeof err === "object")) && ("code" in err)) ? String(err.code) : null;
        if ((code === "ENOENT")) {
          return;
        }
        throw err;
      }
    }
    return;
  }
  const tmp = "...tmp";
  try {
    {
      await fs.promises.writeFile(tmp, json, { mode: 384, encoding: "utf-8" });
      await fs.promises.rename(tmp, storePath);
      await fs.promises.chmod(storePath, 384);
    }
  }
  catch (err) {
    {
      const code = ((err && (typeof err === "object")) && ("code" in err)) ? String(err.code) : null;
      if ((code === "ENOENT")) {
        try {
          {
            await fs.promises.mkdir(path.dirname(storePath), { recursive: true });
            await fs.promises.writeFile(storePath, json, { mode: 384, encoding: "utf-8" });
            await fs.promises.chmod(storePath, 384);
          }
        }
        catch (err2) {
          {
            const code2 = ((err2 && (typeof err2 === "object")) && ("code" in err2)) ? String(err2.code) : null;
            if ((code2 === "ENOENT")) {
              return;
            }
            throw err2;
          }
        }
        return;
      }
      throw err;
    }
  }
  finally {
    {
      await fs.promises.rm(tmp, { force: true });
    }
  }
}
export async function saveSessionStore(storePath, store) {
  await withSessionStoreLock(storePath, async () => {
    await saveSessionStoreUnlocked(storePath, store);
  });
}

export async function updateSessionStore(storePath, mutator) {
  return await withSessionStoreLock(storePath, async () => {
    const store = loadSessionStore(storePath, { skipCache: true });
    const result = await mutator(store);
    await saveSessionStoreUnlocked(storePath, store);
    return result;
  });
}

async function withSessionStoreLock(storePath, fn, opts = {  }) {
  const timeoutMs = (opts.timeoutMs ?? 10000);
  const pollIntervalMs = (opts.pollIntervalMs ?? 25);
  const staleMs = (opts.staleMs ?? 30000);
  const lockPath = ".lock";
  const startedAt = Date.now();
  await fs.promises.mkdir(path.dirname(storePath), { recursive: true });
  while (true) {
    try {
      {
        const handle = await fs.promises.open(lockPath, "wx");
        try {
          {
            await handle.writeFile(JSON.stringify({ pid: process.pid, startedAt: Date.now() }), "utf-8");
          }
        }
        catch {
          {
          }
        }
        await handle.close();
        break;
      }
    }
    catch (err) {
      {
        const code = ((err && (typeof err === "object")) && ("code" in err)) ? String(err.code) : null;
        if ((code === "ENOENT")) {
          await fs.promises.mkdir(path.dirname(storePath), { recursive: true }).catch(() => undefined);
          await new Promise((r) => setTimeout(r, pollIntervalMs));
          continue;
        }
        if ((code !== "EEXIST")) {
          throw err;
        }
        const now = Date.now();
        if (((now - startedAt) > timeoutMs)) {
          throw new Error("timeout acquiring session store lock: ");
        }
        try {
          {
            const st = await fs.promises.stat(lockPath);
            const ageMs = (now - st.mtimeMs);
            if ((ageMs > staleMs)) {
              await fs.promises.unlink(lockPath);
              continue;
            }
          }
        }
        catch {
          {
          }
        }
        await new Promise((r) => setTimeout(r, pollIntervalMs));
      }
    }
  }
  try {
    {
      return await fn();
    }
  }
  finally {
    {
      await fs.promises.unlink(lockPath).catch(() => undefined);
    }
  }
}
export async function updateSessionStoreEntry(params) {
  const {storePath, sessionKey, update} = params;
  return await withSessionStoreLock(storePath, async () => {
    const store = loadSessionStore(storePath);
    const existing = store[sessionKey];
    if (!existing) {
      return null;
    }
    const patch = await update(existing);
    if (!patch) {
      return existing;
    }
    const next = mergeSessionEntry(existing, patch);
    store[sessionKey] = next;
    await saveSessionStoreUnlocked(storePath, store);
    return next;
  });
}

export async function recordSessionMetaFromInbound(params) {
  const {storePath, sessionKey, ctx} = params;
  const createIfMissing = (params.createIfMissing ?? true);
  return await updateSessionStore(storePath, (store) => {
    const existing = store[sessionKey];
    const patch = deriveSessionMetaPatch({ ctx, sessionKey, existing, groupResolution: params.groupResolution });
    if (!patch) {
      return (existing ?? null);
    }
    if ((!existing && !createIfMissing)) {
      return null;
    }
    const next = mergeSessionEntry(existing, patch);
    store[sessionKey] = next;
    return next;
  });
}

export async function updateLastRoute(params) {
  const {storePath, sessionKey, channel, to, accountId, threadId, ctx} = params;
  return await withSessionStoreLock(storePath, async () => {
    const store = loadSessionStore(storePath);
    const existing = store[sessionKey];
    const now = Date.now();
    const explicitContext = normalizeDeliveryContext(params.deliveryContext);
    const inlineContext = normalizeDeliveryContext({ channel, to, accountId, threadId });
    const mergedInput = mergeDeliveryContext(explicitContext, inlineContext);
    const merged = mergeDeliveryContext(mergedInput, deliveryContextFromSession(existing));
    const normalized = normalizeSessionDeliveryFields({ deliveryContext: { channel: merged?.channel, to: merged?.to, accountId: merged?.accountId, threadId: merged?.threadId } });
    const metaPatch = ctx ? deriveSessionMetaPatch({ ctx, sessionKey, existing, groupResolution: params.groupResolution }) : null;
    const basePatch = { updatedAt: Math.max((existing?.updatedAt ?? 0), now), deliveryContext: normalized.deliveryContext, lastChannel: normalized.lastChannel, lastTo: normalized.lastTo, lastAccountId: normalized.lastAccountId, lastThreadId: normalized.lastThreadId };
    const next = mergeSessionEntry(existing, metaPatch ? { ...basePatch: , ...metaPatch:  } : basePatch);
    store[sessionKey] = next;
    await saveSessionStoreUnlocked(storePath, store);
    return next;
  });
}

