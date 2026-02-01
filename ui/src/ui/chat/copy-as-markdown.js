import { html } from "lit";
import { icons } from "../icons";
const COPIED_FOR_MS = 1500;
const ERROR_FOR_MS = 2000;
const COPY_LABEL = "Copy as markdown";
const COPIED_LABEL = "Copied";
const ERROR_LABEL = "Copy failed";
async function copyTextToClipboard(text) {
  if (!text) {
    return false;
  }
  try {
    {
      await navigator.clipboard.writeText(text);
      return true;
    }
  }
  catch {
    {
      return false;
    }
  }
}
function setButtonLabel(button, label) {
  button.title = label;
  button.setAttribute("aria-label", label);
}
function createCopyButton(options) {
  const idleLabel = (options.label ?? COPY_LABEL);
  return html("
    <button
      class=\"chat-copy-btn\"
      type=\"button\"
      title=
      aria-label=
      @click=
    >
      <span class=\"chat-copy-btn__icon\" aria-hidden=\"true\">
        <span class=\"chat-copy-btn__icon-copy\"></span>
        <span class=\"chat-copy-btn__icon-check\"></span>
      </span>
    </button>
  ");
}
export function renderCopyAsMarkdownButton(markdown) {
  return createCopyButton({ text: () => markdown, label: COPY_LABEL });
}

