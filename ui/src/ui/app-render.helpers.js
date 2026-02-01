import { html } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { iconForTab, pathForTab, titleForTab } from "./navigation";
import { icons } from "./icons";
import { loadChatHistory } from "./controllers/chat";
import { refreshChat } from "./app-chat";
import { syncUrlWithSessionKey } from "./app-settings";
export function renderTab(state, tab) {
  const href = pathForTab(tab, state.basePath);
  return html("
    <a
      href=
      class=\"nav-item \"
      @click=
      title=
    >
      <span class=\"nav-item__icon\" aria-hidden=\"true\"></span>
      <span class=\"nav-item__text\"></span>
    </a>
  ");
}

export function renderChatControls(state) {
  const mainSessionKey = resolveMainSessionKey(state.hello, state.sessionsResult);
  const sessionOptions = resolveSessionOptions(state.sessionKey, state.sessionsResult, mainSessionKey);
  const disableThinkingToggle = state.onboarding;
  const disableFocusToggle = state.onboarding;
  const showThinking = state.onboarding ? false : state.settings.chatShowThinking;
  const focusActive = state.onboarding ? true : state.settings.chatFocusMode;
  const refreshIcon = html("<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8\"></path><path d=\"M21 3v5h-5\"></path></svg>");
  const focusIcon = html("<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 7V4h3\"></path><path d=\"M20 7V4h-3\"></path><path d=\"M4 17v3h3\"></path><path d=\"M20 17v3h-3\"></path><circle cx=\"12\" cy=\"12\" r=\"3\"></circle></svg>");
  return html("
    <div class=\"chat-controls\">
      <label class=\"field chat-controls__session\">
        <select
          .value=
          ?disabled=
          @change=
        >
          
        </select>
      </label>
      <button
        class=\"btn btn--sm btn--icon\"
        ?disabled=
        @click=
        title=\"Refresh chat data\"
      >
        
      </button>
      <span class=\"chat-controls__separator\">|</span>
      <button
        class=\"btn btn--sm btn--icon \"
        ?disabled=
        @click=
        aria-pressed=
        title=
      >
        
      </button>
      <button
        class=\"btn btn--sm btn--icon \"
        ?disabled=
        @click=
        aria-pressed=
        title=
      >
        
      </button>
    </div>
  ");
}

function resolveMainSessionKey(hello, sessions) {
  const snapshot = hello?.snapshot;
  const mainSessionKey = snapshot?.sessionDefaults?.mainSessionKey?.trim();
  if (mainSessionKey) {
    return mainSessionKey;
  }
  const mainKey = snapshot?.sessionDefaults?.mainKey?.trim();
  if (mainKey) {
    return mainKey;
  }
  if (sessions?.sessions?.some((row) => (row.key === "main"))) {
    return "main";
  }
  return null;
}
function resolveSessionOptions(sessionKey, sessions, mainSessionKey) {
  const seen = new Set();
  const options = [];
  const resolvedMain = (mainSessionKey && sessions?.sessions?.find((s) => (s.key === mainSessionKey)));
  const resolvedCurrent = sessions?.sessions?.find((s) => (s.key === sessionKey));
  if (mainSessionKey) {
    seen.add(mainSessionKey);
    options.push({ key: mainSessionKey, displayName: resolvedMain?.displayName });
  }
  if (!seen.has(sessionKey)) {
    seen.add(sessionKey);
    options.push({ key: sessionKey, displayName: resolvedCurrent?.displayName });
  }
  if (sessions?.sessions) {
    for (const s of sessions.sessions) {
      if (!seen.has(s.key)) {
        seen.add(s.key);
        options.push({ key: s.key, displayName: s.displayName });
      }
    }
  }
  return options;
}
const THEME_ORDER = ["system", "light", "dark"];
export function renderThemeToggle(state) {
  const index = Math.max(0, THEME_ORDER.indexOf(state.theme));
  const applyTheme = (next) => (event) => {
    const element = event.currentTarget;
    const context = { element };
    if ((event.clientX || event.clientY)) {
      context.pointerClientX = event.clientX;
      context.pointerClientY = event.clientY;
    }
    state.setTheme(next, context);
  };
  return html("
    <div class=\"theme-toggle\" style=\"--theme-index: ;\">
      <div class=\"theme-toggle__track\" role=\"group\" aria-label=\"Theme\">
        <span class=\"theme-toggle__indicator\"></span>
        <button
          class=\"theme-toggle__button \"
          @click=
          aria-pressed=
          aria-label=\"System theme\"
          title=\"System\"
        >
          
        </button>
        <button
          class=\"theme-toggle__button \"
          @click=
          aria-pressed=
          aria-label=\"Light theme\"
          title=\"Light\"
        >
          
        </button>
        <button
          class=\"theme-toggle__button \"
          @click=
          aria-pressed=
          aria-label=\"Dark theme\"
          title=\"Dark\"
        >
          
        </button>
      </div>
    </div>
  ");
}

function renderSunIcon() {
  return html("
    <svg class=\"theme-icon\" viewBox=\"0 0 24 24\" aria-hidden=\"true\">
      <circle cx=\"12\" cy=\"12\" r=\"4\"></circle>
      <path d=\"M12 2v2\"></path>
      <path d=\"M12 20v2\"></path>
      <path d=\"m4.93 4.93 1.41 1.41\"></path>
      <path d=\"m17.66 17.66 1.41 1.41\"></path>
      <path d=\"M2 12h2\"></path>
      <path d=\"M20 12h2\"></path>
      <path d=\"m6.34 17.66-1.41 1.41\"></path>
      <path d=\"m19.07 4.93-1.41 1.41\"></path>
    </svg>
  ");
}
function renderMoonIcon() {
  return html("
    <svg class=\"theme-icon\" viewBox=\"0 0 24 24\" aria-hidden=\"true\">
      <path
        d=\"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401\"
      ></path>
    </svg>
  ");
}
function renderMonitorIcon() {
  return html("
    <svg class=\"theme-icon\" viewBox=\"0 0 24 24\" aria-hidden=\"true\">
      <rect width=\"20\" height=\"14\" x=\"2\" y=\"3\" rx=\"2\"></rect>
      <line x1=\"8\" x2=\"16\" y1=\"21\" y2=\"21\"></line>
      <line x1=\"12\" x2=\"12\" y1=\"17\" y2=\"21\"></line>
    </svg>
  ");
}
