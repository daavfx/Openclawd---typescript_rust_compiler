export 
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
export async function pollUntil(fn, opts = {  }) {
  const timeoutMs = (opts.timeoutMs ?? 2000);
  const intervalMs = (opts.intervalMs ?? 25);
  const start = Date.now();
  while (((Date.now() - start) < timeoutMs)) {
    const value = await fn();
    if (((value !== null) && (value !== undefined))) {
      return value;
    }
    await sleep(intervalMs);
  }
  return undefined;
}

