import { html, nothing } from "lit";
import { clampText } from "../format";
export 
export function renderSkills(props) {
  const skills = (props.report?.skills ?? []);
  const filter = props.filter.trim().toLowerCase();
  const filtered = filter ? skills.filter((skill) => [skill.name, skill.description, skill.source].join(" ").toLowerCase().includes(filter)) : skills;
  return html("
    <section class=\"card\">
      <div class=\"row\" style=\"justify-content: space-between;\">
        <div>
          <div class=\"card-title\">Skills</div>
          <div class=\"card-sub\">Bundled, managed, and workspace skills.</div>
        </div>
        <button class=\"btn\" ?disabled= @click=>
          
        </button>
      </div>

      <div class=\"filters\" style=\"margin-top: 14px;\">
        <label class=\"field\" style=\"flex: 1;\">
          <span>Filter</span>
          <input
            .value=
            @input=
            placeholder=\"Search skills\"
          />
        </label>
        <div class=\"muted\"> shown</div>
      </div>

      

      
    </section>
  ");
}

function renderSkill(skill, props) {
  const busy = (props.busyKey === skill.skillKey);
  const apiKey = (props.edits[skill.skillKey] ?? "");
  const message = (props.messages[skill.skillKey] ?? null);
  const canInstall = ((skill.install.length > 0) && (skill.missing.bins.length > 0));
  const missing = [...skill.missing.bins.map((b) => "bin:"), ...skill.missing.env.map((e) => "env:"), ...skill.missing.config.map((c) => "config:"), ...skill.missing.os.map((o) => "os:")];
  const reasons = [];
  if (skill.disabled) {
    reasons.push("disabled");
  }
  if (skill.blockedByAllowlist) {
    reasons.push("blocked by allowlist");
  }
  return html("
    <div class=\"list-item\">
      <div class=\"list-main\">
        <div class=\"list-title\">
          
        </div>
        <div class=\"list-sub\"></div>
        <div class=\"chip-row\" style=\"margin-top: 6px;\">
          <span class=\"chip\"></span>
          <span class=\"chip \">
            
          </span>
          
        </div>
        
        
      </div>
      <div class=\"list-meta\">
        <div class=\"row\" style=\"justify-content: flex-end; flex-wrap: wrap;\">
          <button
            class=\"btn\"
            ?disabled=
            @click=
          >
            
          </button>
          
        </div>
        
        
      </div>
    </div>
  ");
}
