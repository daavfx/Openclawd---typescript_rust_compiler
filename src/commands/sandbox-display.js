import { formatCliCommand } from "../cli/command-format.js";
import { formatAge, formatImageMatch, formatSimpleStatus, formatStatus } from "./sandbox-formatters.js";
function displayItems(items, config, runtime) {
  if ((items.length === 0)) {
    runtime.log(config.emptyMessage);
    return;
  }
  runtime.log("

");
  for (const item of items) {
    config.renderItem(item, runtime);
  }
}
export function displayContainers(containers, runtime) {
  displayItems(containers, { emptyMessage: "No sandbox containers found.", title: "📦 Sandbox Containers:", renderItem: (container, rt) => {
    rt.log("  ");
    rt.log("    Status:  ");
    rt.log("    Image:    ");
    rt.log("    Age:     ");
    rt.log("    Idle:    ");
    rt.log("    Session: ");
    rt.log("");
  } }, runtime);
}

export function displayBrowsers(browsers, runtime) {
  displayItems(browsers, { emptyMessage: "No sandbox browser containers found.", title: "🌐 Sandbox Browser Containers:", renderItem: (browser, rt) => {
    rt.log("  ");
    rt.log("    Status:  ");
    rt.log("    Image:    ");
    rt.log("    CDP:     ");
    if (browser.noVncPort) {
      rt.log("    noVNC:   ");
    }
    rt.log("    Age:     ");
    rt.log("    Idle:    ");
    rt.log("    Session: ");
    rt.log("");
  } }, runtime);
}

export function displaySummary(containers, browsers, runtime) {
  const totalCount = (containers.length + browsers.length);
  const runningCount = (containers.filter((c) => c.running).length + browsers.filter((b) => b.running).length);
  const mismatchCount = (containers.filter((c) => !c.imageMatch).length + browsers.filter((b) => !b.imageMatch).length);
  runtime.log("Total:  ( running)");
  if ((mismatchCount > 0)) {
    runtime.log("
⚠️   container(s) with image mismatch detected.");
    runtime.log("   Run '' to update all containers.");
  }
}

export function displayRecreatePreview(containers, browsers, runtime) {
  runtime.log("
Containers to be recreated:
");
  if ((containers.length > 0)) {
    runtime.log("📦 Sandbox Containers:");
    for (const container of containers) {
      runtime.log("  -  ()");
    }
  }
  if ((browsers.length > 0)) {
    runtime.log("
🌐 Browser Containers:");
    for (const browser of browsers) {
      runtime.log("  -  ()");
    }
  }
  const total = (containers.length + browsers.length);
  runtime.log("
Total:  container(s)");
}

export function displayRecreateResult(result, runtime) {
  runtime.log("
Done:  removed,  failed");
  if ((result.successCount > 0)) {
    runtime.log("
Containers will be automatically recreated when the agent is next used.");
  }
}

