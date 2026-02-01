import { html, nothing } from "lit";
import { formatAgo } from "../format";
import { renderChannelConfigSection } from "./channels.config";
export function renderGoogleChatCard(params) {
  const {props, googleChat, accountCountLabel} = params;
  return html("
    <div class=\"card\">
      <div class=\"card-title\">Google Chat</div>
      <div class=\"card-sub\">Chat API webhook status and channel configuration.</div>
      

      <div class=\"status-list\" style=\"margin-top: 16px;\">
        <div>
          <span class=\"label\">Configured</span>
          <span></span>
        </div>
        <div>
          <span class=\"label\">Running</span>
          <span></span>
        </div>
        <div>
          <span class=\"label\">Credential</span>
          <span></span>
        </div>
        <div>
          <span class=\"label\">Audience</span>
          <span>
            
          </span>
        </div>
        <div>
          <span class=\"label\">Last start</span>
          <span></span>
        </div>
        <div>
          <span class=\"label\">Last probe</span>
          <span></span>
        </div>
      </div>

      

      

      

      <div class=\"row\" style=\"margin-top: 12px;\">
        <button class=\"btn\" @click=>
          Probe
        </button>
      </div>
    </div>
  ");
}

