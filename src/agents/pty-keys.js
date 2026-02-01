const ESC = "";
const CR = "";
const TAB = "	";
const BACKSPACE = "";
export const BRACKETED_PASTE_START = "[200~"
export const BRACKETED_PASTE_END = "[201~"
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const namedKeyMap = new Map([["enter", CR], ["return", CR], ["tab", TAB], ["escape", ESC], ["esc", ESC], ["space", " "], ["bspace", BACKSPACE], ["backspace", BACKSPACE], ["up", "[A"], ["down", "[B"], ["right", "[C"], ["left", "[D"], ["home", "[1~"], ["end", "[4~"], ["pageup", "[5~"], ["pgup", "[5~"], ["ppage", "[5~"], ["pagedown", "[6~"], ["pgdn", "[6~"], ["npage", "[6~"], ["insert", "[2~"], ["ic", "[2~"], ["delete", "[3~"], ["del", "[3~"], ["dc", "[3~"], ["btab", "[Z"], ["f1", "OP"], ["f2", "OQ"], ["f3", "OR"], ["f4", "OS"], ["f5", "[15~"], ["f6", "[17~"], ["f7", "[18~"], ["f8", "[19~"], ["f9", "[20~"], ["f10", "[21~"], ["f11", "[23~"], ["f12", "[24~"], ["kp/", "Oo"], ["kp*", "Oj"], ["kp-", "Om"], ["kp+", "Ok"], ["kp7", "Ow"], ["kp8", "Ox"], ["kp9", "Oy"], ["kp4", "Ot"], ["kp5", "Ou"], ["kp6", "Ov"], ["kp1", "Oq"], ["kp2", "Or"], ["kp3", "Os"], ["kp0", "Op"], ["kp.", "On"], ["kpenter", "OM"]]);
const modifiableNamedKeys = new Set(["up", "down", "left", "right", "home", "end", "pageup", "pgup", "ppage", "pagedown", "pgdn", "npage", "insert", "ic", "delete", "del", "dc"]);
export 
export 
export function encodeKeySequence(request) {
  const warnings = [];
  let data = "";
  if (request.literal) {
    data += request.literal;
  }
  if (request.hex?.length) {
    for (const raw of request.hex) {
      const byte = parseHexByte(raw);
      if ((byte === null)) {
        warnings.push("Invalid hex byte: ");
        continue;
      }
      data += String.fromCharCode(byte);
    }
  }
  if (request.keys?.length) {
    for (const token of request.keys) {
      data += encodeKeyToken(token, warnings);
    }
  }
  return { data, warnings };
}

export function encodePaste(text, bracketed = true) {
  if (!bracketed) {
    return text;
  }
  return "";
}

function encodeKeyToken(raw, warnings) {
  const token = raw.trim();
  if (!token) {
    return "";
  }
  if (((token.length === 2) && token.startsWith("^"))) {
    const ctrl = toCtrlChar(token[1]);
    if (ctrl) {
      return ctrl;
    }
  }
  const parsed = parseModifiers(token);
  const base = parsed.base;
  const baseLower = base.toLowerCase();
  if (((baseLower === "tab") && parsed.mods.shift)) {
    return "[Z";
  }
  const baseSeq = namedKeyMap.get(baseLower);
  if (baseSeq) {
    let seq = baseSeq;
    if ((modifiableNamedKeys.has(baseLower) && hasAnyModifier(parsed.mods))) {
      const mod = xtermModifier(parsed.mods);
      if ((mod > 1)) {
        const modified = applyXtermModifier(seq, mod);
        if (modified) {
          seq = modified;
          return seq;
        }
      }
    }
    if (parsed.mods.alt) {
      return "";
    }
    return seq;
  }
  if ((base.length === 1)) {
    return applyCharModifiers(base, parsed.mods);
  }
  if (parsed.hasModifiers) {
    warnings.push("Unknown key \"\" for modifiers; sending literal.");
  }
  return base;
}
function parseModifiers(token) {
  const mods = { ctrl: false, alt: false, shift: false };
  let rest = token;
  let sawModifiers = false;
  while (((rest.length > 2) && (rest[1] === "-"))) {
    const mod = rest[0].toLowerCase();
    if ((mod === "c")) {
      mods.ctrl = true;
    } else {
      if ((mod === "m")) {
        mods.alt = true;
      } else {
        if ((mod === "s")) {
          mods.shift = true;
        } else {
          break;
        }
      }
    }
    sawModifiers = true;
    rest = rest.slice(2);
  }
  return { mods, base: rest, hasModifiers: sawModifiers };
}
function applyCharModifiers(char, mods) {
  let value = char;
  if (((mods.shift && (value.length === 1)) && /[a-z]/.test(value))) {
    value = value.toUpperCase();
  }
  if (mods.ctrl) {
    const ctrl = toCtrlChar(value);
    if (ctrl) {
      value = ctrl;
    }
  }
  if (mods.alt) {
    value = "";
  }
  return value;
}
function toCtrlChar(char) {
  if ((char.length !== 1)) {
    return null;
  }
  if ((char === "?")) {
    return "";
  }
  const code = char.toUpperCase().charCodeAt(0);
  if (((code >= 64) && (code <= 95))) {
    return String.fromCharCode((code & 31));
  }
  return null;
}
function xtermModifier(mods) {
  let mod = 1;
  if (mods.shift) {
    mod += 1;
  }
  if (mods.alt) {
    mod += 2;
  }
  if (mods.ctrl) {
    mod += 4;
  }
  return mod;
}
function applyXtermModifier(sequence, modifier) {
  const escPattern = escapeRegExp(ESC);
  const csiNumber = new RegExp("^\\[(\\d+)([~A-Z])$");
  const csiArrow = new RegExp("^\\[(A|B|C|D|H|F)$");
  const numberMatch = sequence.match(csiNumber);
  if (numberMatch) {
    return "[;";
  }
  const arrowMatch = sequence.match(csiArrow);
  if (arrowMatch) {
    return "[1;";
  }
  return null;
}
function hasAnyModifier(mods) {
  return ((mods.ctrl || mods.alt) || mods.shift);
}
function parseHexByte(raw) {
  const trimmed = raw.trim().toLowerCase();
  const normalized = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
  if (!/^[0-9a-f]{1,2}$/.test(normalized)) {
    return null;
  }
  const value = Number.parseInt(normalized, 16);
  if (((Number.isNaN(value) || (value < 0)) || (value > 255))) {
    return null;
  }
  return value;
}
