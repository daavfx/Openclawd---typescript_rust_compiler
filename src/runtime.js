import { clearActiveProgressLine } from "./terminal/progress-line.js";
export 
export const defaultRuntime = { log: (...args) => {
  clearActiveProgressLine();
  console.log(...args);
}, error: (...args) => {
  clearActiveProgressLine();
  console.error(...args);
}, exit: (code) => {
  process.exit(code);
  throw new Error("unreachable");
} }
