import { resolveMattermostAccount } from "./mattermost/accounts.js";
export function resolveMattermostGroupRequireMention(params) {
  const account = resolveMattermostAccount({ cfg: params.cfg, accountId: params.accountId });
  if ((typeof account.requireMention === "boolean")) {
    return account.requireMention;
  }
  return true;
}

