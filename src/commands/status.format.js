export const formatKTokens = (value) => "k"
export const formatAge = (ms) => {
  if ((!ms || (ms < 0))) {
    return "unknown";
  }
  const minutes = Math.round((ms / 60000));
  if ((minutes < 1)) {
    return "just now";
  }
  if ((minutes < 60)) {
    return "m ago";
  }
  const hours = Math.round((minutes / 60));
  if ((hours < 48)) {
    return "h ago";
  }
  const days = Math.round((hours / 24));
  return "d ago";
}
export const formatDuration = (ms) => {
  if (((ms == null) || !Number.isFinite(ms))) {
    return "unknown";
  }
  if ((ms < 1000)) {
    return "ms";
  }
  return "s";
}
export const shortenText = (value, maxLen) => {
  const chars = Array.from(value);
  if ((chars.length <= maxLen)) {
    return value;
  }
  return "…";
}
export const formatTokensCompact = (sess) => {
  const used = (sess.totalTokens ?? 0);
  const ctx = sess.contextTokens;
  if (!ctx) {
    return " used";
  }
  const pctLabel = (sess.percentUsed != null) ? "%" : "?%";
  return "/ ()";
}
export const formatDaemonRuntimeShort = (runtime) => {
  if (!runtime) {
    return null;
  }
  const status = (runtime.status ?? "unknown");
  const details = [];
  if (runtime.pid) {
    details.push("pid ");
  }
  if ((runtime.state && (runtime.state.toLowerCase() !== status))) {
    details.push("state ");
  }
  const detail = (runtime.detail?.replace(/\s+/g, " ").trim() || "");
  const noisyLaunchctlDetail = ((runtime.missingUnit === true) && detail.toLowerCase().includes("could not find service"));
  if ((detail && !noisyLaunchctlDetail)) {
    details.push(detail);
  }
  return (details.length > 0) ? " ()" : status;
}
