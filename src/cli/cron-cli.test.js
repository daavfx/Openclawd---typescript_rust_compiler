import { Command } from "commander";
import { describe, expect, it, vi } from "vitest";
const callGatewayFromCli = vi.fn(async (method, _opts, params) => {
  if ((method === "cron.status")) {
    return { enabled: true };
  }
  return { ok: true, params };
});
vi.mock("./gateway-rpc.js", async () => {
  const actual = await vi.importActual("./gateway-rpc.js");
  return { ...actual: , callGatewayFromCli: (method, opts, params, extra) => callGatewayFromCli(method, opts, params, extra) };
});
vi.mock("../runtime.js", () => { defaultRuntime: { log: vi.fn(), error: vi.fn(), exit: (code) => {
  throw new Error("__exit__:");
} } });
describe("cron cli", () => {
  it("trims model and thinking on cron add", { timeout: 60000 }, async () => {
    callGatewayFromCli.mockClear();
    const {registerCronCli} = await import("./cron-cli.js");
    const program = new Command();
    program.exitOverride();
    registerCronCli(program);
    await program.parseAsync(["cron", "add", "--name", "Daily", "--cron", "* * * * *", "--session", "isolated", "--message", "hello", "--model", "  opus  ", "--thinking", "  low  "], { from: "user" });
    const addCall = callGatewayFromCli.mock.calls.find((call) => (call[0] === "cron.add"));
    const params = addCall?.[2];
    expect(params?.payload?.model).toBe("opus");
    expect(params?.payload?.thinking).toBe("low");
  });
  it("sends agent id on cron add", async () => {
    callGatewayFromCli.mockClear();
    const {registerCronCli} = await import("./cron-cli.js");
    const program = new Command();
    program.exitOverride();
    registerCronCli(program);
    await program.parseAsync(["cron", "add", "--name", "Agent pinned", "--cron", "* * * * *", "--session", "isolated", "--message", "hi", "--agent", "ops"], { from: "user" });
    const addCall = callGatewayFromCli.mock.calls.find((call) => (call[0] === "cron.add"));
    const params = addCall?.[2];
    expect(params?.agentId).toBe("ops");
  });
  it("omits empty model and thinking on cron edit", async () => {
    callGatewayFromCli.mockClear();
    const {registerCronCli} = await import("./cron-cli.js");
    const program = new Command();
    program.exitOverride();
    registerCronCli(program);
    await program.parseAsync(["cron", "edit", "job-1", "--message", "hello", "--model", "   ", "--thinking", "  "], { from: "user" });
    const updateCall = callGatewayFromCli.mock.calls.find((call) => (call[0] === "cron.update"));
    const patch = updateCall?.[2];
    expect(patch?.patch?.payload?.model).toBeUndefined();
    expect(patch?.patch?.payload?.thinking).toBeUndefined();
  });
  it("trims model and thinking on cron edit", async () => {
    callGatewayFromCli.mockClear();
    const {registerCronCli} = await import("./cron-cli.js");
    const program = new Command();
    program.exitOverride();
    registerCronCli(program);
    await program.parseAsync(["cron", "edit", "job-1", "--message", "hello", "--model", "  opus  ", "--thinking", "  high  "], { from: "user" });
    const updateCall = callGatewayFromCli.mock.calls.find((call) => (call[0] === "cron.update"));
    const patch = updateCall?.[2];
    expect(patch?.patch?.payload?.model).toBe("opus");
    expect(patch?.patch?.payload?.thinking).toBe("high");
  });
  it("sets and clears agent id on cron edit", async () => {
    callGatewayFromCli.mockClear();
    const {registerCronCli} = await import("./cron-cli.js");
    const program = new Command();
    program.exitOverride();
    registerCronCli(program);
    await program.parseAsync(["cron", "edit", "job-1", "--agent", " Ops ", "--message", "hello"], { from: "user" });
    const updateCall = callGatewayFromCli.mock.calls.find((call) => (call[0] === "cron.update"));
    const patch = updateCall?.[2];
    expect(patch?.patch?.agentId).toBe("ops");
    callGatewayFromCli.mockClear();
    await program.parseAsync(["cron", "edit", "job-2", "--clear-agent"], { from: "user" });
    const clearCall = callGatewayFromCli.mock.calls.find((call) => (call[0] === "cron.update"));
    const clearPatch = clearCall?.[2];
    expect(clearPatch?.patch?.agentId).toBeNull();
  });
  it("allows model/thinking updates without --message", async () => {
    callGatewayFromCli.mockClear();
    const {registerCronCli} = await import("./cron-cli.js");
    const program = new Command();
    program.exitOverride();
    registerCronCli(program);
    await program.parseAsync(["cron", "edit", "job-1", "--model", "opus", "--thinking", "low"], { from: "user" });
    const updateCall = callGatewayFromCli.mock.calls.find((call) => (call[0] === "cron.update"));
    const patch = updateCall?.[2];
    expect(patch?.patch?.payload?.kind).toBe("agentTurn");
    expect(patch?.patch?.payload?.model).toBe("opus");
    expect(patch?.patch?.payload?.thinking).toBe("low");
  });
  it("updates delivery settings without requiring --message", async () => {
    callGatewayFromCli.mockClear();
    const {registerCronCli} = await import("./cron-cli.js");
    const program = new Command();
    program.exitOverride();
    registerCronCli(program);
    await program.parseAsync(["cron", "edit", "job-1", "--deliver", "--channel", "telegram", "--to", "19098680"], { from: "user" });
    const updateCall = callGatewayFromCli.mock.calls.find((call) => (call[0] === "cron.update"));
    const patch = updateCall?.[2];
    expect(patch?.patch?.payload?.kind).toBe("agentTurn");
    expect(patch?.patch?.payload?.deliver).toBe(true);
    expect(patch?.patch?.payload?.channel).toBe("telegram");
    expect(patch?.patch?.payload?.to).toBe("19098680");
    expect(patch?.patch?.payload?.message).toBeUndefined();
  });
  it("supports --no-deliver on cron edit", async () => {
    callGatewayFromCli.mockClear();
    const {registerCronCli} = await import("./cron-cli.js");
    const program = new Command();
    program.exitOverride();
    registerCronCli(program);
    await program.parseAsync(["cron", "edit", "job-1", "--no-deliver"], { from: "user" });
    const updateCall = callGatewayFromCli.mock.calls.find((call) => (call[0] === "cron.update"));
    const patch = updateCall?.[2];
    expect(patch?.patch?.payload?.kind).toBe("agentTurn");
    expect(patch?.patch?.payload?.deliver).toBe(false);
  });
  it("does not include undefined delivery fields when updating message", async () => {
    callGatewayFromCli.mockClear();
    const {registerCronCli} = await import("./cron-cli.js");
    const program = new Command();
    program.exitOverride();
    registerCronCli(program);
    await program.parseAsync(["cron", "edit", "job-1", "--message", "Updated message"], { from: "user" });
    const updateCall = callGatewayFromCli.mock.calls.find((call) => (call[0] === "cron.update"));
    const patch = updateCall?.[2];
    expect(patch?.patch?.payload?.message).toBe("Updated message");
    expect(patch?.patch?.payload).not.toHaveProperty("deliver");
    expect(patch?.patch?.payload).not.toHaveProperty("channel");
    expect(patch?.patch?.payload).not.toHaveProperty("to");
    expect(patch?.patch?.payload).not.toHaveProperty("bestEffortDeliver");
  });
  it("includes delivery fields when explicitly provided with message", async () => {
    callGatewayFromCli.mockClear();
    const {registerCronCli} = await import("./cron-cli.js");
    const program = new Command();
    program.exitOverride();
    registerCronCli(program);
    await program.parseAsync(["cron", "edit", "job-1", "--message", "Updated message", "--deliver", "--channel", "telegram", "--to", "19098680"], { from: "user" });
    const updateCall = callGatewayFromCli.mock.calls.find((call) => (call[0] === "cron.update"));
    const patch = updateCall?.[2];
    expect(patch?.patch?.payload?.message).toBe("Updated message");
    expect(patch?.patch?.payload?.deliver).toBe(true);
    expect(patch?.patch?.payload?.channel).toBe("telegram");
    expect(patch?.patch?.payload?.to).toBe("19098680");
  });
  it("includes best-effort delivery when provided with message", async () => {
    callGatewayFromCli.mockClear();
    const {registerCronCli} = await import("./cron-cli.js");
    const program = new Command();
    program.exitOverride();
    registerCronCli(program);
    await program.parseAsync(["cron", "edit", "job-1", "--message", "Updated message", "--best-effort-deliver"], { from: "user" });
    const updateCall = callGatewayFromCli.mock.calls.find((call) => (call[0] === "cron.update"));
    const patch = updateCall?.[2];
    expect(patch?.patch?.payload?.message).toBe("Updated message");
    expect(patch?.patch?.payload?.bestEffortDeliver).toBe(true);
  });
  it("includes no-best-effort delivery when provided with message", async () => {
    callGatewayFromCli.mockClear();
    const {registerCronCli} = await import("./cron-cli.js");
    const program = new Command();
    program.exitOverride();
    registerCronCli(program);
    await program.parseAsync(["cron", "edit", "job-1", "--message", "Updated message", "--no-best-effort-deliver"], { from: "user" });
    const updateCall = callGatewayFromCli.mock.calls.find((call) => (call[0] === "cron.update"));
    const patch = updateCall?.[2];
    expect(patch?.patch?.payload?.message).toBe("Updated message");
    expect(patch?.patch?.payload?.bestEffortDeliver).toBe(false);
  });
});
