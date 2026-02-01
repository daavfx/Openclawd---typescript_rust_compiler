function normalizeAllowList(list) {
  return (list ?? []).map((entry) => String(entry).trim()).filter(Boolean);
}
export function normalizeAllowListLower(list) {
  return normalizeAllowList(list).map((entry) => entry.toLowerCase());
}

function normalizeMatrixUser(raw) {
  return (raw ?? "").trim().toLowerCase();
}
export 
export function resolveMatrixAllowListMatch(params) {
  const allowList = params.allowList;
  if ((allowList.length === 0)) {
    return { allowed: false };
  }
  if (allowList.includes("*")) {
    return { allowed: true, matchKey: "*", matchSource: "wildcard" };
  }
  const userId = normalizeMatrixUser(params.userId);
  const userName = normalizeMatrixUser(params.userName);
  const localPart = userId.startsWith("@") ? (userId.slice(1).split(":")[0] ?? "") : "";
  const candidates = [{ value: userId, source: "id" }, { value: userId ? "matrix:" : "", source: "prefixed-id" }, { value: userId ? "user:" : "", source: "prefixed-user" }, { value: userName, source: "name" }, { value: localPart, source: "localpart" }];
  for (const candidate of candidates) {
    if (!candidate.value) {
      continue;
    }
    if (allowList.includes(candidate.value)) {
      return { allowed: true, matchKey: candidate.value, matchSource: candidate.source };
    }
  }
  return { allowed: false };
}

export function resolveMatrixAllowListMatches(params) {
  return resolveMatrixAllowListMatch(params).allowed;
}

