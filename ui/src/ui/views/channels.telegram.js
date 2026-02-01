import { html, nothing } from "lit";
import { formatAgo } from "../format";
import { renderChannelConfigSection } from "./channels.config";
export function renderTelegramCard(params) {
  const {props, telegram, telegramAccounts, accountCountLabel} = params;
  const hasMultipleAccounts = (telegramAccounts.length > 1);
  const renderAccountCard = (account) => {
    const probe = account.probe;
    const botUsername = probe?.bot?.username;
    const label = (account.name || account.accountId);
    return html("
      <div class=\"account-card\">
        <div class=\"account-card-header\">
          <div class=\"account-card-title\">
            
          </div>
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
            <span class=\"label\">Last inbound</span>
            <span></span>
          </div>
          
        </div>
      </div>
    ");
  };
  return html("
    <div class=\"card\">
      <div class=\"card-title\">Telegram</div>
      <div class=\"card-sub\">Bot status and channel configuration.</div>
      

      

      

      

      

      <div class=\"row\" style=\"margin-top: 12px;\">
        <button class=\"btn\" @click=>
          Probe
        </button>
      </div>
    </div>
  ");
}

