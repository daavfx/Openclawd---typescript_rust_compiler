import { createWebFetchTool } from "../src/agents/tools/web-tools.js";
const DEFAULT_URLS = ["https://example.com/", "https://news.ycombinator.com/", "https://www.reddit.com/r/javascript/", "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/User-Agent", "https://httpbin.org/html"];
const urls = process.argv.slice(2);
const targets = (urls.length > 0) ? urls : DEFAULT_URLS;
async function runFetch(url, readability) {
  if (!readability) {
    throw new Error("Basic extraction removed. Set readability=true or enable Firecrawl.");
  }
  const tool = createWebFetchTool({ config: { tools: { web: { fetch: { readability, cacheTtlMinutes: 0, firecrawl: { enabled: false } } } } }, sandboxed: false });
  if (!tool) {
    throw new Error("web_fetch tool is disabled");
  }
  const result = await tool.execute("test", { url, extractMode: "markdown" });
  return result.details;
}
function truncate(value, max = 160) {
  if (!value) {
    return "";
  }
  return (value.length > max) ? "…" : value;
}
async function run() {
  for (const url of targets) {
    console.log("
=== ");
    const readable = await runFetch(url, true);
    console.log("readability:  len= title=");
    if (readable.text) {
      console.log("readability sample: ");
    }
  }
}
run().catch((error) => {
  console.error(error);
  process.exit(1);
});
