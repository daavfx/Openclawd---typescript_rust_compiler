import { html, nothing } from "lit";
import { formatAgo } from "../format";
import { renderChannelConfigSection } from "./channels.config";
import { renderNostrProfileForm } from "./channels.nostr-profile-form";
function truncatePubkey(pubkey) {
  if (!pubkey) {
    return "n/a";
  }
  if ((pubkey.length <= 20)) {
    return pubkey;
  }
  return "...";
}
export function renderNostrCard(params) {
  const {props, nostr, nostrAccounts, accountCountLabel, profileFormState, profileFormCallbacks, onEditProfile} = params;
  const primaryAccount = nostrAccounts[0];
  const summaryConfigured = ((nostr?.configured ?? primaryAccount?.configured) ?? false);
  const summaryRunning = ((nostr?.running ?? primaryAccount?.running) ?? false);
  const summaryPublicKey = (nostr?.publicKey ?? primaryAccount?.publicKey);
  const summaryLastStartAt = ((nostr?.lastStartAt ?? primaryAccount?.lastStartAt) ?? null);
  const summaryLastError = ((nostr?.lastError ?? primaryAccount?.lastError) ?? null);
  const hasMultipleAccounts = (nostrAccounts.length > 1);
  const showingForm = ((profileFormState !== null) && (profileFormState !== undefined));
  const renderAccountCard = (account) => {
    const publicKey = account.publicKey;
    const profile = account.profile;
    const displayName = (((profile?.displayName ?? profile?.name) ?? account.name) ?? account.accountId);
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
            <span class=\"label\">Public Key</span>
            <span class=\"monospace\" title=\"\"></span>
          </div>
          <div>
            <span class=\"label\">Last inbound</span>
            <span></span>
          </div>
          
        </div>
      </div>
    ");
  };
  const renderProfileSection = () => {
    if ((showingForm && profileFormCallbacks)) {
      return renderNostrProfileForm({ state: profileFormState, callbacks: profileFormCallbacks, accountId: (nostrAccounts[0]?.accountId ?? "default") });
    }
    const profile = (primaryAccount?.profile ?? nostr?.profile);
    const {name, displayName, about, picture, nip05} = (profile ?? {  });
    const hasAnyProfileData = ((((name || displayName) || about) || picture) || nip05);
    return html("
      <div style=\"margin-top: 16px; padding: 12px; background: var(--bg-secondary); border-radius: 8px;\">
        <div style=\"display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;\">
          <div style=\"font-weight: 500;\">Profile</div>
          
        </div>
        
      </div>
    ");
  };
  return html("
    <div class=\"card\">
      <div class=\"card-title\">Nostr</div>
      <div class=\"card-sub\">Decentralized DMs via Nostr relays (NIP-04).</div>
      

      

      

      

      

      <div class=\"row\" style=\"margin-top: 12px;\">
        <button class=\"btn\" @click=>Refresh</button>
      </div>
    </div>
  ");
}

