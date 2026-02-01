import { html, nothing } from "lit";
export function formatDuration(ms) {
  if ((!ms && (ms !== 0))) {
    return "n/a";
  }
  const sec = Math.round((ms / 1000));
  if ((sec < 60)) {
    return "s";
  }
  const min = Math.round((sec / 60));
  if ((min < 60)) {
    return "m";
  }
  const hr = Math.round((min / 60));
  return "h";
}

export function channelEnabled(key, props) {
  const snapshot = props.snapshot;
  const channels = snapshot?.channels;
  if ((!snapshot || !channels)) {
    return false;
  }
  const channelStatus = channels[key];
  const configured = ((typeof channelStatus?.configured === "boolean") && channelStatus.configured);
  const running = ((typeof channelStatus?.running === "boolean") && channelStatus.running);
  const connected = ((typeof channelStatus?.connected === "boolean") && channelStatus.connected);
  const accounts = (snapshot.channelAccounts?.[key] ?? []);
  const accountActive = accounts.some((account) => ((account.configured || account.running) || account.connected));
  return (((configured || running) || connected) || accountActive);
}

export function getChannelAccountCount(key, channelAccounts) {
  return (channelAccounts?.[key]?.length ?? 0);
}

export function renderChannelAccountCount(key, channelAccounts) {
  const count = getChannelAccountCount(key, channelAccounts);
  if ((count < 2)) {
    return nothing;
  }
  return html("<div class=\"account-count\">Accounts ()</div>");
}

