let runtime = null;
export function setZalouserRuntime(next) {
  runtime = next;
}

export function getZalouserRuntime() {
  if (!runtime) {
    throw new Error("Zalouser runtime not initialized");
  }
  return runtime;
}

