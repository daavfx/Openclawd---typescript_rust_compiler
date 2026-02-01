import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as ssrf from "../../infra/net/ssrf.js";
import { createWebFetchTool } from "./web-tools.js";
function makeHeaders(map) {
  return { get: (key) => (map[key.toLowerCase()] ?? null) };
}
function htmlResponse(html, url = "https://example.com/") {
  return { ok: true, status: 200, url, headers: makeHeaders({ "content-type": "text/html; charset=utf-8" }), text: async () => html };
}
function firecrawlResponse(markdown, url = "https://example.com/") {
  return { ok: true, status: 200, json: async () => { success: true, data: { markdown, metadata: { title: "Firecrawl Title", sourceURL: url, statusCode: 200 } } } };
}
function firecrawlError() {
  return { ok: false, status: 403, json: async () => { success: false, error: "blocked" } };
}
function errorHtmlResponse(html, status = 404, url = "https://example.com/", contentType = "text/html; charset=utf-8") {
  return { ok: false, status, url, headers: contentType ? makeHeaders({ "content-type": contentType }) : makeHeaders({  }), text: async () => html };
}
function requestUrl(input) {
  if ((typeof input === "string")) {
    return input;
  }
  if ((input instanceof URL)) {
    return input.toString();
  }
  if ((("url" in input) && (typeof input.url === "string"))) {
    return input.url;
  }
  return "";
}
describe("web_fetch extraction fallbacks", () => {
  const priorFetch = global.fetch;
  beforeEach(() => {
    vi.spyOn(ssrf, "resolvePinnedHostname").mockImplementation(async (hostname) => {
      const normalized = hostname.trim().toLowerCase().replace(/\.$/, "");
      const addresses = ["93.184.216.34", "93.184.216.35"];
      return { hostname: normalized, addresses, lookup: ssrf.createPinnedLookup({ hostname: normalized, addresses }) };
    });
  });
  afterEach(() => {
    global.fetch = priorFetch;
    vi.restoreAllMocks();
  });
  it("falls back to firecrawl when readability returns no content", async () => {
    const mockFetch = vi.fn((input) => {
      const url = requestUrl(input);
      if (url.includes("api.firecrawl.dev")) {
        return Promise.resolve(firecrawlResponse("firecrawl content"));
      }
      return Promise.resolve(htmlResponse("<!doctype html><html><head></head><body></body></html>", url));
    });
    global.fetch = mockFetch;
    const tool = createWebFetchTool({ config: { tools: { web: { fetch: { cacheTtlMinutes: 0, firecrawl: { apiKey: "firecrawl-test" } } } } }, sandboxed: false });
    const result = await tool?.execute?.("call", { url: "https://example.com/empty" });
    const details = result?.details;
    expect(details.extractor).toBe("firecrawl");
    expect(details.text).toContain("firecrawl content");
  });
  it("throws when readability is disabled and firecrawl is unavailable", async () => {
    const mockFetch = vi.fn((input) => Promise.resolve(htmlResponse("<html><body>hi</body></html>", requestUrl(input))));
    global.fetch = mockFetch;
    const tool = createWebFetchTool({ config: { tools: { web: { fetch: { readability: false, cacheTtlMinutes: 0, firecrawl: { enabled: false } } } } }, sandboxed: false });
    await expect(tool?.execute?.("call", { url: "https://example.com/readability-off" })).rejects.toThrow("Readability disabled");
  });
  it("throws when readability is empty and firecrawl fails", async () => {
    const mockFetch = vi.fn((input) => {
      const url = requestUrl(input);
      if (url.includes("api.firecrawl.dev")) {
        return Promise.resolve(firecrawlError());
      }
      return Promise.resolve(htmlResponse("<!doctype html><html><head></head><body></body></html>", url));
    });
    global.fetch = mockFetch;
    const tool = createWebFetchTool({ config: { tools: { web: { fetch: { cacheTtlMinutes: 0, firecrawl: { apiKey: "firecrawl-test" } } } } }, sandboxed: false });
    await expect(tool?.execute?.("call", { url: "https://example.com/readability-empty" })).rejects.toThrow("Readability and Firecrawl returned no content");
  });
  it("uses firecrawl when direct fetch fails", async () => {
    const mockFetch = vi.fn((input) => {
      const url = requestUrl(input);
      if (url.includes("api.firecrawl.dev")) {
        return Promise.resolve(firecrawlResponse("firecrawl fallback", url));
      }
      return Promise.resolve({ ok: false, status: 403, headers: makeHeaders({ "content-type": "text/html" }), text: async () => "blocked" });
    });
    global.fetch = mockFetch;
    const tool = createWebFetchTool({ config: { tools: { web: { fetch: { cacheTtlMinutes: 0, firecrawl: { apiKey: "firecrawl-test" } } } } }, sandboxed: false });
    const result = await tool?.execute?.("call", { url: "https://example.com/blocked" });
    const details = result?.details;
    expect(details.extractor).toBe("firecrawl");
    expect(details.text).toContain("firecrawl fallback");
  });
  it("strips and truncates HTML from error responses", async () => {
    const long = "x".repeat(12000);
    const html = (("<!doctype html><html><head><title>Not Found</title></head><body><h1>Not Found</h1><p>" + long) + "</p></body></html>");
    const mockFetch = vi.fn((input) => Promise.resolve(errorHtmlResponse(html, 404, requestUrl(input), "Text/HTML; charset=utf-8")));
    global.fetch = mockFetch;
    const tool = createWebFetchTool({ config: { tools: { web: { fetch: { cacheTtlMinutes: 0, firecrawl: { enabled: false } } } } }, sandboxed: false });
    let message = "";
    try {
      {
        await tool?.execute?.("call", { url: "https://example.com/missing" });
      }
    }
    catch (error) {
      {
        message = error.message;
      }
    }
    expect(message).toContain("Web fetch failed (404):");
    expect(message).toContain("Not Found");
    expect(message).not.toContain("<html");
    expect(message.length).toBeLessThan(5000);
  });
  it("strips HTML errors when content-type is missing", async () => {
    const html = "<!DOCTYPE HTML><html><head><title>Oops</title></head><body><h1>Oops</h1></body></html>";
    const mockFetch = vi.fn((input) => Promise.resolve(errorHtmlResponse(html, 500, requestUrl(input), null)));
    global.fetch = mockFetch;
    const tool = createWebFetchTool({ config: { tools: { web: { fetch: { cacheTtlMinutes: 0, firecrawl: { enabled: false } } } } }, sandboxed: false });
    await expect(tool?.execute?.("call", { url: "https://example.com/oops" })).rejects.toThrow(/Web fetch failed \(500\):.*Oops/);
  });
});
