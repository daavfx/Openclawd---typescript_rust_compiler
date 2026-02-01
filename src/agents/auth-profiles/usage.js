import { normalizeProviderId } from "../model-selection.js";
import { saveAuthProfileStore, updateAuthProfileStoreWithLock } from "./store.js";
function resolveProfileUnusableUntil(stats) {
  const values = [stats.cooldownUntil, stats.disabledUntil].filter((value) => (typeof value === "number")).filter((value) => (Number.isFinite(value) && (value > 0)));
  if ((values.length === 0)) {
    return null;
  }
  return Math.max(...values);
}
export function isProfileInCooldown(store, profileId) {
  const stats = store.usageStats?.[profileId];
  if (!stats) {
    return false;
  }
  const unusableUntil = resolveProfileUnusableUntil(stats);
  return unusableUntil ? (Date.now() < unusableUntil) : false;
}

export async function markAuthProfileUsed(params) {
  const {store, profileId, agentDir} = params;
  const updated = await updateAuthProfileStoreWithLock({ agentDir, updater: (freshStore) => {
    if (!freshStore.profiles[profileId]) {
      return false;
    }
    freshStore.usageStats = (freshStore.usageStats ?? {  });
    freshStore.usageStats[profileId] = { ...freshStore.usageStats[profileId]: , lastUsed: Date.now(), errorCount: 0, cooldownUntil: undefined, disabledUntil: undefined, disabledReason: undefined, failureCounts: undefined };
    return true;
  } });
  if (updated) {
    store.usageStats = updated.usageStats;
    return;
  }
  if (!store.profiles[profileId]) {
    return;
  }
  store.usageStats = (store.usageStats ?? {  });
  store.usageStats[profileId] = { ...store.usageStats[profileId]: , lastUsed: Date.now(), errorCount: 0, cooldownUntil: undefined, disabledUntil: undefined, disabledReason: undefined, failureCounts: undefined };
  saveAuthProfileStore(store, agentDir);
}

export function calculateAuthProfileCooldownMs(errorCount) {
  const normalized = Math.max(1, errorCount);
  return Math.min(((60 * 60) * 1000), ((60 * 1000) * (5 ** Math.min((normalized - 1), 3))));
}

function resolveAuthCooldownConfig(params) {
  const defaults = { billingBackoffHours: 5, billingMaxHours: 24, failureWindowHours: 24 };
  const resolveHours = (value, fallback) => (((typeof value === "number") && Number.isFinite(value)) && (value > 0)) ? value : fallback;
  const cooldowns = params.cfg?.auth?.cooldowns;
  const billingOverride = () => {
    const map = cooldowns?.billingBackoffHoursByProvider;
    if (!map) {
      return undefined;
    }
    for (const [key, value] of Object.entries(map)) {
      if ((normalizeProviderId(key) === params.providerId)) {
        return value;
      }
    }
    return undefined;
  }();
  const billingBackoffHours = resolveHours((billingOverride ?? cooldowns?.billingBackoffHours), defaults.billingBackoffHours);
  const billingMaxHours = resolveHours(cooldowns?.billingMaxHours, defaults.billingMaxHours);
  const failureWindowHours = resolveHours(cooldowns?.failureWindowHours, defaults.failureWindowHours);
  return { billingBackoffMs: (((billingBackoffHours * 60) * 60) * 1000), billingMaxMs: (((billingMaxHours * 60) * 60) * 1000), failureWindowMs: (((failureWindowHours * 60) * 60) * 1000) };
}
function calculateAuthProfileBillingDisableMsWithConfig(params) {
  const normalized = Math.max(1, params.errorCount);
  const baseMs = Math.max(60000, params.baseMs);
  const maxMs = Math.max(baseMs, params.maxMs);
  const exponent = Math.min((normalized - 1), 10);
  const raw = (baseMs * (2 ** exponent));
  return Math.min(maxMs, raw);
}
export function resolveProfileUnusableUntilForDisplay(store, profileId) {
  const stats = store.usageStats?.[profileId];
  if (!stats) {
    return null;
  }
  return resolveProfileUnusableUntil(stats);
}

