import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import QRCode from "qrcode";

const WORKER_URL = process.env.WORKER_API_URL || "http://127.0.0.1:3457";

export const GET: RequestHandler = async () => {
  try {
    const res = await fetch(`${WORKER_URL}/api/status`);
    if (!res.ok) {
      return json({ qrImage: null });
    }
    const result = await res.json();
    const qrCode = result.data?.qrCode;
    if (!qrCode) {
      return json({ qrImage: null });
    }
    const qrImage = await QRCode.toDataURL(qrCode, {
      type: "image/png",
      width: 300,
      margin: 2,
      color: { dark: "#111827", light: "#ffffff" },
    });
    return json({ qrImage });
  } catch {
    return json({ qrImage: null });
  }
};
