import type { ClassificationResult, MessageType } from "../../types/index.js";

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Aplikasi error": ["error", "bug", "crash", "hang", "freeze", "not responding", "tidak bisa buka", "gagal"],
  "Login/akses": ["login", "log in", "password", "lupa password", "tidak bisa login", "forgot password", "akun", "blocked", "locked"],
  "Jaringan": ["jaringan", "network", "koneksi", "connection", "internet", "offline", "timeout", "putus"],
  "Server": ["server", "down", "mati", "restart", "reboot", "maintenance", "500", "502", "503"],
  "Database": ["database", "db", "data hilang", "corrupt", "query", "select", "insert"],
  "Integrasi API": ["api", "integration", "webhook", "callback", "endpoint", "third party"],
  "Printer/perangkat": ["printer", "print", "scan", "device", "perangkat", "usb", "driver"],
  "Request data": ["data", "report", "laporan", "export", "download", "minta data"],
  "Request perubahan fitur": ["fitur", "feature", "tambah", "ubah", "modify", "enhancement", "wishlist", "request"],
};

const PRIORITY_KEYWORDS: Record<string, string[]> = {
  Critical: ["down total", "berhenti", "tidak bisa kerja", "all user", "semua", "critical", "darurat"],
  High: ["banyak", "beberapa", "urgent", "segera", "penting", "gangguan"],
  Medium: ["lambat", "slow", "error", "tidak bisa", "gagal", "bermasalah"],
  Low: ["info", "tanya", "question", "mohon info", "kapan"],
};

const NOISE_PATTERNS = [
  /^(selamat|pagi|siang|sore|malam)\b/i,
  /^(makasih|terima kasih|thanks|ok|oke|siap|noted)/i,
  /^assalamu|^waalaikum/i,
  /^(test|tes|coba|testing)/i,
  /^(done|selesai|beres)/i,
];

interface ClassifyInput {
  body: string;
  fromName: string;
  previousMessages: string[];
}

export function ruleBasedClassify(input: ClassifyInput): ClassificationResult | null {
  const text = input.body.trim();

  if (!text || text.length < 5) {
    return {
      is_support_related: false,
      message_type: "noise",
      summary: "",
      category: "Lainnya",
      priority: "Low",
      confidence: 0.6,
      evidence: ["Pesan terlalu pendek atau kosong"],
      uncertainty: ["Pesan pendek bisa jadi relevan dalam konteks tertentu"],
    };
  }

  for (const pattern of NOISE_PATTERNS) {
    if (pattern.test(text)) {
      return {
        is_support_related: false,
        message_type: "noise",
        summary: "Pesan umum/sapaan tidak terkait support",
        category: "Lainnya",
        priority: "Low",
        confidence: 0.7,
        evidence: ["Pesan cocok dengan pola percakapan umum"],
        uncertainty: [],
      };
    }
  }

  let category = "Lainnya";
  let categoryScore = 0;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter((kw) => text.toLowerCase().includes(kw.toLowerCase())).length;
    if (score > categoryScore) {
      categoryScore = score;
      category = cat;
    }
  }

  let priority = "Low";
  let priorityScore = 0;
  for (const [pri, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
    const score = keywords.filter((kw) => text.toLowerCase().includes(kw.toLowerCase())).length;
    if (score > priorityScore) {
      priorityScore = score;
      priority = pri;
    }
  }

  let messageType: MessageType;
  let summary: string;

  if (categoryScore === 0 && priorityScore === 0) {
    return {
      is_support_related: false,
      message_type: "general_chat",
      summary: "",
      category: "Lainnya",
      priority: "Low",
      confidence: 0.5,
      evidence: ["Tidak ada kata kunci support yang terdeteksi"],
      uncertainty: ["Mungkin relevan dalam konteks percakapan yang lebih luas"],
    };
  }

  const hasQuestion = text.includes("?") || text.includes("bagaimana") || text.includes("gimana") || text.includes("apakah");
  const hasReport = text.includes("error") || text.includes("tidak bisa") || text.includes("gagal") || text.includes("bermasalah");
  const hasConfirmation = text.includes("sudah") || text.includes("beres") || text.includes("selesai") || text.includes("done");

  if (hasReport) messageType = "new_issue";
  else if (hasConfirmation) messageType = "confirmation";
  else if (hasQuestion) messageType = "info_request";
  else messageType = "update";

  summary = text.length > 100 ? text.substring(0, 100) + "..." : text;

  const evidence: string[] = [];
  if (categoryScore > 0) evidence.push(`Kata kunci kategori "${category}" terdeteksi`);
  if (priorityScore > 0) evidence.push(`Kata kunci prioritas "${priority}" terdeteksi`);

  const confidence = Math.min(0.5 + categoryScore * 0.1 + priorityScore * 0.05, 0.95);
  // Threshold 0.7 now requires ~2 category + 2 priority keywords, or 3+ category-only

  return {
    is_support_related: true,
    message_type: messageType,
    summary,
    category,
    priority,
    confidence,
    evidence,
    uncertainty: confidence < 0.7 ? ["Confidence rendah, perlu validasi manual"] : [],
  };
}
