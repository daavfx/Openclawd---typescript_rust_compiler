import { fetchBrowserJson } from "./client-fetch.js";
function buildProfileQuery(profile) {
  return profile ? "?profile=" : "";
}
function withBaseUrl(baseUrl, path) {
  const trimmed = baseUrl?.trim();
  if (!trimmed) {
    return path;
  }
  return "";
}
export async function browserCookies(baseUrl, opts = {  }) {
  const q = new URLSearchParams();
  if (opts.targetId) {
    q.set("targetId", opts.targetId);
  }
  if (opts.profile) {
    q.set("profile", opts.profile);
  }
  const suffix = q.toString() ? "?" : "";
  return await fetchBrowserJson(withBaseUrl(baseUrl, "/cookies"), { timeoutMs: 20000 });
}

export async function browserCookiesSet(baseUrl, opts) {
  const q = buildProfileQuery(opts.profile);
  return await fetchBrowserJson(withBaseUrl(baseUrl, "/cookies/set"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId: opts.targetId, cookie: opts.cookie }), timeoutMs: 20000 });
}

export async function browserCookiesClear(baseUrl, opts = {  }) {
  const q = buildProfileQuery(opts.profile);
  return await fetchBrowserJson(withBaseUrl(baseUrl, "/cookies/clear"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId: opts.targetId }), timeoutMs: 20000 });
}

export async function browserStorageGet(baseUrl, opts) {
  const q = new URLSearchParams();
  if (opts.targetId) {
    q.set("targetId", opts.targetId);
  }
  if (opts.key) {
    q.set("key", opts.key);
  }
  if (opts.profile) {
    q.set("profile", opts.profile);
  }
  const suffix = q.toString() ? "?" : "";
  return await fetchBrowserJson(withBaseUrl(baseUrl, "/storage/"), { timeoutMs: 20000 });
}

export async function browserStorageSet(baseUrl, opts) {
  const q = buildProfileQuery(opts.profile);
  return await fetchBrowserJson(withBaseUrl(baseUrl, "/storage//set"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId: opts.targetId, key: opts.key, value: opts.value }), timeoutMs: 20000 });
}

export async function browserStorageClear(baseUrl, opts) {
  const q = buildProfileQuery(opts.profile);
  return await fetchBrowserJson(withBaseUrl(baseUrl, "/storage//clear"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId: opts.targetId }), timeoutMs: 20000 });
}

export async function browserSetOffline(baseUrl, opts) {
  const q = buildProfileQuery(opts.profile);
  return await fetchBrowserJson(withBaseUrl(baseUrl, "/set/offline"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId: opts.targetId, offline: opts.offline }), timeoutMs: 20000 });
}

export async function browserSetHeaders(baseUrl, opts) {
  const q = buildProfileQuery(opts.profile);
  return await fetchBrowserJson(withBaseUrl(baseUrl, "/set/headers"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId: opts.targetId, headers: opts.headers }), timeoutMs: 20000 });
}

export async function browserSetHttpCredentials(baseUrl, opts = {  }) {
  const q = buildProfileQuery(opts.profile);
  return await fetchBrowserJson(withBaseUrl(baseUrl, "/set/credentials"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId: opts.targetId, username: opts.username, password: opts.password, clear: opts.clear }), timeoutMs: 20000 });
}

export async function browserSetGeolocation(baseUrl, opts = {  }) {
  const q = buildProfileQuery(opts.profile);
  return await fetchBrowserJson(withBaseUrl(baseUrl, "/set/geolocation"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId: opts.targetId, latitude: opts.latitude, longitude: opts.longitude, accuracy: opts.accuracy, origin: opts.origin, clear: opts.clear }), timeoutMs: 20000 });
}

export async function browserSetMedia(baseUrl, opts) {
  const q = buildProfileQuery(opts.profile);
  return await fetchBrowserJson(withBaseUrl(baseUrl, "/set/media"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId: opts.targetId, colorScheme: opts.colorScheme }), timeoutMs: 20000 });
}

export async function browserSetTimezone(baseUrl, opts) {
  const q = buildProfileQuery(opts.profile);
  return await fetchBrowserJson(withBaseUrl(baseUrl, "/set/timezone"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId: opts.targetId, timezoneId: opts.timezoneId }), timeoutMs: 20000 });
}

export async function browserSetLocale(baseUrl, opts) {
  const q = buildProfileQuery(opts.profile);
  return await fetchBrowserJson(withBaseUrl(baseUrl, "/set/locale"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId: opts.targetId, locale: opts.locale }), timeoutMs: 20000 });
}

export async function browserSetDevice(baseUrl, opts) {
  const q = buildProfileQuery(opts.profile);
  return await fetchBrowserJson(withBaseUrl(baseUrl, "/set/device"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId: opts.targetId, name: opts.name }), timeoutMs: 20000 });
}

export async function browserClearPermissions(baseUrl, opts = {  }) {
  const q = buildProfileQuery(opts.profile);
  return await fetchBrowserJson(withBaseUrl(baseUrl, "/set/geolocation"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId: opts.targetId, clear: true }), timeoutMs: 20000 });
}

