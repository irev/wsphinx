import { error } from "@sveltejs/kit";
import fs from "node:fs";
import path from "node:path";

const MEDIA_DIR = path.resolve("media");

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".oga": "audio/ogg",
  ".mp3": "audio/mpeg",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain",
  ".zip": "application/zip",
  ".rar": "application/x-rar-compressed",
  ".bin": "application/octet-stream",
};

export const GET = async ({ params }) => {
  const mediaPath = params.path;
  if (!mediaPath) error(400, "Path is required");

  const resolved = path.resolve(MEDIA_DIR, mediaPath);
  if (!resolved.startsWith(MEDIA_DIR)) {
    error(403, "Forbidden");
  }

  if (!fs.existsSync(resolved)) {
    error(404, "File not found");
  }

  const ext = path.extname(resolved).toLowerCase();
  const contentType = MIME_MAP[ext] || "application/octet-stream";

  const file = fs.readFileSync(resolved);
  return new Response(file, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=86400",
    },
  });
};
