import { formatAgo, formatDurationMs, formatMs } from "./format";
export function formatPresenceSummary(entry) {
  const host = (entry.host ?? "unknown");
  const ip = entry.ip ? "()" : "";
  const mode = (entry.mode ?? "");
  const version = (entry.version ?? "");
  return "   ".trim();
}

export function formatPresenceAge(entry) {
  const ts = (entry.ts ?? null);
  return ts ? formatAgo(ts) : "n/a";
}

export function formatNextRun(ms) {
  if (!ms) {
    return "n/a";
  }
  return " ()";
}

export function formatSessionTokens(row) {
  if ((row.totalTokens == null)) {
    return "n/a";
  }
  const total = (row.totalTokens ?? 0);
  const ctx = (row.contextTokens ?? 0);
  return ctx ? " / " : String(total);
}

export function formatEventPayload(payload) {
  if ((payload == null)) {
    return "";
  }
  try {
    {
      return JSON.stringify(payload, null, 2);
    }
  }
  catch {
    {
      return String(payload);
    }
  }
}

export function formatCronState(job) {
  const state = (job.state ?? {  });
  const next = state.nextRunAtMs ? formatMs(state.nextRunAtMs) : "n/a";
  const last = state.lastRunAtMs ? formatMs(state.lastRunAtMs) : "n/a";
  const status = (state.lastStatus ?? "n/a");
  return " · next  · last ";
}

export function formatCronSchedule(job) {
  const s = job.schedule;
  if ((s.kind === "at")) {
    return "At ";
  }
  if ((s.kind === "every")) {
    return "Every ";
  }
  return "Cron ";
}

export function formatCronPayload(job) {
  const p = job.payload;
  if ((p.kind === "systemEvent")) {
    return "System: ";
  }
  return "Agent: ";
}

