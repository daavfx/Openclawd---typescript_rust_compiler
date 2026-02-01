import { html, nothing } from "lit";
import { clampText, formatAgo, formatList } from "../format";
export 
export function renderNodes(props) {
  const bindingState = resolveBindingsState(props);
  const approvalsState = resolveExecApprovalsState(props);
  return html("
    
    
    
    <section class=\"card\">
      <div class=\"row\" style=\"justify-content: space-between;\">
        <div>
          <div class=\"card-title\">Nodes</div>
          <div class=\"card-sub\">Paired devices and live links.</div>
        </div>
        <button class=\"btn\" ?disabled= @click=>
          
        </button>
      </div>
      <div class=\"list\" style=\"margin-top: 16px;\">
        
      </div>
    </section>
  ");
}

function renderDevices(props) {
  const list = (props.devicesList ?? { pending: [], paired: [] });
  const pending = Array.isArray(list.pending) ? list.pending : [];
  const paired = Array.isArray(list.paired) ? list.paired : [];
  return html("
    <section class=\"card\">
      <div class=\"row\" style=\"justify-content: space-between;\">
        <div>
          <div class=\"card-title\">Devices</div>
          <div class=\"card-sub\">Pairing requests + role tokens.</div>
        </div>
        <button class=\"btn\" ?disabled= @click=>
          
        </button>
      </div>
      
      <div class=\"list\" style=\"margin-top: 16px;\">
        
        
        
      </div>
    </section>
  ");
}
function renderPendingDevice(req, props) {
  const name = (req.displayName?.trim() || req.deviceId);
  const age = (typeof req.ts === "number") ? formatAgo(req.ts) : "n/a";
  const role = req.role?.trim() ? "role: " : "role: -";
  const repair = req.isRepair ? " · repair" : "";
  const ip = req.remoteIp ? " · " : "";
  return html("
    <div class=\"list-item\">
      <div class=\"list-main\">
        <div class=\"list-title\"></div>
        <div class=\"list-sub\"></div>
        <div class=\"muted\" style=\"margin-top: 6px;\">
           · requested 
        </div>
      </div>
      <div class=\"list-meta\">
        <div class=\"row\" style=\"justify-content: flex-end; gap: 8px; flex-wrap: wrap;\">
          <button class=\"btn btn--sm primary\" @click=>
            Approve
          </button>
          <button class=\"btn btn--sm\" @click=>
            Reject
          </button>
        </div>
      </div>
    </div>
  ");
}
function renderPairedDevice(device, props) {
  const name = (device.displayName?.trim() || device.deviceId);
  const ip = device.remoteIp ? " · " : "";
  const roles = "roles: ";
  const scopes = "scopes: ";
  const tokens = Array.isArray(device.tokens) ? device.tokens : [];
  return html("
    <div class=\"list-item\">
      <div class=\"list-main\">
        <div class=\"list-title\"></div>
        <div class=\"list-sub\"></div>
        <div class=\"muted\" style=\"margin-top: 6px;\"> · </div>
        
      </div>
    </div>
  ");
}
function renderTokenRow(deviceId, token, props) {
  const status = token.revokedAtMs ? "revoked" : "active";
  const scopes = "scopes: ";
  const when = formatAgo((((token.rotatedAtMs ?? token.createdAtMs) ?? token.lastUsedAtMs) ?? null));
  return html("
    <div class=\"row\" style=\"justify-content: space-between; gap: 8px;\">
      <div class=\"list-sub\"> ·  ·  · </div>
      <div class=\"row\" style=\"justify-content: flex-end; gap: 6px; flex-wrap: wrap;\">
        <button
          class=\"btn btn--sm\"
          @click=
        >
          Rotate
        </button>
        
      </div>
    </div>
  ");
}
const EXEC_APPROVALS_DEFAULT_SCOPE = "__defaults__";
const SECURITY_OPTIONS = [{ value: "deny", label: "Deny" }, { value: "allowlist", label: "Allowlist" }, { value: "full", label: "Full" }];
const ASK_OPTIONS = [{ value: "off", label: "Off" }, { value: "on-miss", label: "On miss" }, { value: "always", label: "Always" }];
function resolveBindingsState(props) {
  const config = props.configForm;
  const nodes = resolveExecNodes(props.nodes);
  const {defaultBinding, agents} = resolveAgentBindings(config);
  const ready = Boolean(config);
  const disabled = (props.configSaving || (props.configFormMode === "raw"));
  return { ready, disabled, configDirty: props.configDirty, configLoading: props.configLoading, configSaving: props.configSaving, defaultBinding, agents, nodes, onBindDefault: props.onBindDefault, onBindAgent: props.onBindAgent, onSave: props.onSaveBindings, onLoadConfig: props.onLoadConfig, formMode: props.configFormMode };
}
function normalizeSecurity(value) {
  if ((((value === "allowlist") || (value === "full")) || (value === "deny"))) {
    return value;
  }
  return "deny";
}
function normalizeAsk(value) {
  if ((((value === "always") || (value === "off")) || (value === "on-miss"))) {
    return value;
  }
  return "on-miss";
}
function resolveExecApprovalsDefaults(form) {
  const defaults = (form?.defaults ?? {  });
  return { security: normalizeSecurity(defaults.security), ask: normalizeAsk(defaults.ask), askFallback: normalizeSecurity((defaults.askFallback ?? "deny")), autoAllowSkills: Boolean((defaults.autoAllowSkills ?? false)) };
}
function resolveConfigAgents(config) {
  const agentsNode = (config?.agents ?? {  });
  const list = Array.isArray(agentsNode.list) ? agentsNode.list : [];
  const agents = [];
  list.forEach((entry) => {
    if ((!entry || (typeof entry !== "object"))) {
      return;
    }
    const record = entry;
    const id = (typeof record.id === "string") ? record.id.trim() : "";
    if (!id) {
      return;
    }
    const name = (typeof record.name === "string") ? record.name.trim() : undefined;
    const isDefault = (record.default === true);
    agents.push({ id, name: (name || undefined), isDefault });
  });
  return agents;
}
function resolveExecApprovalsAgents(config, form) {
  const configAgents = resolveConfigAgents(config);
  const approvalsAgents = Object.keys((form?.agents ?? {  }));
  const merged = new Map();
  configAgents.forEach((agent) => merged.set(agent.id, agent));
  approvalsAgents.forEach((id) => {
    if (merged.has(id)) {
      return;
    }
    merged.set(id, { id });
  });
  const agents = Array.from(merged.values());
  if ((agents.length === 0)) {
    agents.push({ id: "main", isDefault: true });
  }
  agents.sort((a, b) => {
    if ((a.isDefault && !b.isDefault)) {
      return -1;
    }
    if ((!a.isDefault && b.isDefault)) {
      return 1;
    }
    const aLabel = a.name?.trim() ? a.name : a.id;
    const bLabel = b.name?.trim() ? b.name : b.id;
    return aLabel.localeCompare(bLabel);
  });
  return agents;
}
function resolveExecApprovalsScope(selected, agents) {
  if ((selected === EXEC_APPROVALS_DEFAULT_SCOPE)) {
    return EXEC_APPROVALS_DEFAULT_SCOPE;
  }
  if ((selected && agents.some((agent) => (agent.id === selected)))) {
    return selected;
  }
  return EXEC_APPROVALS_DEFAULT_SCOPE;
}
function resolveExecApprovalsState(props) {
  const form = ((props.execApprovalsForm ?? props.execApprovalsSnapshot?.file) ?? null);
  const ready = Boolean(form);
  const defaults = resolveExecApprovalsDefaults(form);
  const agents = resolveExecApprovalsAgents(props.configForm, form);
  const targetNodes = resolveExecApprovalsNodes(props.nodes);
  const target = props.execApprovalsTarget;
  let targetNodeId = ((target === "node") && props.execApprovalsTargetNodeId) ? props.execApprovalsTargetNodeId : null;
  if ((((target === "node") && targetNodeId) && !targetNodes.some((node) => (node.id === targetNodeId)))) {
    targetNodeId = null;
  }
  const selectedScope = resolveExecApprovalsScope(props.execApprovalsSelectedAgent, agents);
  const selectedAgent = (selectedScope !== EXEC_APPROVALS_DEFAULT_SCOPE) ? ((form?.agents ?? {  })[selectedScope] ?? null) : null;
  const allowlist = Array.isArray(selectedAgent?.allowlist) ? (selectedAgent.allowlist ?? []) : [];
  return { ready, disabled: (props.execApprovalsSaving || props.execApprovalsLoading), dirty: props.execApprovalsDirty, loading: props.execApprovalsLoading, saving: props.execApprovalsSaving, form, defaults, selectedScope, selectedAgent, agents, allowlist, target, targetNodeId, targetNodes, onSelectScope: props.onExecApprovalsSelectAgent, onSelectTarget: props.onExecApprovalsTargetChange, onPatch: props.onExecApprovalsPatch, onRemove: props.onExecApprovalsRemove, onLoad: props.onLoadExecApprovals, onSave: props.onSaveExecApprovals };
}
function renderBindings(state) {
  const supportsBinding = (state.nodes.length > 0);
  const defaultValue = (state.defaultBinding ?? "");
  return html("
    <section class=\"card\">
      <div class=\"row\" style=\"justify-content: space-between; align-items: center;\">
        <div>
          <div class=\"card-title\">Exec node binding</div>
          <div class=\"card-sub\">
            Pin agents to a specific node when using <span class=\"mono\">exec host=node</span>.
          </div>
        </div>
        <button
          class=\"btn\"
          ?disabled=
          @click=
        >
          
        </button>
      </div>

      

      
    </section>
  ");
}
function renderExecApprovals(state) {
  const ready = state.ready;
  const targetReady = ((state.target !== "node") || Boolean(state.targetNodeId));
  return html("
    <section class=\"card\">
      <div class=\"row\" style=\"justify-content: space-between; align-items: center;\">
        <div>
          <div class=\"card-title\">Exec approvals</div>
          <div class=\"card-sub\">
            Allowlist and approval policy for <span class=\"mono\">exec host=gateway/node</span>.
          </div>
        </div>
        <button
          class=\"btn\"
          ?disabled=
          @click=
        >
          
        </button>
      </div>

      

      
    </section>
  ");
}
function renderExecApprovalsTarget(state) {
  const hasNodes = (state.targetNodes.length > 0);
  const nodeValue = (state.targetNodeId ?? "");
  return html("
    <div class=\"list\" style=\"margin-top: 12px;\">
      <div class=\"list-item\">
        <div class=\"list-main\">
          <div class=\"list-title\">Target</div>
          <div class=\"list-sub\">
            Gateway edits local approvals; node edits the selected node.
          </div>
        </div>
        <div class=\"list-meta\">
          <label class=\"field\">
            <span>Host</span>
            <select
              ?disabled=
              @change=
            >
              <option value=\"gateway\" ?selected=>Gateway</option>
              <option value=\"node\" ?selected=>Node</option>
            </select>
          </label>
          
        </div>
      </div>
      
    </div>
  ");
}
function renderExecApprovalsTabs(state) {
  return html("
    <div class=\"row\" style=\"margin-top: 12px; gap: 8px; flex-wrap: wrap;\">
      <span class=\"label\">Scope</span>
      <div class=\"row\" style=\"gap: 8px; flex-wrap: wrap;\">
        <button
          class=\"btn btn--sm \"
          @click=
        >
          Defaults
        </button>
        
      </div>
    </div>
  ");
}
function renderExecApprovalsPolicy(state) {
  const isDefaults = (state.selectedScope === EXEC_APPROVALS_DEFAULT_SCOPE);
  const defaults = state.defaults;
  const agent = (state.selectedAgent ?? {  });
  const basePath = isDefaults ? ["defaults"] : ["agents", state.selectedScope];
  const agentSecurity = (typeof agent.security === "string") ? agent.security : undefined;
  const agentAsk = (typeof agent.ask === "string") ? agent.ask : undefined;
  const agentAskFallback = (typeof agent.askFallback === "string") ? agent.askFallback : undefined;
  const securityValue = isDefaults ? defaults.security : (agentSecurity ?? "__default__");
  const askValue = isDefaults ? defaults.ask : (agentAsk ?? "__default__");
  const askFallbackValue = isDefaults ? defaults.askFallback : (agentAskFallback ?? "__default__");
  const autoOverride = (typeof agent.autoAllowSkills === "boolean") ? agent.autoAllowSkills : undefined;
  const autoEffective = (autoOverride ?? defaults.autoAllowSkills);
  const autoIsDefault = (autoOverride == null);
  return html("
    <div class=\"list\" style=\"margin-top: 16px;\">
      <div class=\"list-item\">
        <div class=\"list-main\">
          <div class=\"list-title\">Security</div>
          <div class=\"list-sub\">
            
          </div>
        </div>
        <div class=\"list-meta\">
          <label class=\"field\">
            <span>Mode</span>
            <select
              ?disabled=
              @change=
            >
              
              
            </select>
          </label>
        </div>
      </div>

      <div class=\"list-item\">
        <div class=\"list-main\">
          <div class=\"list-title\">Ask</div>
          <div class=\"list-sub\">
            
          </div>
        </div>
        <div class=\"list-meta\">
          <label class=\"field\">
            <span>Mode</span>
            <select
              ?disabled=
              @change=
            >
              
              
            </select>
          </label>
        </div>
      </div>

      <div class=\"list-item\">
        <div class=\"list-main\">
          <div class=\"list-title\">Ask fallback</div>
          <div class=\"list-sub\">
            
          </div>
        </div>
        <div class=\"list-meta\">
          <label class=\"field\">
            <span>Fallback</span>
            <select
              ?disabled=
              @change=
            >
              
              
            </select>
          </label>
        </div>
      </div>

      <div class=\"list-item\">
        <div class=\"list-main\">
          <div class=\"list-title\">Auto-allow skill CLIs</div>
          <div class=\"list-sub\">
            
          </div>
        </div>
        <div class=\"list-meta\">
          <label class=\"field\">
            <span>Enabled</span>
            <input
              type=\"checkbox\"
              ?disabled=
              .checked=
              @change=
            />
          </label>
          
        </div>
      </div>
    </div>
  ");
}
function renderExecApprovalsAllowlist(state) {
  const allowlistPath = ["agents", state.selectedScope, "allowlist"];
  const entries = state.allowlist;
  return html("
    <div class=\"row\" style=\"margin-top: 18px; justify-content: space-between;\">
      <div>
        <div class=\"card-title\">Allowlist</div>
        <div class=\"card-sub\">Case-insensitive glob patterns.</div>
      </div>
      <button
        class=\"btn btn--sm\"
        ?disabled=
        @click=
      >
        Add pattern
      </button>
    </div>
    <div class=\"list\" style=\"margin-top: 12px;\">
      
    </div>
  ");
}
function renderAllowlistEntry(state, entry, index) {
  const lastUsed = entry.lastUsedAt ? formatAgo(entry.lastUsedAt) : "never";
  const lastCommand = entry.lastUsedCommand ? clampText(entry.lastUsedCommand, 120) : null;
  const lastPath = entry.lastResolvedPath ? clampText(entry.lastResolvedPath, 120) : null;
  return html("
    <div class=\"list-item\">
      <div class=\"list-main\">
        <div class=\"list-title\"></div>
        <div class=\"list-sub\">Last used: </div>
        
        
      </div>
      <div class=\"list-meta\">
        <label class=\"field\">
          <span>Pattern</span>
          <input
            type=\"text\"
            .value=
            ?disabled=
            @input=
          />
        </label>
        <button
          class=\"btn btn--sm danger\"
          ?disabled=
          @click=
        >
          Remove
        </button>
      </div>
    </div>
  ");
}
function renderAgentBinding(agent, state) {
  const bindingValue = (agent.binding ?? "__default__");
  const label = agent.name?.trim() ? " ()" : agent.id;
  const supportsBinding = (state.nodes.length > 0);
  return html("
    <div class=\"list-item\">
      <div class=\"list-main\">
        <div class=\"list-title\"></div>
        <div class=\"list-sub\">
           ·
          
        </div>
      </div>
      <div class=\"list-meta\">
        <label class=\"field\">
          <span>Binding</span>
          <select
            ?disabled=
            @change=
          >
            <option value=\"__default__\" ?selected=>
              Use default
            </option>
            
          </select>
        </label>
      </div>
    </div>
  ");
}
function resolveExecNodes(nodes) {
  const list = [];
  for (const node of nodes) {
    const commands = Array.isArray(node.commands) ? node.commands : [];
    const supports = commands.some((cmd) => (String(cmd) === "system.run"));
    if (!supports) {
      continue;
    }
    const nodeId = (typeof node.nodeId === "string") ? node.nodeId.trim() : "";
    if (!nodeId) {
      continue;
    }
    const displayName = ((typeof node.displayName === "string") && node.displayName.trim()) ? node.displayName.trim() : nodeId;
    list.push({ id: nodeId, label: (displayName === nodeId) ? nodeId : " · " });
  }
  list.sort((a, b) => a.label.localeCompare(b.label));
  return list;
}
function resolveExecApprovalsNodes(nodes) {
  const list = [];
  for (const node of nodes) {
    const commands = Array.isArray(node.commands) ? node.commands : [];
    const supports = commands.some((cmd) => ((String(cmd) === "system.execApprovals.get") || (String(cmd) === "system.execApprovals.set")));
    if (!supports) {
      continue;
    }
    const nodeId = (typeof node.nodeId === "string") ? node.nodeId.trim() : "";
    if (!nodeId) {
      continue;
    }
    const displayName = ((typeof node.displayName === "string") && node.displayName.trim()) ? node.displayName.trim() : nodeId;
    list.push({ id: nodeId, label: (displayName === nodeId) ? nodeId : " · " });
  }
  list.sort((a, b) => a.label.localeCompare(b.label));
  return list;
}
function resolveAgentBindings(config) {
  const fallbackAgent = { id: "main", name: undefined, index: 0, isDefault: true, binding: null };
  if ((!config || (typeof config !== "object"))) {
    return { defaultBinding: null, agents: [fallbackAgent] };
  }
  const tools = (config.tools ?? {  });
  const exec = (tools.exec ?? {  });
  const defaultBinding = ((typeof exec.node === "string") && exec.node.trim()) ? exec.node.trim() : null;
  const agentsNode = (config.agents ?? {  });
  const list = Array.isArray(agentsNode.list) ? agentsNode.list : [];
  if ((list.length === 0)) {
    return { defaultBinding, agents: [fallbackAgent] };
  }
  const agents = [];
  list.forEach((entry, index) => {
    if ((!entry || (typeof entry !== "object"))) {
      return;
    }
    const record = entry;
    const id = (typeof record.id === "string") ? record.id.trim() : "";
    if (!id) {
      return;
    }
    const name = (typeof record.name === "string") ? record.name.trim() : undefined;
    const isDefault = (record.default === true);
    const toolsEntry = (record.tools ?? {  });
    const execEntry = (toolsEntry.exec ?? {  });
    const binding = ((typeof execEntry.node === "string") && execEntry.node.trim()) ? execEntry.node.trim() : null;
    agents.push({ id, name: (name || undefined), index, isDefault, binding });
  });
  if ((agents.length === 0)) {
    agents.push(fallbackAgent);
  }
  return { defaultBinding, agents };
}
function renderNode(node) {
  const connected = Boolean(node.connected);
  const paired = Boolean(node.paired);
  const title = (((typeof node.displayName === "string") && node.displayName.trim()) || (typeof node.nodeId === "string") ? node.nodeId : "unknown");
  const caps = Array.isArray(node.caps) ? node.caps : [];
  const commands = Array.isArray(node.commands) ? node.commands : [];
  return html("
    <div class=\"list-item\">
      <div class=\"list-main\">
        <div class=\"list-title\"></div>
        <div class=\"list-sub\">
          
          
          
        </div>
        <div class=\"chip-row\" style=\"margin-top: 6px;\">
          <span class=\"chip\"></span>
          <span class=\"chip \">
            
          </span>
          
          
        </div>
      </div>
    </div>
  ");
}
