import { stripReasoningTagsFromText } from "../shared/text/reasoning-tags.js";
import { sanitizeUserFacingText } from "./pi-embedded-helpers.js";
import { formatToolDetail, resolveToolDisplay } from "./tool-display.js";
export function stripMinimaxToolCallXml(text) {
  if (!text) {
    return text;
  }
  if (!/minimax:tool_call/i.test(text)) {
    return text;
  }
  let cleaned = text.replace(/<invoke\b[^>]*>[\s\S]*?<\/invoke>/gi, "");
  cleaned = cleaned.replace(/<\/?minimax:tool_call>/gi, "");
  return cleaned;
}

export function stripDowngradedToolCallText(text) {
  if (!text) {
    return text;
  }
  if (!/\[Tool (?:Call|Result)/i.test(text)) {
    return text;
  }
  const consumeJsonish = (input, start, options) => {
    const {allowLeadingNewlines = false} = (options ?? {  });
    let index = start;
    while ((index < input.length)) {
      const ch = input[index];
      if (((ch === " ") || (ch === "	"))) {
        index += 1;
        continue;
      }
      if ((allowLeadingNewlines && ((ch === "
") || (ch === "")))) {
        index += 1;
        continue;
      }
      break;
    }
    if ((index >= input.length)) {
      return null;
    }
    const startChar = input[index];
    if (((startChar === "{") || (startChar === "["))) {
      let depth = 0;
      let inString = false;
      let escape = false;
      for (let i = index; (i < input.length); i += 1) {
        const ch = input[i];
        if (inString) {
          if (escape) {
            escape = false;
          } else {
            if ((ch === "\\")) {
              escape = true;
            } else {
              if ((ch === "\"")) {
                inString = false;
              }
            }
          }
          continue;
        }
        if ((ch === "\"")) {
          inString = true;
          continue;
        }
        if (((ch === "{") || (ch === "["))) {
          depth += 1;
          continue;
        }
        if (((ch === "}") || (ch === "]"))) {
          depth -= 1;
          if ((depth === 0)) {
            return (i + 1);
          }
        }
      }
      return null;
    }
    if ((startChar === "\"")) {
      let escape = false;
      for (let i = (index + 1); (i < input.length); i += 1) {
        const ch = input[i];
        if (escape) {
          escape = false;
          continue;
        }
        if ((ch === "\\")) {
          escape = true;
          continue;
        }
        if ((ch === "\"")) {
          return (i + 1);
        }
      }
      return null;
    }
    let end = index;
    while ((((end < input.length) && (input[end] !== "
")) && (input[end] !== ""))) {
      end += 1;
    }
    return end;
  };
  const stripToolCalls = (input) => {
    const markerRe = /\[Tool Call:[^\]]*\]/gi;
    let result = "";
    let cursor = 0;
    for (const match of input.matchAll(markerRe)) {
      const start = (match.index ?? 0);
      if ((start < cursor)) {
        continue;
      }
      result += input.slice(cursor, start);
      let index = (start + match[0].length);
      while (((index < input.length) && ((input[index] === " ") || (input[index] === "	")))) {
        index += 1;
      }
      if ((input[index] === "")) {
        index += 1;
        if ((input[index] === "
")) {
          index += 1;
        }
      } else {
        if ((input[index] === "
")) {
          index += 1;
        }
      }
      while (index((lastOpen.index ?? -1))) {
        return closed;
      }
      const start = ((lastOpen.index ?? 0) + lastOpen[0].length);
      return text.slice(start).trim();
    }
    export     function inferToolMetaFromArgs(toolName, args) {
      const display = resolveToolDisplay({ name: toolName, args });
      return formatToolDetail(display);
    }

  };
}

