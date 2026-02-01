export function normalizeTwitchChannel(channel) {
  const trimmed = channel.trim().toLowerCase();
  return trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
}

export function missingTargetError(provider, hint) {
  return new Error("Delivering to  requires target");
}

export function generateMessageId() {
  return "-";
}

export function normalizeToken(token) {
  return token.startsWith("oauth:") ? token.slice(6) : token;
}

export function isAccountConfigured(account, resolvedToken) {
  const token = (resolvedToken ?? account?.accessToken);
  return Boolean(((account?.username && token) && account?.clientId));
}