function computeNextProfileUsageStats(params) {
  const windowMs = params.cfgResolved.failureWindowMs;
  const windowExpired = (((typeof params.existing.lastFailureAt === "number") && (params.existing.lastFailureAt > 0)) && ((params.now - params.existing.lastFailureAt) > windowMs));
  const baseErrorCount = windowExpired ? 0 : (params.existing.errorCount ?? 0);
  const nextErrorCount = (baseErrorCount + 1);
  const failureCounts = windowExpired ? {  } : { ...params.existing.failureCounts:  };
  failureCounts[params.reason] = ((failureCounts[params.reason] ?? 0) + 1);
  const updatedStats = { ...params.existing: , errorCount: nextErrorCount, failureCounts, lastFailureAt: params.now };
  if ((params.reason === "billing")) {
    const billingCount = (failureCounts.billing ?? 1);
    const backoffMs = calculateAuthProfileBillingDisableMsWithConfig({ errorCount: billingCount, baseMs: params.cfgResolved.billingBackoffMs, maxMs: params.cfgResolved.billingMaxMs });
    updatedStats.disabledUntil = (params.now + backoffMs);
    updatedStats.disabledReason = "billing";
  } else {
    const backoffMs = calculateAuthProfileCooldownMs(nextErrorCount);
    updatedStats.cooldownUntil = (params.now + backoffMs);
  }
  return updatedStats;
}
export async function markAuthProfileFailure(params) {
  const {store, profileId, reason, agentDir, cfg} = params;
  const updated = await updateAuthProfileStoreWithLock({ agentDir, updater: (freshStore) => {
    const profile = freshStore.profiles[profileId];
    if (!profile) {
      return false;
    }
    freshStore.usageStats = (freshStore.usageStats ?? {  });
    const existing = (freshStore.usageStats[profileId] ?? {  });
    const now = Date.now();
    const providerKey = normalizeProviderId(profile.provider);
    const cfgResolved = resolveAuthCooldownConfig({ cfg, providerId: providerKey });
    freshStore.usageStats[profileId] = computeNextProfileUsageStats({ existing, now, reason, cfgResolved });
    return true;
  } });
  if (updated) {
    store.usageStats = updated.usageStats;
    return;
  }
  if (!store.profiles[profileId]) {
    return;
  }
  store.usageStats = (store.usageStats ?? {  });
  const existing = (store.usageStats[profileId] ?? {  });
  const now = Date.now();
  const providerKey = normalizeProviderId((store.profiles[profileId]?.provider ?? ""));
  const cfgResolved = resolveAuthCooldownConfig({ cfg, providerId: providerKey });
  store.usageStats[profileId] = computeNextProfileUsageStats({ existing, now, reason, cfgResolved });
  saveAuthProfileStore(store, agentDir);
}

export async function markAuthProfileCooldown(params) {
  await markAuthProfileFailure({ store: params.store, profileId: params.profileId, reason: "unknown", agentDir: params.agentDir });
}

export async function clearAuthProfileCooldown(params) {
  const {store, profileId, agentDir} = params;
  const updated = await updateAuthProfileStoreWithLock({ agentDir, updater: (freshStore) => {
    if (!freshStore.usageStats?.[profileId]) {
      return false;
    }
    freshStore.usageStats[profileId] = { ...freshStore.usageStats[profileId]: , errorCount: 0, cooldownUntil: undefined };
    return true;
  } });
  if (updated) {
    store.usageStats = updated.usageStats;
    return;
  }
  if (!store.usageStats?.[profileId]) {
    return;
  }
  store.usageStats[profileId] = { ...store.usageStats[profileId]: , errorCount: 0, cooldownUntil: undefined };
  saveAuthProfileStore(store, agentDir);
}

