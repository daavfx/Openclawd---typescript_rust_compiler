export function scheduleChatScroll(host, force = false) {
  if (host.chatScrollFrame) {
    cancelAnimationFrame(host.chatScrollFrame);
  }
  if ((host.chatScrollTimeout != null)) {
    clearTimeout(host.chatScrollTimeout);
    host.chatScrollTimeout = null;
  }
  const pickScrollTarget = () => {
    const container = host.querySelector(".chat-thread");
    if (container) {
      const overflowY = getComputedStyle(container).overflowY;
      const canScroll = (((overflowY === "auto") || (overflowY === "scroll")) || ((container.scrollHeight - container.clientHeight) > 1));
      if (canScroll) {
        return container;
      }
    }
    return (document.scrollingElement ?? document.documentElement);
  };
  void host.updateComplete.then(() => {
    host.chatScrollFrame = requestAnimationFrame(() => {
      host.chatScrollFrame = null;
      const target = pickScrollTarget();
      if (!target) {
        return;
      }
      const distanceFromBottom = ((target.scrollHeight - target.scrollTop) - target.clientHeight);
      const shouldStick = ((force || host.chatUserNearBottom) || (distanceFromBottom < 200));
      if (!shouldStick) {
        return;
      }
      if (force) {
        host.chatHasAutoScrolled = true;
      }
      target.scrollTop = target.scrollHeight;
      host.chatUserNearBottom = true;
      const retryDelay = force ? 150 : 120;
      host.chatScrollTimeout = window.setTimeout(() => {
        host.chatScrollTimeout = null;
        const latest = pickScrollTarget();
        if (!latest) {
          return;
        }
        const latestDistanceFromBottom = ((latest.scrollHeight - latest.scrollTop) - latest.clientHeight);
        const shouldStickRetry = ((force || host.chatUserNearBottom) || (latestDistanceFromBottom < 200));
        if (!shouldStickRetry) {
          return;
        }
        latest.scrollTop = latest.scrollHeight;
        host.chatUserNearBottom = true;
      }, retryDelay);
    });
  });
}

export function scheduleLogsScroll(host, force = false) {
  if (host.logsScrollFrame) {
    cancelAnimationFrame(host.logsScrollFrame);
  }
  void host.updateComplete.then(() => {
    host.logsScrollFrame = requestAnimationFrame(() => {
      host.logsScrollFrame = null;
      const container = host.querySelector(".log-stream");
      if (!container) {
        return;
      }
      const distanceFromBottom = ((container.scrollHeight - container.scrollTop) - container.clientHeight);
      const shouldStick = (force || (distanceFromBottom < 80));
      if (!shouldStick) {
        return;
      }
      container.scrollTop = container.scrollHeight;
    });
  });
}

export function handleChatScroll(host, event) {
  const container = event.currentTarget;
  if (!container) {
    return;
  }
  const distanceFromBottom = ((container.scrollHeight - container.scrollTop) - container.clientHeight);
  host.chatUserNearBottom = (distanceFromBottom < 200);
}

export function handleLogsScroll(host, event) {
  const container = event.currentTarget;
  if (!container) {
    return;
  }
  const distanceFromBottom = ((container.scrollHeight - container.scrollTop) - container.clientHeight);
  host.logsAtBottom = (distanceFromBottom < 80);
}

export function resetChatScroll(host) {
  host.chatHasAutoScrolled = false;
  host.chatUserNearBottom = true;
}

export function exportLogs(lines, label) {
  if ((lines.length === 0)) {
    return;
  }
  const blob = new Blob(["
"], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  anchor.href = url;
  anchor.download = "openclaw-logs--.log";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function observeTopbar(host) {
  if ((typeof ResizeObserver === "undefined")) {
    return;
  }
  const topbar = host.querySelector(".topbar");
  if (!topbar) {
    return;
  }
  const update = () => {
    const {height} = topbar.getBoundingClientRect();
    host.style.setProperty("--topbar-height", "px");
  };
  update();
  host.topbarObserver = new ResizeObserver(() => update());
  host.topbarObserver.observe(topbar);
}

