import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import fs from "node:fs";
import path from "node:path";

export const GET: RequestHandler = async () => {
  try {
    const qrPath = path.resolve(process.cwd(), ".qr-temp", "qr.png");
    if (fs.existsSync(qrPath)) {
      const buffer = fs.readFileSync(qrPath);
      const base64 = buffer.toString("base64");
      return json({ qrImage: `data:image/png;base64,${base64}` });
    }
    return json({ qrImage: null });
  } catch {
    return json({ qrImage: null });
  }
};
