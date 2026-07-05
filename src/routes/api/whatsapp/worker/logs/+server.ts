import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { isAdminOrPic } from "$lib/server/auth/guard.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.resolve(__dirname, "../../../../../../worker/logs");

export const GET: RequestHandler = async (event) => {
  const guard = isAdminOrPic(event);
  if (guard) return guard;

  const linesParam = parseInt(event.url.searchParams.get("lines") || "50");
  const lines = Math.min(Math.max(linesParam, 10), 500);
  const dateParam = event.url.searchParams.get("date");

  const today = new Date().toISOString().slice(0, 10);
  const date = dateParam || today;
  const logPath = path.join(LOG_DIR, `${date}.log`);

  if (!fs.existsSync(logPath)) {
    return json({ data: { lines: [], date, totalLines: 0 } });
  }

  const content = fs.readFileSync(logPath, "utf-8");
  const allLines = content.split("\n").filter(Boolean);
  const tail = allLines.slice(-lines);

  return json({
    data: {
      lines: tail,
      date,
      totalLines: allLines.length,
      truncated: allLines.length > lines,
    },
  });
};
