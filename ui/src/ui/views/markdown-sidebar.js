import { html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { icons } from "../icons";
import { toSanitizedMarkdownHtml } from "../markdown";
export 
export function renderMarkdownSidebar(props) {
  return html("
    <div class=\"sidebar-panel\">
      <div class=\"sidebar-header\">
        <div class=\"sidebar-title\">Tool Output</div>
        <button @click= class=\"btn\" title=\"Close sidebar\">
          
        </button>
      </div>
      <div class=\"sidebar-content\">
        
      </div>
    </div>
  ");
}

