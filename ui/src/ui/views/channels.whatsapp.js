import { html, nothing } from "lit";
import { formatAgo } from "../format";
import { renderChannelConfigSection } from "./channels.config";
import { formatDuration } from "./channels.shared";
export function renderWhatsAppCard(params) {
  const {props, whatsapp, accountCountLabel} = params;
  return html("
    <div class=\"card\">
      <div class=\"card-title\">WhatsApp</div>
      <div class=\"card-sub\">Link WhatsApp Web and monitor connection health.</div>
      

      <div class=\"status-list\" style=\"margin-top: 16px;\">
        <div>
          <span class=\"label\">Configured</span>
          <span></span>
        </div>
        <div>
          <span class=\"label\">Linked</span>
          <span></span>
        </div>
        <div>
          <span class=\"label\">Running</span>
          <span></span>
        </div>
        <div>
          <span class=\"label\">Connected</span>
          <span></span>
        </div>
        <div>
          <span class=\"label\">Last connect</span>
          <span>
            
          </span>
        </div>
        <div>
          <span class=\"label\">Last message</span>
          <span>
            
          </span>
        </div>
        <div>
          <span class=\"label\">Auth age</span>
          <span>
            
          </span>
        </div>
      </div>

      

      

      

      <div class=\"row\" style=\"margin-top: 14px; flex-wrap: wrap;\">
        <button
          class=\"btn primary\"
          ?disabled=
          @click=
        >
          
        </button>
        <button
          class=\"btn\"
          ?disabled=
          @click=
        >
          Relink
        </button>
        <button
          class=\"btn\"
          ?disabled=
          @click=
        >
          Wait for scan
        </button>
        <button
          class=\"btn danger\"
          ?disabled=
          @click=
        >
          Logout
        </button>
        <button class=\"btn\" @click=>
          Refresh
        </button>
      </div>

      
    </div>
  ");
}

