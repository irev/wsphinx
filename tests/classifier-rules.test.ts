import { describe, it, expect } from "vitest";
import { ruleBasedClassify } from "../src/lib/server/classifier/rules.js";

describe("ruleBasedClassify", () => {
  it("returns noise for empty/very short messages", () => {
    const r = ruleBasedClassify({ body: "", fromName: "User", previousMessages: [] });
    expect(r?.is_support_related).toBe(false);
    expect(r?.message_type).toBe("noise");
  });

  it("returns noise for greetings and casual messages", () => {
    const r = ruleBasedClassify({ body: "selamat pagi", fromName: "User", previousMessages: [] });
    expect(r?.is_support_related).toBe(false);
    expect(r?.message_type).toBe("noise");
  });

  it("detects aplikasi error with high confidence", () => {
    const r = ruleBasedClassify({
      body: "Aplikasi error terus muncul, hang dan freeze pas login, tolong segera",
      fromName: "Budi",
      previousMessages: [],
    });
    expect(r?.is_support_related).toBe(true);
    expect(r?.category).toBe("Aplikasi error");
    expect(r?.message_type).toBe("new_issue");
    expect(r?.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it("detects critical priority keywords", () => {
    const r = ruleBasedClassify({
      body: "Server down total! Semua user tidak bisa kerja",
      fromName: "Budi",
      previousMessages: [],
    });
    expect(r?.is_support_related).toBe(true);
    expect(r?.priority).toBe("Critical");
    expect(r?.message_type).toBe("new_issue");
  });

  it("detects high priority for urgent issues", () => {
    const r = ruleBasedClassify({
      body: "Beberapa user tidak bisa login, urgent tolong segera",
      fromName: "Siti",
      previousMessages: [],
    });
    expect(r?.is_support_related).toBe(true);
    expect(r?.priority).toBe("High");
  });

  it("detects low priority for information requests", () => {
    const r = ruleBasedClassify({
      body: "Tanya jadwal maintenance kapan ya?",
      fromName: "User",
      previousMessages: [],
    });
    expect(r?.is_support_related).toBe(true);
    expect(r?.priority).toBe("Low");
    expect(r?.message_type).toBe("info_request");
  });

  it("detects printer/perangkat category", () => {
    const r = ruleBasedClassify({
      body: "Printer tidak mau scan, udah di restart masih error",
      fromName: "User",
      previousMessages: [],
    });
    expect(r?.is_support_related).toBe(true);
    expect(r?.category).toBe("Printer/perangkat");
  });

  it("detects confirmation messages", () => {
    const r = ruleBasedClassify({
      body: "Error sudah beres, terima kasih",
      fromName: "Budi",
      previousMessages: [],
    });
    expect(r?.is_support_related).toBe(true);
    expect(r?.message_type).toBe("confirmation");
    expect(r?.category).toBe("Aplikasi error");
  });

  it("returns general_chat for messages with no support keywords", () => {
    const r = ruleBasedClassify({
      body: "Besok meeting jam 10 ya",
      fromName: "User",
      previousMessages: [],
    });
    expect(r?.is_support_related).toBe(false);
    expect(r?.message_type).toBe("general_chat");
  });

  it("returns evidence array with matched keywords", () => {
    const r = ruleBasedClassify({
      body: "Database error, query select gagal",
      fromName: "User",
      previousMessages: [],
    });
    expect(r?.evidence?.length).toBeGreaterThan(0);
    expect(r?.category).toBe("Database");
  });

  it("returns uncertainty when confidence < 0.7", () => {
    const r = ruleBasedClassify({
      body: "Tanya dong",
      fromName: "User",
      previousMessages: [],
    });
    if (r?.is_support_related) {
      expect(r.uncertainty?.length).toBeGreaterThan(0);
    }
  });
});
