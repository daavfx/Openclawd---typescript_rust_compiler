import { html, nothing } from "lit";
import { formatMs } from "../format";
import { formatCronPayload, formatCronSchedule, formatCronState, formatNextRun } from "../presenter";
export 
function buildChannelOptions(props) {
  const options = ["last", ...props.channels.filter(Boolean)];
  const current = props.form.channel?.trim();
  if ((current && !options.includes(current))) {
    options.push(current);
  }
  const seen = new Set();
  return options.filter((value) => {
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}
function resolveChannelLabel(props, channel) {
  if ((channel === "last")) {
    return "last";
  }
  const meta = props.channelMeta?.find((entry) => (entry.id === channel));
  if (meta?.label) {
    return meta.label;
  }
  return (props.channelLabels?.[channel] ?? channel);
}
export function renderCron(props) {
  const channelOptions = buildChannelOptions(props);
  return html("
    <section class=\"grid grid-cols-2\">
      <div class=\"card\">
        <div class=\"card-title\">Scheduler</div>
        <div class=\"card-sub\">Gateway-owned cron scheduler status.</div>
        <div class=\"stat-grid\" style=\"margin-top: 16px;\">
          <div class=\"stat\">
            <div class=\"stat-label\">Enabled</div>
            <div class=\"stat-value\">
              
            </div>
          </div>
          <div class=\"stat\">
            <div class=\"stat-label\">Jobs</div>
            <div class=\"stat-value\"></div>
          </div>
          <div class=\"stat\">
            <div class=\"stat-label\">Next wake</div>
            <div class=\"stat-value\"></div>
          </div>
        </div>
        <div class=\"row\" style=\"margin-top: 12px;\">
          <button class=\"btn\" ?disabled= @click=>
            
          </button>
          
        </div>
      </div>

      <div class=\"card\">
        <div class=\"card-title\">New Job</div>
        <div class=\"card-sub\">Create a scheduled wakeup or agent run.</div>
        <div class=\"form-grid\" style=\"margin-top: 16px;\">
          <label class=\"field\">
            <span>Name</span>
            <input
              .value=
              @input=
            />
          </label>
          <label class=\"field\">
            <span>Description</span>
            <input
              .value=
              @input=
            />
          </label>
          <label class=\"field\">
            <span>Agent ID</span>
            <input
              .value=
              @input=
              placeholder=\"default\"
            />
          </label>
          <label class=\"field checkbox\">
            <span>Enabled</span>
            <input
              type=\"checkbox\"
              .checked=
              @change=
            />
          </label>
          <label class=\"field\">
            <span>Schedule</span>
            <select
              .value=
              @change=
            >
              <option value=\"every\">Every</option>
              <option value=\"at\">At</option>
              <option value=\"cron\">Cron</option>
            </select>
          </label>
        </div>
        
        <div class=\"form-grid\" style=\"margin-top: 12px;\">
          <label class=\"field\">
            <span>Session</span>
            <select
              .value=
              @change=
            >
              <option value=\"main\">Main</option>
              <option value=\"isolated\">Isolated</option>
            </select>
          </label>
          <label class=\"field\">
            <span>Wake mode</span>
            <select
              .value=
              @change=
            >
              <option value=\"next-heartbeat\">Next heartbeat</option>
              <option value=\"now\">Now</option>
            </select>
          </label>
          <label class=\"field\">
            <span>Payload</span>
            <select
              .value=
              @change=
            >
              <option value=\"systemEvent\">System event</option>
              <option value=\"agentTurn\">Agent turn</option>
            </select>
          </label>
        </div>
        <label class=\"field\" style=\"margin-top: 12px;\">
          <span></span>
          <textarea
            .value=
            @input=
            rows=\"4\"
          ></textarea>
        </label>
	          
        <div class=\"row\" style=\"margin-top: 14px;\">
          <button class=\"btn primary\" ?disabled= @click=>
            
          </button>
        </div>
      </div>
    </section>

    <section class=\"card\" style=\"margin-top: 18px;\">
      <div class=\"card-title\">Jobs</div>
      <div class=\"card-sub\">All scheduled jobs stored in the gateway.</div>
      
    </section>

    <section class=\"card\" style=\"margin-top: 18px;\">
      <div class=\"card-title\">Run history</div>
      <div class=\"card-sub\">Latest runs for .</div>
      
    </section>
  ");
}

function renderScheduleFields(props) {
  const form = props.form;
  if ((form.scheduleKind === "at")) {
    return html("
      <label class=\"field\" style=\"margin-top: 12px;\">
        <span>Run at</span>
        <input
          type=\"datetime-local\"
          .value=
          @input=
        />
      </label>
    ");
  }
  if ((form.scheduleKind === "every")) {
    return html("
      <div class=\"form-grid\" style=\"margin-top: 12px;\">
        <label class=\"field\">
          <span>Every</span>
          <input
            .value=
            @input=
          />
        </label>
        <label class=\"field\">
          <span>Unit</span>
          <select
            .value=
            @change=
          >
            <option value=\"minutes\">Minutes</option>
            <option value=\"hours\">Hours</option>
            <option value=\"days\">Days</option>
          </select>
        </label>
      </div>
    ");
  }
  return html("
    <div class=\"form-grid\" style=\"margin-top: 12px;\">
      <label class=\"field\">
        <span>Expression</span>
        <input
          .value=
          @input=
        />
      </label>
      <label class=\"field\">
        <span>Timezone (optional)</span>
        <input
          .value=
          @input=
        />
      </label>
    </div>
  ");
}
function renderJob(job, props) {
  const isSelected = (props.runsJobId === job.id);
  const itemClass = "list-item list-item-clickable";
  return html("
    <div class= @click=>
      <div class=\"list-main\">
        <div class=\"list-title\"></div>
        <div class=\"list-sub\"></div>
        <div class=\"muted\"></div>
        
        <div class=\"chip-row\" style=\"margin-top: 6px;\">
          <span class=\"chip\"></span>
          <span class=\"chip\"></span>
          <span class=\"chip\"></span>
        </div>
      </div>
      <div class=\"list-meta\">
        <div></div>
        <div class=\"row\" style=\"justify-content: flex-end; margin-top: 8px;\">
          <button
            class=\"btn\"
            ?disabled=
            @click=
          >
            
          </button>
          <button
            class=\"btn\"
            ?disabled=
            @click=
          >
            Run
          </button>
          <button
            class=\"btn\"
            ?disabled=
            @click=
          >
            Runs
          </button>
          <button
            class=\"btn danger\"
            ?disabled=
            @click=
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  ");
}
function renderRun(entry) {
  return html("
    <div class=\"list-item\">
      <div class=\"list-main\">
        <div class=\"list-title\"></div>
        <div class=\"list-sub\"></div>
      </div>
      <div class=\"list-meta\">
        <div></div>
        <div class=\"muted\">ms</div>
        
      </div>
    </div>
  ");
}
