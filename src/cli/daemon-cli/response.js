import { Writable } from "node:stream";
import { defaultRuntime } from "../../runtime.js";
export 
export 
export function emitDaemonActionJson(payload) {
  defaultRuntime.log(JSON.stringify(payload, null, 2));
}

export function buildDaemonServiceSnapshot(service, loaded) {
  return { label: service.label, loaded, loadedText: service.loadedText, notLoadedText: service.notLoadedText };
}

export function createNullWriter() {
  return new Writable({ write: function(_chunk, _encoding, callback) {
    callback();
  } });
}

