import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockDb = {
  appSetting: {
    findUnique: vi.fn(),
  },
};

vi.mock("../src/lib/server/db/index.js", () => ({
  getDb: vi.fn(() => mockDb),
}));

describe("getWorkerUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module state between tests
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.WORKER_API_URL;
  });

  it("returns DB value when setting exists", async () => {
    mockDb.appSetting.findUnique.mockResolvedValue({ key: "wa_worker_url", value: "http://localhost:3457" });

    const { getWorkerUrl, getWorkerUrlSync } = await import("../src/lib/server/whatsapp/worker-url.js");

    const url = await getWorkerUrl();
    expect(url).toBe("http://localhost:3457");
    expect(mockDb.appSetting.findUnique).toHaveBeenCalledWith({ where: { key: "wa_worker_url" } });
  });

  it("falls back to env when DB has no setting", async () => {
    mockDb.appSetting.findUnique.mockResolvedValue(null);
    process.env.WORKER_API_URL = "http://env-url:3457";

    const { getWorkerUrl } = await import("../src/lib/server/whatsapp/worker-url.js");

    const url = await getWorkerUrl();
    expect(url).toBe("http://env-url:3457");
  });

  it("falls back to default when DB and env are empty", async () => {
    mockDb.appSetting.findUnique.mockResolvedValue(null);

    const { getWorkerUrl } = await import("../src/lib/server/whatsapp/worker-url.js");

    const url = await getWorkerUrl();
    expect(url).toBe("http://127.0.0.1:9494");
  });

  it("caches URL within TTL", async () => {
    mockDb.appSetting.findUnique.mockResolvedValue({ key: "wa_worker_url", value: "http://cached:3457" });

    const { getWorkerUrl } = await import("../src/lib/server/whatsapp/worker-url.js");

    await getWorkerUrl();
    await getWorkerUrl();
    await getWorkerUrl();

    // Should only have called DB once
    expect(mockDb.appSetting.findUnique).toHaveBeenCalledTimes(1);
  });

  it("falls back on DB error", async () => {
    mockDb.appSetting.findUnique.mockRejectedValue(new Error("DB error"));
    process.env.WORKER_API_URL = "http://fallback:3457";

    const { getWorkerUrl } = await import("../src/lib/server/whatsapp/worker-url.js");

    const url = await getWorkerUrl();
    expect(url).toBe("http://fallback:3457");
  });

  it("getWorkerUrlSync returns env or default before any async fetch", async () => {
    process.env.WORKER_API_URL = "http://sync:3457";

    const { getWorkerUrlSync } = await import("../src/lib/server/whatsapp/worker-url.js");

    expect(getWorkerUrlSync()).toBe("http://sync:3457");
  });
});
