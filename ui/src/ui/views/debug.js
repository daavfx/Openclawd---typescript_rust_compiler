import { html, nothing } from "lit";
import { formatEventPayload } from "../presenter";
export 
export function renderDebug(props) {
  const securityAudit = (props.status && (typeof props.status === "object")) ? props.status.securityAudit : null;
  const securitySummary = (securityAudit?.summary ?? null);
  const critical = (securitySummary?.critical ?? 0);
  const warn = (securitySummary?.warn ?? 0);
  const info = (securitySummary?.info ?? 0);
  const securityTone = (critical > 0) ? "danger" : (warn > 0) ? "warn" : "success";
  const securityLabel = (critical > 0) ? " critical" : (warn > 0) ? " warnings" : "No critical issues";
  return html("
    <section class=\"grid grid-cols-2\">
      <div class=\"card\">
        <div class=\"row\" style=\"justify-content: space-between;\">
          <div>
            <div class=\"card-title\">Snapshots</div>
            <div class=\"card-sub\">Status, health, and heartbeat data.</div>
          </div>
          <button class=\"btn\" ?disabled= @click=>
            
          </button>
        </div>
        <div class=\"stack\" style=\"margin-top: 12px;\">
          <div>
            <div class=\"muted\">Status</div>
            
            <pre class=\"code-block\"></pre>
          </div>
          <div>
            <div class=\"muted\">Health</div>
            <pre class=\"code-block\"></pre>
          </div>
          <div>
            <div class=\"muted\">Last heartbeat</div>
            <pre class=\"code-block\"></pre>
          </div>
        </div>
      </div>

      <div class=\"card\">
        <div class=\"card-title\">Manual RPC</div>
        <div class=\"card-sub\">Send a raw gateway method with JSON params.</div>
        <div class=\"form-grid\" style=\"margin-top: 16px;\">
          <label class=\"field\">
            <span>Method</span>
            <input
              .value=
              @input=
              placeholder=\"system-presence\"
            />
          </label>
          <label class=\"field\">
            <span>Params (JSON)</span>
            <textarea
              .value=
              @input=
              rows=\"6\"
            ></textarea>
          </label>
        </div>
        <div class=\"row\" style=\"margin-top: 12px;\">
          <button class=\"btn primary\" @click=>Call</button>
        </div>
        
        
      </div>
    </section>

    <section class=\"card\" style=\"margin-top: 18px;\">
      <div class=\"card-title\">Models</div>
      <div class=\"card-sub\">Catalog from models.list.</div>
      <pre class=\"code-block\" style=\"margin-top: 12px;\"></pre>
    </section>

    <section class=\"card\" style=\"margin-top: 18px;\">
      <div class=\"card-title\">Event Log</div>
      <div class=\"card-sub\">Latest gateway events.</div>
      
    </section>
  ");
}

