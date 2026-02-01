import { html, nothing } from "lit";
import { formatPresenceAge, formatPresenceSummary } from "../presenter";
export 
export function renderInstances(props) {
  return html("
    <section class=\"card\">
      <div class=\"row\" style=\"justify-content: space-between;\">
        <div>
          <div class=\"card-title\">Connected Instances</div>
          <div class=\"card-sub\">Presence beacons from the gateway and clients.</div>
        </div>
        <button class=\"btn\" ?disabled= @click=>
          
        </button>
      </div>
      
      
      <div class=\"list\" style=\"margin-top: 16px;\">
        
      </div>
    </section>
  ");
}

function renderEntry(entry) {
  const lastInput = (entry.lastInputSeconds != null) ? "s ago" : "n/a";
  const mode = (entry.mode ?? "unknown");
  const roles = Array.isArray(entry.roles) ? entry.roles.filter(Boolean) : [];
  const scopes = Array.isArray(entry.scopes) ? entry.scopes.filter(Boolean) : [];
  const scopesLabel = (scopes.length > 0) ? (scopes.length > 3) ? " scopes" : "scopes: " : null;
  return html("
    <div class=\"list-item\">
      <div class=\"list-main\">
        <div class=\"list-title\"></div>
        <div class=\"list-sub\"></div>
        <div class=\"chip-row\">
          <span class=\"chip\"></span>
          
          
          
          
          
          
        </div>
      </div>
      <div class=\"list-meta\">
        <div></div>
        <div class=\"muted\">Last input </div>
        <div class=\"muted\">Reason </div>
      </div>
    </div>
  ");
}
