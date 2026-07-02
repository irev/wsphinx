import type { ClassificationResult } from "../../types/index.js";
import { ruleBasedClassify } from "./rules.js";
import { ollamaClassify } from "./ollama.js";

interface ClassifyInput {
  body: string;
  fromName: string;
  previousMessages: string[];
}

const CONFIDENCE_THRESHOLD = 0.7;

export async function classifyMessage(input: ClassifyInput): Promise<ClassificationResult> {
  const ruleResult = ruleBasedClassify(input);

  if (ruleResult && ruleResult.confidence >= CONFIDENCE_THRESHOLD) {
    return ruleResult;
  }

  try {
    const ollamaResult = await ollamaClassify(input);
    if (ollamaResult) {
      ollamaResult.uncertainty = ollamaResult.uncertainty || [];
      ollamaResult.uncertainty.push(
        `Hasil dari LLM (confidence: ${(ollamaResult.confidence * 100).toFixed(0)}%)`
      );
      return ollamaResult;
    }
  } catch {
    // Ollama unavailable, fall through
  }

  if (ruleResult) {
    return {
      ...ruleResult,
      uncertainty: [
        ...(ruleResult.uncertainty || []),
        "Rule-based result (low confidence) — Ollama unavailable",
      ],
    };
  }

  return {
    is_support_related: false,
    message_type: "noise",
    summary: "Tidak dapat diklasifikasikan",
    category: "Lainnya",
    priority: "Low",
    confidence: 0.1,
    evidence: [],
    uncertainty: ["Gagal klasifikasi dengan rules dan LLM"],
  };
}
