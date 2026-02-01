import fs from "node:fs/promises";
export async function applyUpdateHunk(filePath, chunks) {
  const originalContents = await fs.readFile(filePath, "utf8").catch((err) => {
    throw new Error("Failed to read file to update : ");
  });
  const originalLines = originalContents.split("
");
  if (((originalLines.length > 0) && (originalLines[(originalLines.length - 1)] === ""))) {
    originalLines.pop();
  }
  const replacements = computeReplacements(originalLines, filePath, chunks);
  let newLines = applyReplacements(originalLines, replacements);
  if (((newLines.length === 0) || (newLines[(newLines.length - 1)] !== ""))) {
    newLines = [...newLines, ""];
  }
  return newLines.join("
");
}

function computeReplacements(originalLines, filePath, chunks) {
  const replacements = [];
  let lineIndex = 0;
  for (const chunk of chunks) {
    if (chunk.changeContext) {
      const ctxIndex = seekSequence(originalLines, [chunk.changeContext], lineIndex, false);
      if ((ctxIndex === null)) {
        throw new Error("Failed to find context '' in ");
      }
      lineIndex = (ctxIndex + 1);
    }
    if ((chunk.oldLines.length === 0)) {
      const insertionIndex = ((originalLines.length > 0) && (originalLines[(originalLines.length - 1)] === "")) ? (originalLines.length - 1) : originalLines.length;
      replacements.push([insertionIndex, 0, chunk.newLines]);
      continue;
    }
    let pattern = chunk.oldLines;
    let newSlice = chunk.newLines;
    let found = seekSequence(originalLines, pattern, lineIndex, chunk.isEndOfFile);
    if (((found === null) && (pattern[(pattern.length - 1)] === ""))) {
      pattern = pattern.slice(0, -1);
      if (((newSlice.length > 0) && (newSlice[(newSlice.length - 1)] === ""))) {
        newSlice = newSlice.slice(0, -1);
      }
      found = seekSequence(originalLines, pattern, lineIndex, chunk.isEndOfFile);
    }
    if ((found === null)) {
      throw new Error("Failed to find expected lines in :
");
    }
    replacements.push([found, pattern.length, newSlice]);
    lineIndex = (found + pattern.length);
  }
  replacements.sort((a, b) => (a[0] - b[0]));
  return replacements;
}
function applyReplacements(lines, replacements) {
  const result = [...lines];
  for (const [startIndex, oldLen, newLines] of [...replacements].reverse()) {
    for (let i = 0; (i < oldLen); i += 1) {
      if ((startIndex < result.length)) {
        result.splice(startIndex, 1);
      }
    }
    for (let i = 0; (i < newLines.length); i += 1) {
      result.splice((startIndex + i), 0, newLines[i]);
    }
  }
  return result;
}
function seekSequence(lines, pattern, start, eof) {
  if ((pattern.length === 0)) {
    return start;
  }
  if ((pattern.length > lines.length)) {
    return null;
  }
  const maxStart = (lines.length - pattern.length);
  const searchStart = (eof && (lines.length >= pattern.length)) ? maxStart : start;
  if ((searchStart > maxStart)) {
    return null;
  }
  for (let i = searchStart; (i <= maxStart); i += 1) {
    if (linesMatch(lines, pattern, i, (value) => value)) {
      return i;
    }
  }
  for (let i = searchStart; (i <= maxStart); i += 1) {
    if (linesMatch(lines, pattern, i, (value) => value.trimEnd())) {
      return i;
    }
  }
  for (let i = searchStart; (i <= maxStart); i += 1) {
    if (linesMatch(lines, pattern, i, (value) => value.trim())) {
      return i;
    }
  }
  for (let i = searchStart; (i <= maxStart); i += 1) {
    if (linesMatch(lines, pattern, i, (value) => normalizePunctuation(value.trim()))) {
      return i;
    }
  }
  return null;
}
function linesMatch(lines, pattern, start, normalize) {
  for (let idx = 0; (idx < pattern.length); idx += 1) {
    if ((normalize(lines[(start + idx)]) !== normalize(pattern[idx]))) {
      return false;
    }
  }
  return true;
}
function normalizePunctuation(value) {
  return Array.from(value).map((char) => {
    switch (char) {
      case "‐":
      case "‑":
      case "‒":
      case "–":
      case "—":
      case "―":
      case "−":
        return "-";
      case "‘":
      case "’":
      case "‚":
      case "‛":
        return "'";
      case "“":
      case "”":
      case "„":
      case "‟":
        return "\"";
      case " ":
      case " ":
      case " ":
      case " ":
      case " ":
      case " ":
      case " ":
      case " ":
      case " ":
      case " ":
      case " ":
      case " ":
      case "　":
        return " ";
      default:
        return char;
    }
  }).join("");
}
