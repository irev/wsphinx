import type { ClassificationResult } from "../../types/index.js";
import { getDb } from "../db/index.js";

interface ClassifyInput {
  body: string;
  fromName: string;
  previousMessages: string[];
}

function ollamaUrl(): string {
  return process.env.OLLAMA_URL || "http://localhost:11434";
}

function ollamaModel(): string {
  return process.env.OLLAMA_MODEL || "llama3.2";
}

function maskPhone(text: string): string {
  return text.replace(/\b(\d{5,})\b/g, (m) => {
    if (m.length <= 4) return m;
    const visible = m.slice(-4);
    return "*".repeat(m.length - 4) + visible;
  });
}

async function checkConsent(): Promise<boolean> {
  try {
    const db = getDb();
    const setting = await db.appSetting.findUnique({ where: { key: "wa_llm_consent" } });
    return setting?.value !== "false";
  } catch {
    return true;
  }
}

export async function ollamaClassify(input: ClassifyInput): Promise<ClassificationResult | null> {
  const consent = await checkConsent();
  if (!consent) return null;

  const url = ollamaUrl();
  const model = ollamaModel();
  const systemPrompt = `Anda adalah assistant yang mengklasifikasikan pesan WhatsApp technical support.
Klasifikasikan pesan berikut dan berikan output JSON dengan format:
{
  "is_support_related": boolean,
  "message_type": "new_issue" | "update" | "confirmation" | "info_request" | "escalation" | "noise" | "general_chat",
  "summary": "ringkasan singkat",
  "category": "Aplikasi error" | "Login/akses" | "Jaringan" | "Server" | "Database" | "Integrasi API" | "Printer/perangkat" | "Request data" | "Request perubahan fitur" | "Lainnya",
  "priority": "Critical" | "High" | "Medium" | "Low",
  "confidence": 0.0-1.0,
  "evidence": ["alasan 1", "alasan 2"],
  "uncertainty": ["ketidakpastian 1"]
}`;

  const truncate = (s: string, max: number) => s.length > max ? s.slice(0, max) + "..." : s;

  const maskedFromName = maskPhone(input.fromName);
  const maskedBody = maskPhone(truncate(input.body, 2000));
  const maskedPrevious = input.previousMessages.slice(-5).map((m, i) =>
    `Pesan sebelumnya ${i + 1}: ${maskPhone(truncate(m, 500))}`
  );

  const messages = [
    { role: "system", content: systemPrompt },
    ...maskedPrevious.map((content, i) => ({
      role: "user" as const,
      content,
    })),
    { role: "user", content: `Pesan dari ${maskedFromName}: ${maskedBody}` },
  ];

  try {
    const res = await fetch(`${url}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        format: "json",
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    let content = data.message.content;

    if (content.includes("```")) {
      content = content.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "");
    }

    const braceStart = content.indexOf("{");
    const braceEnd = content.lastIndexOf("}");
    if (braceStart !== -1 && braceEnd > braceStart) {
      content = content.slice(braceStart, braceEnd + 1);
    }

    const parsed = JSON.parse(content) as ClassificationResult;
    return parsed;
  } catch {
    return null;
  }
}
