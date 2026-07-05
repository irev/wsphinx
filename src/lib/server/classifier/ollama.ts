import type { ClassificationResult } from "../../types/index.js";

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

export async function ollamaClassify(input: ClassifyInput): Promise<ClassificationResult | null> {
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

  const messages = [
    { role: "system", content: systemPrompt },
    ...input.previousMessages.slice(-5).map((m, i) => ({
      role: "user" as const,
      content: `Pesan sebelumnya ${i + 1}: ${truncate(m, 500)}`,
    })),
    { role: "user", content: `Pesan dari ${input.fromName}: ${truncate(input.body, 2000)}` },
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
