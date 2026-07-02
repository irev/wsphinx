import { describe, it, expect, beforeAll } from "vitest";

let ollamaIsUp = false;
let availableModel = "";

beforeAll(async () => {
  try {
    const res = await fetch("http://localhost:11434/api/tags");
    if (!res.ok) return;
    const { models } = await res.json();
    ollamaIsUp = true;
    const pick =
      models.find(
        (m: { name: string }) =>
          m.name.startsWith("qwen2.5-coder:7b") || m.name.startsWith("gemma4:e4b"),
      )?.name || models[0]?.name;
    if (pick) availableModel = pick;
  } catch {
    /* skip */
  }
});

describe("Ollama direct call", () => {
  it("returns null when model not found", async () => {
    process.env.OLLAMA_MODEL = "nonexistent-model-xyz";
    process.env.OLLAMA_URL = "http://localhost:11434";
    const { ollamaClassify } = await import("../src/lib/server/classifier/ollama.js");

    const r = await ollamaClassify({
      body: "test",
      fromName: "User",
      previousMessages: [],
    });
    expect(r).toBeNull();
  }, 60000);

  it("classifies an error message with a real model", async () => {
    if (!ollamaIsUp) return;
    process.env.OLLAMA_MODEL = availableModel;
    process.env.OLLAMA_URL = "http://localhost:11434";
    const { ollamaClassify } = await import("../src/lib/server/classifier/ollama.js");

    const r = await ollamaClassify({
      body: "Aplikasi saya error terus tiap mau login, muncul pesan 'database connection failed'",
      fromName: "Budi",
      previousMessages: [],
    });

    expect(r).not.toBeNull();
    expect(typeof r?.is_support_related).toBe("boolean");
    expect([
      "new_issue", "update", "confirmation", "info_request",
      "escalation", "noise", "general_chat",
    ]).toContain(r?.message_type);
    expect([
      "Aplikasi error", "Login/akses", "Jaringan", "Server", "Database",
      "Integrasi API", "Printer/perangkat", "Request data",
      "Request perubahan fitur", "Lainnya",
    ]).toContain(r?.category);
    expect(["Critical", "High", "Medium", "Low"]).toContain(r?.priority);
    expect(r?.confidence).toBeGreaterThanOrEqual(0);
    expect(r?.confidence).toBeLessThanOrEqual(1);
    expect(Array.isArray(r?.evidence)).toBe(true);
  }, 120000);

  it("classifies a greeting as not support-related", async () => {
    if (!ollamaIsUp) return;
    process.env.OLLAMA_MODEL = availableModel;
    process.env.OLLAMA_URL = "http://localhost:11434";
    const { ollamaClassify } = await import("../src/lib/server/classifier/ollama.js");

    const r = await ollamaClassify({
      body: "selamat pagi, udah makan?",
      fromName: "Budi",
      previousMessages: [],
    });

    expect(r).not.toBeNull();
    expect(r?.is_support_related).toBe(false);
  }, 120000);
});

describe("Hybrid dispatch", () => {
  it("returns rule-based for high-confidence input (no Ollama needed)", async () => {
    process.env.OLLAMA_URL = "http://localhost:11434";
    process.env.OLLAMA_MODEL = availableModel || "qwen2.5-coder:7b";
    const { classifyMessage } = await import("../src/lib/server/classifier/index.js");

    const r = await classifyMessage({
      body: "Server down! Semua tidak bisa akses",
      fromName: "Budi",
      previousMessages: [],
    });
    expect(r.is_support_related).toBe(true);
    expect(r.category).toBe("Server");
    expect(r.priority).toBe("Critical");
    expect(r.confidence).toBeGreaterThanOrEqual(0.7);
    // No LLM uncertainty marker when rules suffice
    expect(r.uncertainty?.some((u) => u.includes("LLM"))).toBeFalsy();
  });

  it("falls back to Ollama when rule confidence < 0.7", async () => {
    if (!ollamaIsUp) return;
    process.env.OLLAMA_MODEL = availableModel;
    process.env.OLLAMA_URL = "http://localhost:11434";
    const { classifyMessage } = await import("../src/lib/server/classifier/index.js");

    const r = await classifyMessage({
      body: "Tanya dong, kok lambda function saya return-nya null terus ya.",
      fromName: "PIC Satu",
      previousMessages: [],
    });

    expect(r.is_support_related).toBe(true);
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.uncertainty?.some((u) => u.includes("LLM"))).toBe(true);
  }, 120000);

  it("returns low-confidence rule fallback when Ollama is down", async () => {
    process.env.OLLAMA_URL = "http://localhost:99999";
    const { classifyMessage } = await import("../src/lib/server/classifier/index.js");

    const r = await classifyMessage({
      body: "Bagaimana cara login?",
      fromName: "Budi",
      previousMessages: [],
    });

    expect(r.confidence).toBeLessThan(0.7);
    expect(r.uncertainty?.some((u) => u.includes("Ollama unavailable"))).toBe(true);
  });
});
