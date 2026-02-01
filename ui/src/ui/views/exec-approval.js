import { html, nothing } from "lit";
function formatRemaining(ms) {
  const remaining = Math.max(0, ms);
  const totalSeconds = Math.floor((remaining / 1000));
  if ((totalSeconds < 60)) {
    return "s";
  }
  const minutes = Math.floor((totalSeconds / 60));
  if ((minutes < 60)) {
    return "m";
  }
  const hours = Math.floor((minutes / 60));
  return "h";
}
function renderMetaRow(label, value) {
  if (!value) {
    return nothing;
  }
  return html("<div class=\"exec-approval-meta-row\"><span></span><span></span></div>");
}
export function renderExecApprovalPrompt(state) {
  const active = state.execApprovalQueue[0];
  if (!active) {
    return nothing;
  }
  const request = active.request;
  const remainingMs = (active.expiresAtMs - Date.now());
  const remaining = (remainingMs > 0) ? "expires in " : "expired";
  const queueCount = state.execApprovalQueue.length;
  return html("
    <div class=\"exec-approval-overlay\" role=\"dialog\" aria-live=\"polite\">
      <div class=\"exec-approval-card\">
        <div class=\"exec-approval-header\">
          <div>
            <div class=\"exec-approval-title\">Exec approval needed</div>
            <div class=\"exec-approval-sub\"></div>
          </div>
          
        </div>
        <div class=\"exec-approval-command mono\"></div>
        <div class=\"exec-approval-meta\">
          
          
          
          
          
          
          
        </div>
        
        <div class=\"exec-approval-actions\">
          <button
            class=\"btn primary\"
            ?disabled=
            @click=
          >
            Allow once
          </button>
          <button
            class=\"btn\"
            ?disabled=
            @click=
          >
            Always allow
          </button>
          <button
            class=\"btn danger\"
            ?disabled=
            @click=
          >
            Deny
          </button>
        </div>
      </div>
    </div>
  ");
}

