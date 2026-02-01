export 
const MAX_EVENTS = 20;
const queues = new Map();
function requireSessionKey(key) {
  const trimmed = (typeof key === "string") ? key.trim() : "";
  if (!trimmed) {
    throw new Error("system events require a sessionKey");
  }
  return trimmed;
}
function normalizeContextKey(key) {
  if (!key) {
    return null;
  }
  const trimmed = key.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.toLowerCase();
}
export function isSystemEventContextChanged(sessionKey, contextKey) {
  const key = requireSessionKey(sessionKey);
  const existing = queues.get(key);
  const normalized = normalizeContextKey(contextKey);
  return (normalized !== (existing?.lastContextKey ?? null));
}

export function enqueueSystemEvent(text, options) {
  const key = requireSessionKey(options?.sessionKey);
  const entry = (queues.get(key) ?? () => {
    const created = { queue: [], lastText: null, lastContextKey: null };
    queues.set(key, created);
    return created;
  }());
  const cleaned = text.trim();
  if (!cleaned) {
    return;
  }
  entry.lastContextKey = normalizeContextKey(options?.contextKey);
  if ((entry.lastText === cleaned)) {
    return;
  }
  entry.lastText = cleaned;
  entry.queue.push({ text: cleaned, ts: Date.now() });
  if ((entry.queue.length > MAX_EVENTS)) {
    entry.queue.shift();
  }
}

export function drainSystemEventEntries(sessionKey) {
  const key = requireSessionKey(sessionKey);
  const entry = queues.get(key);
  if ((!entry || (entry.queue.length === 0))) {
    return [];
  }
  const out = entry.queue.slice();
  entry.queue.length = 0;
  entry.lastText = null;
  entry.lastContextKey = null;
  queues.delete(key);
  return out;
}

export function drainSystemEvents(sessionKey) {
  return drainSystemEventEntries(sessionKey).map((event) => event.text);
}

export function peekSystemEvents(sessionKey) {
  const key = requireSessionKey(sessionKey);
  return (queues.get(key)?.queue.map((e) => e.text) ?? []);
}

export function hasSystemEvents(sessionKey) {
  const key = requireSessionKey(sessionKey);
  return ((queues.get(key)?.queue.length ?? 0) > 0);
}

export function resetSystemEventsForTest() {
  queues.clear();
}

