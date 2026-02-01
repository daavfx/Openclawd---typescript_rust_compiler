import { html } from "lit";
import { formatAgo, formatDurationMs } from "../format";
import { formatNextRun } from "../presenter";
export 
export function renderOverview(props) {
  const snapshot = props.hello?.snapshot;
  const uptime = snapshot?.uptimeMs ? formatDurationMs(snapshot.uptimeMs) : "n/a";
  const tick = snapshot?.policy?.tickIntervalMs ? "ms" : "n/a";
  const authHint = () => {
    if ((props.connected || !props.lastError)) {
      return null;
    }
    const lower = props.lastError.toLowerCase();
    const authFailed = (lower.includes("unauthorized") || lower.includes("connect failed"));
    if (!authFailed) {
      return null;
    }
    const hasToken = Boolean(props.settings.token.trim());
    const hasPassword = Boolean(props.password.trim());
    if ((!hasToken && !hasPassword)) {
      return html("
        <div class=\"muted\" style=\"margin-top: 8px;\">
          This gateway requires auth. Add a token or password, then click Connect.
          <div style=\"margin-top: 6px;\">
            <span class=\"mono\">openclaw dashboard --no-open</span> → tokenized URL<br />
            <span class=\"mono\">openclaw doctor --generate-gateway-token</span> → set token
          </div>
          <div style=\"margin-top: 6px;\">
            <a
              class=\"session-link\"
              href=\"https://docs.openclaw.ai/web/dashboard\"
              target=\"_blank\"
              rel=\"noreferrer\"
              title=\"Control UI auth docs (opens in new tab)\"
              >Docs: Control UI auth</a
            >
          </div>
        </div>
      ");
    }
    return html("
      <div class=\"muted\" style=\"margin-top: 8px;\">
        Auth failed. Re-copy a tokenized URL with
        <span class=\"mono\">openclaw dashboard --no-open</span>, or update the token,
        then click Connect.
        <div style=\"margin-top: 6px;\">
          <a
            class=\"session-link\"
            href=\"https://docs.openclaw.ai/web/dashboard\"
            target=\"_blank\"
            rel=\"noreferrer\"
            title=\"Control UI auth docs (opens in new tab)\"
            >Docs: Control UI auth</a
          >
        </div>
      </div>
    ");
  }();
  const insecureContextHint = () => {
    if ((props.connected || !props.lastError)) {
      return null;
    }
    const isSecureContext = (typeof window !== "undefined") ? window.isSecureContext : true;
    if ((isSecureContext !== false)) {
      return null;
    }
    const lower = props.lastError.toLowerCase();
    if ((!lower.includes("secure context") && !lower.includes("device identity required"))) {
      return null;
    }
    return html("
      <div class=\"muted\" style=\"margin-top: 8px;\">
        This page is HTTP, so the browser blocks device identity. Use HTTPS (Tailscale Serve) or
        open <span class=\"mono\">http://127.0.0.1:18789</span> on the gateway host.
        <div style=\"margin-top: 6px;\">
          If you must stay on HTTP, set
          <span class=\"mono\">gateway.controlUi.allowInsecureAuth: true</span> (token-only).
        </div>
        <div style=\"margin-top: 6px;\">
          <a
            class=\"session-link\"
            href=\"https://docs.openclaw.ai/gateway/tailscale\"
            target=\"_blank\"
            rel=\"noreferrer\"
            title=\"Tailscale Serve docs (opens in new tab)\"
            >Docs: Tailscale Serve</a
          >
          <span class=\"muted\"> · </span>
          <a
            class=\"session-link\"
            href=\"https://docs.openclaw.ai/web/control-ui#insecure-http\"
            target=\"_blank\"
            rel=\"noreferrer\"
            title=\"Insecure HTTP docs (opens in new tab)\"
            >Docs: Insecure HTTP</a
          >
        </div>
      </div>
    ");
  }();
  return html("
    <section class=\"grid grid-cols-2\">
      <div class=\"card\">
        <div class=\"card-title\">Gateway Access</div>
        <div class=\"card-sub\">Where the dashboard connects and how it authenticates.</div>
        <div class=\"form-grid\" style=\"margin-top: 16px;\">
          <label class=\"field\">
            <span>WebSocket URL</span>
            <input
              .value=
              @input=
              placeholder=\"ws://100.x.y.z:18789\"
            />
          </label>
          <label class=\"field\">
            <span>Gateway Token</span>
            <input
              .value=
              @input=
              placeholder=\"OPENCLAW_GATEWAY_TOKEN\"
            />
          </label>
          <label class=\"field\">
            <span>Password (not stored)</span>
            <input
              type=\"password\"
              .value=
              @input=
              placeholder=\"system or shared password\"
            />
          </label>
          <label class=\"field\">
            <span>Default Session Key</span>
            <input
              .value=
              @input=
            />
          </label>
        </div>
        <div class=\"row\" style=\"margin-top: 14px;\">
          <button class=\"btn\" @click=>Connect</button>
          <button class=\"btn\" @click=>Refresh</button>
          <span class=\"muted\">Click Connect to apply connection changes.</span>
        </div>
      </div>

      <div class=\"card\">
        <div class=\"card-title\">Snapshot</div>
        <div class=\"card-sub\">Latest gateway handshake information.</div>
        <div class=\"stat-grid\" style=\"margin-top: 16px;\">
          <div class=\"stat\">
            <div class=\"stat-label\">Status</div>
            <div class=\"stat-value \">
              
            </div>
          </div>
          <div class=\"stat\">
            <div class=\"stat-label\">Uptime</div>
            <div class=\"stat-value\"></div>
          </div>
          <div class=\"stat\">
            <div class=\"stat-label\">Tick Interval</div>
            <div class=\"stat-value\"></div>
          </div>
          <div class=\"stat\">
            <div class=\"stat-label\">Last Channels Refresh</div>
            <div class=\"stat-value\">
              
            </div>
          </div>
        </div>
        
      </div>
    </section>

    <section class=\"grid grid-cols-3\" style=\"margin-top: 18px;\">
      <div class=\"card stat-card\">
        <div class=\"stat-label\">Instances</div>
        <div class=\"stat-value\"></div>
        <div class=\"muted\">Presence beacons in the last 5 minutes.</div>
      </div>
      <div class=\"card stat-card\">
        <div class=\"stat-label\">Sessions</div>
        <div class=\"stat-value\"></div>
        <div class=\"muted\">Recent session keys tracked by the gateway.</div>
      </div>
      <div class=\"card stat-card\">
        <div class=\"stat-label\">Cron</div>
        <div class=\"stat-value\">
          
        </div>
        <div class=\"muted\">Next wake </div>
      </div>
    </section>

    <section class=\"card\" style=\"margin-top: 18px;\">
      <div class=\"card-title\">Notes</div>
      <div class=\"card-sub\">Quick reminders for remote control setups.</div>
      <div class=\"note-grid\" style=\"margin-top: 14px;\">
        <div>
          <div class=\"note-title\">Tailscale serve</div>
          <div class=\"muted\">
            Prefer serve mode to keep the gateway on loopback with tailnet auth.
          </div>
        </div>
        <div>
          <div class=\"note-title\">Session hygiene</div>
          <div class=\"muted\">Use /new or sessions.patch to reset context.</div>
        </div>
        <div>
          <div class=\"note-title\">Cron reminders</div>
          <div class=\"muted\">Use isolated sessions for recurring runs.</div>
        </div>
      </div>
    </section>
  ");
}

