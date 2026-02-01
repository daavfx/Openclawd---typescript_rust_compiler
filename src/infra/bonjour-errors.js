export function formatBonjourError(err) {
  if ((err instanceof Error)) {
    const msg = (err.message || String(err));
    return (err.name && (err.name !== "Error")) ? ": " : msg;
  }
  return String(err);
}

