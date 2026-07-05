import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:child_process", () => {
  const EventEmitter = require("node:events");
  const p = new EventEmitter();
  p.pid = 999;
  p.killed = false;
  p.stdout = new EventEmitter();
  p.stderr = new EventEmitter();
  p.kill = vi.fn();
  return { spawn: vi.fn(() => p) };
});

vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
  appendFileSync: vi.fn(),
  default: {
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    appendFileSync: vi.fn(),
  },
}));

vi.mock("../src/lib/server/db/index.js", () => ({
  getDb: vi.fn(() => ({
    appSetting: {
      findUnique: vi.fn().mockResolvedValue({ key: "wa_worker_auto_restart", value: "true" }),
    },
  })),
}));

describe("WorkerManager Latency", () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it("recordLatency stores a point in history", async () => {
    const { workerManager } = await import("../src/lib/server/worker-manager.js");
    workerManager.recordLatency({ latency: 100, status: "connected" });
    const history = workerManager.getLatencyHistory();
    expect(history.length).toBe(1);
    expect(history[0].latency).toBe(100);
    expect(history[0].status).toBe("connected");
    expect(typeof history[0].ts).toBe("number");
  });

  it("getLatencyHistory returns multiple points", async () => {
    const { workerManager } = await import("../src/lib/server/worker-manager.js");
    workerManager.recordLatency({ latency: 50, status: "connected" });
    workerManager.recordLatency({ latency: 200, status: "connected" });
    workerManager.recordLatency({ latency: 0, status: "unreachable" });

    const history = workerManager.getLatencyHistory();
    expect(history.length).toBe(3);
  });

  it("trims history older than 25 hours", async () => {
    const { workerManager } = await import("../src/lib/server/worker-manager.js");

    workerManager.recordLatency({ latency: 100, status: "connected" });

    const history = workerManager.getLatencyHistory();
    expect(history.length).toBe(1);

    const cutoff = Date.now() - 25 * 60 * 60 * 1000;
    for (const point of history) {
      expect(point.ts).toBeGreaterThan(cutoff);
    }
  });

  it("handles empty history", async () => {
    const { workerManager } = await import("../src/lib/server/worker-manager.js");
    const history = workerManager.getLatencyHistory();
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBe(0);
  });
});
