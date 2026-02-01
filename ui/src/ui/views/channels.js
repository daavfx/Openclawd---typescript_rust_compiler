import { html, nothing } from "lit";
import { formatAgo } from "../format";
import { channelEnabled, renderChannelAccountCount } from "./channels.shared";
import { renderChannelConfigSection } from "./channels.config";
import { renderDiscordCard } from "./channels.discord";
import { renderGoogleChatCard } from "./channels.googlechat";
import { renderIMessageCard } from "./channels.imessage";
import { renderNostrCard } from "./channels.nostr";
import { renderSignalCard } from "./channels.signal";
import { renderSlackCard } from "./channels.slack";
import { renderTelegramCard } from "./channels.telegram";
import { renderWhatsAppCard } from "./channels.whatsapp";
export function renderChannels(props) {
  const channels = props.snapshot?.channels;
  const whatsapp = (channels?.whatsapp ?? undefined);
  const telegram = (channels?.telegram ?? undefined);
  const discord = (channels?.discord ?? null);
  const googlechat = (channels?.googlechat ?? null);
  const slack = (channels?.slack ?? null);
  const signal = (channels?.signal ?? null);
  const imessage = (channels?.imessage ?? null);
  const nostr = (channels?.nostr ?? null);
  const channelOrder = resolveChannelOrder(props.snapshot);
  const orderedChannels = channelOrder.map((key, index) => { key, enabled: channelEnabled(key, props), order: index }).sort((a, b) => {
    if ((a.enabled !== b.enabled)) {
      return a.enabled ? -1 : 1;
    }
    return (a.order - b.order);
  });
  return html("
    <section class=\"grid grid-cols-2\">
      
    </section>

    <section class=\"card\" style=\"margin-top: 18px;\">
      <div class=\"row\" style=\"justify-content: space-between;\">
        <div>
          <div class=\"card-title\">Channel health</div>
          <div class=\"card-sub\">Channel status snapshots from the gateway.</div>
        </div>
        <div class=\"muted\"></div>
      </div>
      
      <pre class=\"code-block\" style=\"margin-top: 12px;\">

      </pre>
    </section>
  ");
}

function resolveChannelOrder(snapshot) {
  if (snapshot?.channelMeta?.length) {
    return snapshot.channelMeta.map((entry) => entry.id);
  }
  if (snapshot?.channelOrder?.length) {
    return snapshot.channelOrder;
  }
  return ["whatsapp", "telegram", "discord", "googlechat", "slack", "signal", "imessage", "nostr"];
}
function renderChannel(key, props, data) {
  const accountCountLabel = renderChannelAccountCount(key, data.channelAccounts);
  switch (key) {
    case "whatsapp":
      return renderWhatsAppCard({ props, whatsapp: data.whatsapp, accountCountLabel });
    case "telegram":
      return renderTelegramCard({ props, telegram: data.telegram, telegramAccounts: (data.channelAccounts?.telegram ?? []), accountCountLabel });
    case "discord":
      return renderDiscordCard({ props, discord: data.discord, accountCountLabel });
    case "googlechat":
      return renderGoogleChatCard({ props, googlechat: data.googlechat, accountCountLabel });
    case "slack":
      return renderSlackCard({ props, slack: data.slack, accountCountLabel });
    case "signal":
      return renderSignalCard({ props, signal: data.signal, accountCountLabel });
    case "imessage":
      return renderIMessageCard({ props, imessage: data.imessage, accountCountLabel });
    case "nostr":
      {
        const nostrAccounts = (data.channelAccounts?.nostr ?? []);
        const primaryAccount = nostrAccounts[0];
        const accountId = (primaryAccount?.accountId ?? "default");
        const profile = (primaryAccount?.profile ?? null);
        const showForm = (props.nostrProfileAccountId === accountId) ? props.nostrProfileFormState : null;
        const profileFormCallbacks = showForm ? { onFieldChange: props.onNostrProfileFieldChange, onSave: props.onNostrProfileSave, onImport: props.onNostrProfileImport, onCancel: props.onNostrProfileCancel, onToggleAdvanced: props.onNostrProfileToggleAdvanced } : null;
        return renderNostrCard({ props, nostr: data.nostr, nostrAccounts, accountCountLabel, profileFormState: showForm, profileFormCallbacks, onEditProfile: () => props.onNostrProfileEdit(accountId, profile) });
      }
    default:
      return renderGenericChannelCard(key, props, (data.channelAccounts ?? {  }));
  }
}
function renderGenericChannelCard(key, props, channelAccounts) {
  const label = resolveChannelLabel(props.snapshot, key);
  const status = props.snapshot?.channels?.[key];
  const configured = (typeof status?.configured === "boolean") ? status.configured : undefined;
  const running = (typeof status?.running === "boolean") ? status.running : undefined;
  const connected = (typeof status?.connected === "boolean") ? status.connected : undefined;
  const lastError = (typeof status?.lastError === "string") ? status.lastError : undefined;
  const accounts = (channelAccounts[key] ?? []);
  const accountCountLabel = renderChannelAccountCount(key, channelAccounts);
  return html("
    <div class=\"card\">
      <div class=\"card-title\"></div>
      <div class=\"card-sub\">Channel status and configuration.</div>
      

      

      

      
    </div>
  ");
}
function resolveChannelMetaMap(snapshot) {
  if (!snapshot?.channelMeta?.length) {
    return {  };
  }
  return Object.fromEntries(snapshot.channelMeta.map((entry) => [entry.id, entry]));
}
function resolveChannelLabel(snapshot, key) {
  const meta = resolveChannelMetaMap(snapshot)[key];
  return ((meta?.label ?? snapshot?.channelLabels?.[key]) ?? key);
}
const RECENT_ACTIVITY_THRESHOLD_MS = ((10 * 60) * 1000);
function hasRecentActivity(account) {
  if (!account.lastInboundAt) {
    return false;
  }
  return ((Date.now() - account.lastInboundAt) < RECENT_ACTIVITY_THRESHOLD_MS);
}
function deriveRunningStatus(account) {
  if (account.running) {
    return "Yes";
  }
  if (hasRecentActivity(account)) {
    return "Active";
  }
  return "No";
}
function deriveConnectedStatus(account) {
  if ((account.connected === true)) {
    return "Yes";
  }
  if ((account.connected === false)) {
    return "No";
  }
  if (hasRecentActivity(account)) {
    return "Active";
  }
  return "n/a";
}
function renderGenericAccount(account) {
  const runningStatus = deriveRunningStatus(account);
  const connectedStatus = deriveConnectedStatus(account);
  return html("
    <div class=\"account-card\">
      <div class=\"account-card-header\">
        <div class=\"account-card-title\"></div>
        <div class=\"account-card-id\"></div>
      </div>
      <div class=\"status-list account-card-status\">
        <div>
          <span class=\"label\">Running</span>
          <span></span>
        </div>
        <div>
          <span class=\"label\">Configured</span>
          <span></span>
        </div>
        <div>
          <span class=\"label\">Connected</span>
          <span></span>
        </div>
        <div>
          <span class=\"label\">Last inbound</span>
          <span></span>
        </div>
        
      </div>
    </div>
  ");
}
