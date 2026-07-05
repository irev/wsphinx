import type { Handle } from "@sveltejs/kit";
import { redirect, json } from "@sveltejs/kit";
import { verifyToken, COOKIE_NAME } from "$lib/server/auth/session.js";
import { getDb } from "$lib/server/db/index.js";
import { sequence } from "@sveltejs/kit/hooks";
import { maskPhone } from "$lib/utils/mask.js";
import { sanitize } from "$lib/utils/sanitize.js";

const publicPaths = ["/api/auth/login", "/login", "/_app", "/media"];

function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  const cookies: Record<string, string> = {};
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq > 0) {
      const key = part.slice(0, eq).trim();
      const val = part.slice(eq + 1).trim();
      cookies[key] = val;
    }
  }
  return cookies;
}

function isPublic(pathname: string): boolean {
  return publicPaths.some((p) => pathname === p || pathname.startsWith(p));
}

const authHandle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url;

  async function fromToken(token: string): Promise<boolean> {
    const payload = verifyToken(token);
    if (!payload) return false;
    const db = getDb();
    const user = await db.user.findUnique({ where: { id: payload.userId }, select: { id: true, role: true, name: true, active: true } });
    if (!user || !user.active) return false;
    event.locals.user = { id: user.id, role: user.role, name: user.name, phone: "" };
    return true;
  }

  if (pathname.startsWith("/api/") && !isPublic(pathname)) {
    const cookies = parseCookies(event.request.headers.get("cookie") || "");
    const token = cookies[COOKIE_NAME];
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    if (!(await fromToken(token))) {
      return new Response(JSON.stringify({ error: "Session expired" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
  }

  if (!isPublic(pathname) && !pathname.startsWith("/api/") && !pathname.startsWith("/_app") && !pathname.startsWith("/media")) {
    const cookies = parseCookies(event.request.headers.get("cookie") || "");
    const token = cookies[COOKIE_NAME];
    if (!token) {
      redirect(302, "/login");
    }
    if (!(await fromToken(token))) {
      redirect(302, "/login");
    }
  }

  return resolve(event);
};

const securityHandle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  response.headers.set("x-frame-options", "DENY");
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("cross-origin-opener-policy", "same-origin");
  response.headers.set("cross-origin-resource-policy", "same-origin");
  response.headers.set("x-permitted-cross-domain-policies", "none");

  const csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'";
  response.headers.set("content-security-policy", csp);

  if (process.env.NODE_ENV === "production") {
    response.headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  }

  return response;
};

const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 100;
const ipHits = new Map<string, { count: number; resetAt: number }>();

const rateLimitHandle: Handle = async ({ event, resolve }) => {
  let ip: string;
  try { ip = event.getClientAddress(); } catch { ip = "127.0.0.1"; }
  const now = Date.now();
  let entry = ipHits.get(ip);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
    ipHits.set(ip, entry);
  }

  entry.count++;

  if (entry.count > RATE_LIMIT_MAX) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { "content-type": "application/json", "retry-after": String(Math.ceil((entry.resetAt - now) / 1000)) },
    });
  }

  return resolve(event);
};

function maskPhoneFields(obj: unknown): unknown {
  if (typeof obj === "string") {
    if (/^\+?62\d{6,15}$/.test(obj) || /^08\d{6,14}$/.test(obj)) {
      return maskPhone(obj);
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(maskPhoneFields);
  }
  if (obj && typeof obj === "object") {
    const masked: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      if (["phone", "fromPhone", "reporterPhone", "pushname"].includes(key) && typeof val === "string") {
        masked[key] = maskPhone(val);
      } else {
        masked[key] = maskPhoneFields(val);
      }
    }
    return masked;
  }
  return obj;
}

const maskHandle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  if (!event.url.pathname.startsWith("/api/")) return response;
  if (!response.body) return response;

  const ct = response.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return response;

  try {
    const text = await response.text();
    const parsed = JSON.parse(text);
    const masked = maskPhoneFields(parsed);
    return json(masked, { status: response.status, headers: Object.fromEntries(response.headers) });
  } catch {
    return response;
  }
};

const sanitizeHandle: Handle = async ({ event, resolve }) => {
  if (!event.url.pathname.startsWith("/api/")) return resolve(event);
  const method = event.request.method;
  if (!["POST", "PUT", "PATCH"].includes(method)) return resolve(event);
  const ct = event.request.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return resolve(event);

  try {
    const cloned = event.request.clone();
    const text = await cloned.text();
    if (!text) return resolve(event);
    const parsed = JSON.parse(text);
    const cleaned = sanitize(parsed);
    const newBody = JSON.stringify(cleaned);
    const newRequest = new Request(event.request.url, {
      method: event.request.method,
      headers: event.request.headers,
      body: newBody,
    });
    event.request = newRequest;
  } catch {}

  return resolve(event);
};

export const handle = sequence(rateLimitHandle, sanitizeHandle, securityHandle, maskHandle, authHandle);
