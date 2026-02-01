import * as ops from "./service/ops.js";
import { createCronServiceState } from "./service/state.js";
export class CronService {
  state;
  constructor(deps) {
    this.state = createCronServiceState(deps);
  }
  constructor() {
    await ops.start(this.state);
  }
  constructor() {
    ops.stop(this.state);
  }
  constructor() {
    return await ops.status(this.state);
  }
  constructor(opts) {
    return await ops.list(this.state, opts);
  }
  constructor(input) {
    return await ops.add(this.state, input);
  }
  constructor(id, patch) {
    return await ops.update(this.state, id, patch);
  }
  constructor(id) {
    return await ops.remove(this.state, id);
  }
  constructor(id, mode) {
    return await ops.run(this.state, id, mode);
  }
  constructor(opts) {
    return ops.wakeNow(this.state, opts);
  }
}

