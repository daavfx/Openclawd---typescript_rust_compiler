import { html, nothing } from "lit";
import { parseAgentSessionKey } from "../../../src/routing/session-key.js";
import { TAB_GROUPS, iconForTab, pathForTab, subtitleForTab, titleForTab } from "./navigation";
import { icons } from "./icons";
import { refreshChatAvatar } from "./app-chat";
import { renderChat } from "./views/chat";
import { renderConfig } from "./views/config";
import { renderChannels } from "./views/channels";
import { renderCron } from "./views/cron";
import { renderDebug } from "./views/debug";
import { renderInstances } from "./views/instances";
import { renderLogs } from "./views/logs";
import { renderNodes } from "./views/nodes";
import { renderOverview } from "./views/overview";
import { renderSessions } from "./views/sessions";
import { renderExecApprovalPrompt } from "./views/exec-approval";
import { renderGatewayUrlConfirmation } from "./views/gateway-url-confirmation";
import { approveDevicePairing, loadDevices, rejectDevicePairing, revokeDeviceToken, rotateDeviceToken } from "./controllers/devices";
import { renderSkills } from "./views/skills";
import { renderChatControls, renderTab, renderThemeToggle } from "./app-render.helpers";
import { loadChannels } from "./controllers/channels";
import { loadPresence } from "./controllers/presence";
import { deleteSession, loadSessions, patchSession } from "./controllers/sessions";
import { installSkill, loadSkills, saveSkillApiKey, updateSkillEdit, updateSkillEnabled } from "./controllers/skills";
import { loadNodes } from "./controllers/nodes";
import { loadChatHistory } from "./controllers/chat";
import { applyConfig, loadConfig, runUpdate, saveConfig, updateConfigFormValue, removeConfigFormValue } from "./controllers/config";
import { loadExecApprovals, removeExecApprovalsFormValue, saveExecApprovals, updateExecApprovalsFormValue } from "./controllers/exec-approvals";
import { loadCronRuns, toggleCronJob, runCronJob, removeCronJob, addCronJob } from "./controllers/cron";
import { loadDebug, callDebugMethod } from "./controllers/debug";
import { loadLogs } from "./controllers/logs";
const AVATAR_DATA_RE = /^data:/i;
const AVATAR_HTTP_RE = /^https?:\/\//i;
function resolveAssistantAvatarUrl(state) {
  const list = (state.agentsList?.agents ?? []);
  const parsed = parseAgentSessionKey(state.sessionKey);
  const agentId = ((parsed?.agentId ?? state.agentsList?.defaultId) ?? "main");
  const agent = list.find((entry) => (entry.id === agentId));
  const identity = agent?.identity;
  const candidate = (identity?.avatarUrl ?? identity?.avatar);
  if (!candidate) {
    return undefined;
  }
  if ((AVATAR_DATA_RE.test(candidate) || AVATAR_HTTP_RE.test(candidate))) {
    return candidate;
  }
  return identity?.avatarUrl;
}
export function renderApp(state) {
  const presenceCount = state.presenceEntries.length;
  const sessionsCount = (state.sessionsResult?.count ?? null);
  const cronNext = (state.cronStatus?.nextWakeAtMs ?? null);
  const chatDisabledReason = state.connected ? null : "Disconnected from gateway.";
  const isChat = (state.tab === "chat");
  const chatFocus = (isChat && (state.settings.chatFocusMode || state.onboarding));
  const showThinking = state.onboarding ? false : state.settings.chatShowThinking;
  const assistantAvatarUrl = resolveAssistantAvatarUrl(state);
  const chatAvatarUrl = ((state.chatAvatarUrl ?? assistantAvatarUrl) ?? null);
  return html("
    <div class=\"shell    \">
      <header class=\"topbar\">
        <div class=\"topbar-left\">
          <button
            class=\"nav-collapse-toggle\"
            @click=
            title=\"\"
            aria-label=\"\"
          >
            <span class=\"nav-collapse-toggle__icon\"></span>
          </button>
          <div class=\"brand\">
            <div class=\"brand-logo\">
              <img src=\"https://mintcdn.com/clawdhub/4rYvG-uuZrMK_URE/assets/pixel-lobster.svg?fit=max&auto=format&n=4rYvG-uuZrMK_URE&q=85&s=da2032e9eac3b5d9bfe7eb96ca6a8a26\" alt=\"OpenClaw\" />
            </div>
            <div class=\"brand-text\">
              <div class=\"brand-title\">OPENCLAW</div>
              <div class=\"brand-sub\">Gateway Dashboard</div>
            </div>
          </div>
        </div>
        <div class=\"topbar-status\">
          <div class=\"pill\">
            <span class=\"statusDot \"></span>
            <span>Health</span>
            <span class=\"mono\"></span>
          </div>
          
        </div>
      </header>
      <aside class=\"nav \">
        
        <div class=\"nav-group nav-group--links\">
          <div class=\"nav-label nav-label--static\">
            <span class=\"nav-label__text\">Resources</span>
          </div>
          <div class=\"nav-group__items\">
            <a
              class=\"nav-item nav-item--external\"
              href=\"https://docs.openclaw.ai\"
              target=\"_blank\"
              rel=\"noreferrer\"
              title=\"Docs (opens in new tab)\"
            >
              <span class=\"nav-item__icon\" aria-hidden=\"true\"></span>
              <span class=\"nav-item__text\">Docs</span>
            </a>
          </div>
        </div>
      </aside>
      <main class=\"content \">
        <section class=\"content-header\">
          <div>
            <div class=\"page-title\"></div>
            <div class=\"page-sub\"></div>
          </div>
          <div class=\"page-meta\">
            
            
          </div>
        </section>

        

        

        

        

        

        

        

        

        

        

        
      </main>
      
      
    </div>
  ");
}

