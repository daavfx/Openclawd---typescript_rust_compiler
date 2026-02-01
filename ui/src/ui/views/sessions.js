import { html, nothing } from "lit";
import { formatAgo } from "../format";
import { formatSessionTokens } from "../presenter";
import { pathForTab } from "../navigation";
export 
const THINK_LEVELS = ["", "off", "minimal", "low", "medium", "high"];
const BINARY_THINK_LEVELS = ["", "off", "on"];
const VERBOSE_LEVELS = [{ value: "", label: "inherit" }, { value: "off", label: "off (explicit)" }, { value: "on", label: "on" }];
const REASONING_LEVELS = ["", "off", "on", "stream"];
function normalizeProviderId(provider) {
  if (!provider) {
    return "";
  }
  const normalized = provider.trim().toLowerCase();
  if (((normalized === "z.ai") || (normalized === "z-ai"))) {
    return "zai";
  }
  return normalized;
}
function isBinaryThinkingProvider(provider) {
  return (normalizeProviderId(provider) === "zai");
}
function resolveThinkLevelOptions(provider) {
  return isBinaryThinkingProvider(provider) ? BINARY_THINK_LEVELS : THINK_LEVELS;
}
function resolveThinkLevelDisplay(value, isBinary) {
  if (!isBinary) {
    return value;
  }
  if ((!value || (value === "off"))) {
    return value;
  }
  return "on";
}
function resolveThinkLevelPatchValue(value, isBinary) {
  if (!value) {
    return null;
  }
  if (!isBinary) {
    return value;
  }
  if ((value === "on")) {
    return "low";
  }
  return value;
}
export function renderSessions(props) {
  const rows = (props.result?.sessions ?? []);
  return html("
    <section class=\"card\">
      <div class=\"row\" style=\"justify-content: space-between;\">
        <div>
          <div class=\"card-title\">Sessions</div>
          <div class=\"card-sub\">Active session keys and per-session overrides.</div>
        </div>
        <button class=\"btn\" ?disabled= @click=>
          
        </button>
      </div>

      <div class=\"filters\" style=\"margin-top: 14px;\">
        <label class=\"field\">
          <span>Active within (minutes)</span>
          <input
            .value=
            @input=
          />
        </label>
        <label class=\"field\">
          <span>Limit</span>
          <input
            .value=
            @input=
          />
        </label>
        <label class=\"field checkbox\">
          <span>Include global</span>
          <input
            type=\"checkbox\"
            .checked=
            @change=
          />
        </label>
        <label class=\"field checkbox\">
          <span>Include unknown</span>
          <input
            type=\"checkbox\"
            .checked=
            @change=
          />
        </label>
      </div>

      

      <div class=\"muted\" style=\"margin-top: 12px;\">
        
      </div>

      <div class=\"table\" style=\"margin-top: 16px;\">
        <div class=\"table-head\">
          <div>Key</div>
          <div>Label</div>
          <div>Kind</div>
          <div>Updated</div>
          <div>Tokens</div>
          <div>Thinking</div>
          <div>Verbose</div>
          <div>Reasoning</div>
          <div>Actions</div>
        </div>
        
      </div>
    </section>
  ");
}

function renderRow(row, basePath, onPatch, onDelete, disabled) {
  const updated = row.updatedAt ? formatAgo(row.updatedAt) : "n/a";
  const rawThinking = (row.thinkingLevel ?? "");
  const isBinaryThinking = isBinaryThinkingProvider(row.modelProvider);
  const thinking = resolveThinkLevelDisplay(rawThinking, isBinaryThinking);
  const thinkLevels = resolveThinkLevelOptions(row.modelProvider);
  const verbose = (row.verboseLevel ?? "");
  const reasoning = (row.reasoningLevel ?? "");
  const displayName = (row.displayName ?? row.key);
  const canLink = (row.kind !== "global");
  const chatUrl = canLink ? "?session=" : null;
  return html("
    <div class=\"table-row\">
      <div class=\"mono\"></div>
      <div>
        <input
          .value=
          ?disabled=
          placeholder=\"(optional)\"
          @change=
        />
      </div>
      <div></div>
      <div></div>
      <div></div>
      <div>
        <select
          .value=
          ?disabled=
          @change=
        >
          
        </select>
      </div>
      <div>
        <select
          .value=
          ?disabled=
          @change=
        >
          
        </select>
      </div>
      <div>
        <select
          .value=
          ?disabled=
          @change=
        >
          
        </select>
      </div>
      <div>
        <button class=\"btn danger\" ?disabled= @click=>
          Delete
        </button>
      </div>
    </div>
  ");
}
