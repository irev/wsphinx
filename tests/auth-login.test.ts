import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb, resetDb } from "../src/lib/server/db/index.js";
import { signToken } from "../src/lib/server/auth/session.js";

describe("Auth Login Flow (integration)", () => {
  let adminPhone: string;
  let adminPassword: string;

  beforeAll(async () => {
    adminPhone = "6281111111113";
    adminPassword = "admin123";
  });

  afterAll(() => {
  });

  it("POST /api/auth/login returns 200 + cookie for valid credentials", async () => {
    const { POST } = await import("../src/routes/api/auth/login/+server.js");
    const req = new Request("http://localhost:9393/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: adminPhone, password: adminPassword }),
    });
    const event = {
      request: req,
      getClientAddress: () => "127.0.0.1",
    } as any;

    const res = await POST(event);
    const resBody = await res.clone().json();
    if (res.status !== 200) {
      console.log("Login error:", JSON.stringify(resBody));
      // Debug: check user exists
      const db = getDb();
      const user = await db.user.findUnique({ where: { phone: adminPhone } });
      console.log("User lookup result:", user ? { name: user.name, role: user.role, hasHash: !!user.passwordHash, active: user.active } : "null");
    }
    expect(res.status).toBe(200);

    const body = resBody;
    expect(body.data).toBeDefined();
    expect(body.data.name).toBe("Admin System");
    expect(body.data.role).toBe("admin");

    const setCookie = res.headers.get("set-cookie") || "";
    expect(setCookie).toContain("session=");
    expect(setCookie).toContain("httpOnly");
    expect(setCookie).toContain("path=/");
  });

  it("POST /api/auth/login returns 401 for wrong password", async () => {
    const { POST } = await import("../src/routes/api/auth/login/+server.js");
    const req = new Request("http://localhost:9393/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: adminPhone, password: "wrongpassword" }),
    });
    const event = { request: req, getClientAddress: () => "127.0.0.1" } as any;

    const res = await POST(event);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toMatch(/salah/i);
  });

  it("POST /api/auth/login returns 400 for missing fields", async () => {
    const { POST } = await import("../src/routes/api/auth/login/+server.js");
    const req = new Request("http://localhost:9393/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const event = { request: req, getClientAddress: () => "127.0.0.1" } as any;

    const res = await POST(event);
    expect(res.status).toBe(400);
  });

  it("POST /api/auth/login returns 401 for unknown phone", async () => {
    const { POST } = await import("../src/routes/api/auth/login/+server.js");
    const req = new Request("http://localhost:9393/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "6289999999999", password: adminPassword }),
    });
    const event = { request: req, getClientAddress: () => "127.0.0.1" } as any;

    const res = await POST(event);
    expect(res.status).toBe(401);
  });

  it("POST /api/auth/logout returns 200 + cleared cookie", async () => {
    const db = getDb();
    const adminUser = await db.user.findFirst({ where: { phone: adminPhone } });
    expect(adminUser).toBeTruthy();

    const { POST } = await import("../src/routes/api/auth/logout/+server.js");
    const event = {
      locals: { user: { id: adminUser!.id, userId: adminUser!.id, role: adminUser!.role, name: adminUser!.name } },
      getClientAddress: () => "127.0.0.1",
    } as any;

    const res = await POST(event);
    expect(res.status).toBe(200);

    const setCookie = res.headers.get("set-cookie") || "";
    expect(setCookie).toContain("session=;");
    expect(setCookie).toContain("maxAge=0");
  });

  it("GET /api/auth/me returns user when authenticated", async () => {
    const token = signToken({ userId: "admin-id", role: "admin", name: "Admin" });
    const { GET } = await import("../src/routes/api/auth/me/+server.js");
    const event = {
      locals: { user: { userId: "admin-id", role: "admin", name: "Admin" } },
      url: new URL("http://localhost:9393/api/auth/me"),
      cookies: { get: () => token },
    } as any;

    const res = await GET(event);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.role).toBe("admin");
    expect(body.data.name).toBe("Admin");
  });

  it("GET /api/auth/me returns 401 when not authenticated", async () => {
    const { GET } = await import("../src/routes/api/auth/me/+server.js");
    const event = {
      locals: {},
      url: new URL("http://localhost:9393/api/auth/me"),
    } as any;

    const res = await GET(event);
    expect(res.status).toBe(401);
  });
});
