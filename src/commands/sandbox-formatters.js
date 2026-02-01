export function formatStatus(running) {
  return running ? "🟢 running" : "⚫ stopped";
}

export function formatSimpleStatus(running) {
  return running ? "running" : "stopped";
}

export function formatImageMatch(matches) {
  return matches ? "✓" : "⚠️  mismatch";
}

export function formatAge(ms) {
  const seconds = Math.floor((ms / 1000));
  const minutes = Math.floor((seconds / 60));
  const hours = Math.floor((minutes / 60));
  const days = Math.floor((hours / 24));
  if ((days > 0)) {
    return "d h";
  }
  if ((hours > 0)) {
    return "h m";
  }
  if ((minutes > 0)) {
    return "m";
  }
  return "s";
}

export 
export function countRunning(items) {
  return items.filter((item) => item.running).length;
}

export function countMismatches(items) {
  return items.filter((item) => !item.imageMatch).length;
}

