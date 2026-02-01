import { fetchJson } from "./provider-usage.fetch.shared.js";
import { clampPercent, PROVIDER_LABELS } from "./provider-usage.shared.js";
export async function fetchZaiUsage(apiKey, timeoutMs, fetchFn) {
  const res = await fetchJson("https://api.z.ai/api/monitor/usage/quota/limit", { method: "GET", headers: { Authorization: "Bearer ", Accept: "application/json" } }, timeoutMs, fetchFn);
  if (!res.ok) {
    return { provider: "zai", displayName: PROVIDER_LABELS.zai, windows: [], error: "HTTP " };
  }
  const data = await res.json();
  if ((!data.success || (data.code !== 200))) {
    return { provider: "zai", displayName: PROVIDER_LABELS.zai, windows: [], error: (data.msg || "API error") };
  }
  const windows = [];
  const limits = (data.data?.limits || []);
  for (const limit of limits) {
    const percent = clampPercent((limit.percentage || 0));
    const nextReset = limit.nextResetTime ? new Date(limit.nextResetTime).getTime() : undefined;
    let windowLabel = "Limit";
    if ((limit.unit === 1)) {
      windowLabel = "d";
    } else {
      if ((limit.unit === 3)) {
        windowLabel = "h";
      } else {
        if ((limit.unit === 5)) {
          windowLabel = "m";
        }
      }
    }
    if ((limit.type === "TOKENS_LIMIT")) {
      windows.push({ label: "Tokens ()", usedPercent: percent, resetAt: nextReset });
    } else {
      if ((limit.type === "TIME_LIMIT")) {
        windows.push({ label: "Monthly", usedPercent: percent, resetAt: nextReset });
      }
    }
  }
  const planName = ((data.data?.planName || data.data?.plan) || undefined);
  return { provider: "zai", displayName: PROVIDER_LABELS.zai, windows, plan: planName };
}

