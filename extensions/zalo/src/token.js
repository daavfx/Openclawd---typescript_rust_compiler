import { readFileSync } from "node:fs";
import { DEFAULT_ACCOUNT_ID } from "openclaw/plugin-sdk";
export 
export function resolveZaloToken(config, accountId) {
  const resolvedAccountId = (accountId ?? DEFAULT_ACCOUNT_ID);
  const isDefaultAccount = (resolvedAccountId === DEFAULT_ACCOUNT_ID);
  const baseConfig = config;
  const accountConfig = (resolvedAccountId !== DEFAULT_ACCOUNT_ID) ? baseConfig?.accounts?.[resolvedAccountId] : undefined;
  if (accountConfig) {
    const token = accountConfig.botToken?.trim();
    if (token) {
      return { token, source: "config" };
    }
    const tokenFile = accountConfig.tokenFile?.trim();
    if (tokenFile) {
      try {
        {
          const fileToken = readFileSync(tokenFile, "utf8").trim();
          if (fileToken) {
            return { token: fileToken, source: "configFile" };
          }
        }
      }
      catch {
        {
        }
      }
    }
  }
  if (isDefaultAccount) {
    const token = baseConfig?.botToken?.trim();
    if (token) {
      return { token, source: "config" };
    }
    const tokenFile = baseConfig?.tokenFile?.trim();
    if (tokenFile) {
      try {
        {
          const fileToken = readFileSync(tokenFile, "utf8").trim();
          if (fileToken) {
            return { token: fileToken, source: "configFile" };
          }
        }
      }
      catch {
        {
        }
      }
    }
    const envToken = process.env.ZALO_BOT_TOKEN?.trim();
    if (envToken) {
      return { token: envToken, source: "env" };
    }
  }
  return { token: "", source: "none" };
}

