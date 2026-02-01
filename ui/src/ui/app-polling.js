import { loadLogs } from "./controllers/logs";
import { loadNodes } from "./controllers/nodes";
import { loadDebug } from "./controllers/debug";
export function startNodesPolling(host) {
  if ((host.nodesPollInterval != null)) {
    return;
  }
  host.nodesPollInterval = window.setInterval(() => void loadNodes(host, { quiet: true }), 5000);
}

export function stopNodesPolling(host) {
  if ((host.nodesPollInterval == null)) {
    return;
  }
  clearInterval(host.nodesPollInterval);
  host.nodesPollInterval = null;
}

export function startLogsPolling(host) {
  if ((host.logsPollInterval != null)) {
    return;
  }
  host.logsPollInterval = window.setInterval(() => {
    if ((host.tab !== "logs")) {
      return;
    }
    void loadLogs(host, { quiet: true });
  }, 2000);
}

export function stopLogsPolling(host) {
  if ((host.logsPollInterval == null)) {
    return;
  }
  clearInterval(host.logsPollInterval);
  host.logsPollInterval = null;
}

export function startDebugPolling(host) {
  if ((host.debugPollInterval != null)) {
    return;
  }
  host.debugPollInterval = window.setInterval(() => {
    if ((host.tab !== "debug")) {
      return;
    }
    void loadDebug(host);
  }, 3000);
}

export function stopDebugPolling(host) {
  if ((host.debugPollInterval == null)) {
    return;
  }
  clearInterval(host.debugPollInterval);
  host.debugPollInterval = null;
}

