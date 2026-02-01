import { html, nothing } from "lit";
const LEVELS = ["trace", "debug", "info", "warn", "error", "fatal"];
export 
function formatTime(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleTimeString();
}
function matchesFilter(entry, needle) {
  if (!needle) {
    return true;
  }
  const haystack = [entry.message, entry.subsystem, entry.raw].filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(needle);
}
export function renderLogs(props) {
  const needle = props.filterText.trim().toLowerCase();
  const levelFiltered = LEVELS.some((level) => !props.levelFilters[level]);
  const filtered = props.entries.filter((entry) => {
    if ((entry.level && !props.levelFilters[entry.level])) {
      return false;
    }
    return matchesFilter(entry, needle);
  });
  const exportLabel = (needle || levelFiltered) ? "filtered" : "visible";
  return html("
    <section class=\"card\">
      <div class=\"row\" style=\"justify-content: space-between;\">
        <div>
          <div class=\"card-title\">Logs</div>
          <div class=\"card-sub\">Gateway file logs (JSONL).</div>
        </div>
        <div class=\"row\" style=\"gap: 8px;\">
          <button class=\"btn\" ?disabled= @click=>
            
          </button>
          <button
            class=\"btn\"
            ?disabled=
            @click=
          >
            Export 
          </button>
        </div>
      </div>

      <div class=\"filters\" style=\"margin-top: 14px;\">
        <label class=\"field\" style=\"min-width: 220px;\">
          <span>Filter</span>
          <input
            .value=
            @input=
            placeholder=\"Search logs\"
          />
        </label>
        <label class=\"field checkbox\">
          <span>Auto-follow</span>
          <input
            type=\"checkbox\"
            .checked=
            @change=
          />
        </label>
      </div>

      <div class=\"chip-row\" style=\"margin-top: 12px;\">
        
      </div>

      
      
      

      <div class=\"log-stream\" style=\"margin-top: 12px;\" @scroll=>
        
      </div>
    </section>
  ");
}

