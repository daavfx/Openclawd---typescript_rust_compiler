export function waitForever() {
  const interval = setInterval(() => {
  }, 1000000);
  interval.unref();
  return new Promise(() => {
  });
}

