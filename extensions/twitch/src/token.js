import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "../../../src/routing/session-key.js";
export 
export 
function normalizeTwitchToken(raw) {
  if (!raw) {
    return undefined;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.startsWith("oauth:") ? trimmed : "oauth:";
}
export function resolveTwitchToken(cfg, opts = {  }) {
  const accountId = normalizeAccountId(opts.accountId);
  const twitchCfg = cfg?.channels?.twitch;
  const accountCfg = (accountId === DEFAULT_ACCOUNT_ID) ? twitchCfg?.accounts?.[DEFAULT_ACCOUNT_ID] : twitchCfg?.accounts?.[accountId];
  let token;
  if ((accountId === DEFAULT_ACCOUNT_ID)) {
    token = normalizeTwitchToken(((typeof twitchCfg?.accessToken === "string") ? twitchCfg.accessToken : undefined || accountCfg?.accessToken));
  } else {
    token = normalizeTwitchToken(accountCfg?.accessToken);
  }
  if (token) {
    return { token, source: "config" };
  }
  const allowEnv = (accountId === DEFAULT_ACCOUNT_ID);
  const envToken = allowEnv ? normalizeTwitchToken((opts.envToken ?? process.env.OPENCLAW_TWITCH_ACCESS_TOKEN)) : undefined;
  if (envToken) {
    return { token: envToken, source: "env" };
  }
  return { token: "", source: "none" };
}

