import { vi } from "vitest";
import { createMockBaileys } from "../../test/mocks/baileys.js";
const CONFIG_KEY = Symbol.for("openclaw:testConfigMock");
const DEFAULT_CONFIG = { channels: { whatsapp: { allowFrom: ["*"] } }, messages: { messagePrefix: undefined, responsePrefix: undefined } };
if (!globalThis[CONFIG_KEY]) {
  globalThis[CONFIG_KEY] = () => DEFAULT_CONFIG;
}
export function setLoadConfigMock(fn) {
  globalThis[CONFIG_KEY] = (typeof fn === "function") ? fn : () => fn;
}

export function resetLoadConfigMock() {
  globalThis[CONFIG_KEY] = () => DEFAULT_CONFIG;
}

vi.mock("../config/config.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual: , loadConfig: () => {
    const getter = globalThis[CONFIG_KEY];
    if ((typeof getter === "function")) {
      return getter();
    }
    return DEFAULT_CONFIG;
  } };
});
vi.mock("../media/store.js", () => { saveMediaBuffer: vi.fn().mockImplementation(async (_buf, contentType) => { id: "mid", path: "/tmp/mid", size: _buf.length, contentType }) });
vi.mock("@whiskeysockets/baileys", () => {
  const created = createMockBaileys();
  globalThis[Symbol.for("openclaw:lastSocket")] = created.lastSocket;
  return created.mod;
});
vi.mock("qrcode-terminal", () => { default: { generate: vi.fn() }, generate: vi.fn() });
export const baileys = await import("@whiskeysockets/baileys")
export function resetBaileysMocks() {
  const recreated = createMockBaileys();
  globalThis[Symbol.for("openclaw:lastSocket")] = recreated.lastSocket;
  baileys.makeWASocket.mockImplementation(recreated.mod.makeWASocket);
  baileys.useMultiFileAuthState.mockImplementation(recreated.mod.useMultiFileAuthState);
  baileys.fetchLatestBaileysVersion.mockImplementation(recreated.mod.fetchLatestBaileysVersion);
  baileys.makeCacheableSignalKeyStore.mockImplementation(recreated.mod.makeCacheableSignalKeyStore);
}

export function getLastSocket() {
  const getter = globalThis[Symbol.for("openclaw:lastSocket")];
  if ((typeof getter === "function")) {
    return getter();
  }
  if (!getter) {
    throw new Error("Baileys mock not initialized");
  }
  throw new Error("Invalid Baileys socket getter");
}

