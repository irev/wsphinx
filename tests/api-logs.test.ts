import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockAdminEvent, mockPicEvent } from "./helpers.js";

const LOG_LINES = [
  "2026-07-05T10:00:00.000Z [INFO] Worker started",
  "2026-07-05T10:00:01.000Z [INFO] Client initialized",
  "2026-07-05T10:00:02.000Z [ERROR] Connection failed, retrying...",
  "2026-07-05T10:00:03.000Z [INFO] Reconnected successfully",
  "2026-07-05T10:00:04.000Z [WARN] High latency detected",
];

const LOG_CONTENT = LOG_LINES.join("\n") + "\n";

describe("GET /api/whatsapp/worker/logs", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns empty lines when no log file", async () => {
    vi.doMock("node:fs", () => ({
      existsSync: vi.fn(() => false),
      readFileSync: vi.fn(),
      default: { existsSync: vi.fn(() => false), readFileSync: vi.fn() },
    }));

    const { GET } = await import("../src/routes/api/whatsapp/worker/logs/+server.js");
    const res = await GET(mockAdminEvent() as any);
    const body = await res.json();

    expect(body.data.lines).toEqual([]);
    expect(body.data.totalLines).toBe(0);
  });

  it("returns last N lines from log file (clamped min 10)", async () => {
    const manyLines = Array.from({ length: 20 }, (_, i) => `Line ${i + 1}: some data`).join("\n") + "\n";

    vi.doMock("node:fs", () => ({
      existsSync: vi.fn(() => true),
      readFileSync: vi.fn(() => manyLines),
      default: { existsSync: vi.fn(() => true), readFileSync: vi.fn(() => manyLines) },
    }));

    const { GET } = await import("../src/routes/api/whatsapp/worker/logs/+server.js");

    const url = new URL("http://localhost:9393/api/whatsapp/worker/logs?lines=3");
    const res = await GET({ ...mockAdminEvent(), url } as any);
    const body = await res.json();

    // lines=3 gets clamped to min 10, so we get last 10 of 20
    expect(body.data.lines.length).toBe(10);
    expect(body.data.truncated).toBe(true);
  });

  it("returns all lines if fewer than requested", async () => {
    vi.doMock("node:fs", () => ({
      existsSync: vi.fn(() => true),
      readFileSync: vi.fn(() => LOG_CONTENT),
      default: { existsSync: vi.fn(() => true), readFileSync: vi.fn(() => LOG_CONTENT) },
    }));

    const { GET } = await import("../src/routes/api/whatsapp/worker/logs/+server.js");

    const url = new URL("http://localhost:9393/api/whatsapp/worker/logs?lines=100");
    const res = await GET({ ...mockAdminEvent(), url } as any);
    const body = await res.json();

    expect(body.data.lines.length).toBe(5);
    expect(body.data.totalLines).toBe(5);
  });

  it("clamps lines minimum to 10", async () => {
    vi.doMock("node:fs", () => ({
      existsSync: vi.fn(() => true),
      readFileSync: vi.fn(() => LOG_CONTENT),
      default: { existsSync: vi.fn(() => true), readFileSync: vi.fn(() => LOG_CONTENT) },
    }));

    const { GET } = await import("../src/routes/api/whatsapp/worker/logs/+server.js");

    const url = new URL("http://localhost:9393/api/whatsapp/worker/logs?lines=1");
    const res = await GET({ ...mockAdminEvent(), url } as any);
    const body = await res.json();

    // With 5 total lines and clamp to 10 minimum, we get all 5
    expect(body.data.lines.length).toBe(5);
  });

  it("truncated flag is true when totalLines > lines", async () => {
    const manyLines = Array.from({ length: 20 }, (_, i) => `Line ${i + 1}`).join("\n") + "\n";

    vi.doMock("node:fs", () => ({
      existsSync: vi.fn(() => true),
      readFileSync: vi.fn(() => manyLines),
      default: { existsSync: vi.fn(() => true), readFileSync: vi.fn(() => manyLines) },
    }));

    const { GET } = await import("../src/routes/api/whatsapp/worker/logs/+server.js");

    const url = new URL("http://localhost:9393/api/whatsapp/worker/logs?lines=10");
    const res = await GET({ ...mockAdminEvent(), url } as any);
    const body = await res.json();

    expect(body.data.truncated).toBe(true);
    expect(body.data.lines.length).toBe(10);
  });

  it("returns 403 for non-admin user", async () => {
    const { GET } = await import("../src/routes/api/whatsapp/worker/logs/+server.js");

    const res = await GET(mockPicEvent() as any);
    expect(res.status).toBe(403);
  });
});
