import { describe, it, expect } from "vitest";
import { signToken, verifyToken, cookieOptions, COOKIE_NAME } from "../src/lib/server/auth/session.js";

describe("signToken / verifyToken", () => {
  const payload = { userId: "u1", role: "admin", name: "Admin" };

  it("signs and verifies a valid token", () => {
    const token = signToken(payload);
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);

    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.userId).toBe("u1");
    expect(decoded!.role).toBe("admin");
    expect(decoded!.name).toBe("Admin");
  });

  it("returns null for invalid token", () => {
    const decoded = verifyToken("invalid-token");
    expect(decoded).toBeNull();
  });

  it("returns null for tampered token", () => {
    const token = signToken(payload);
    const parts = token.split(".");
    const tampered = parts[0] + "." + parts[1] + ".invalidsignature";
    const decoded = verifyToken(tampered);
    expect(decoded).toBeNull();
  });

  it("accepts different roles", () => {
    const picToken = signToken({ userId: "u2", role: "pic", name: "PIC" });
    const pic = verifyToken(picToken);
    expect(pic?.role).toBe("pic");

    const userToken = signToken({ userId: "u3", role: "user", name: "User" });
    const usr = verifyToken(userToken);
    expect(usr?.role).toBe("user");
  });
});

describe("cookieOptions", () => {
  it("returns httpOnly cookie options", () => {
    const opts = cookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.path).toBe("/");
    expect(opts.maxAge).toBe(7 * 24 * 60 * 60);
    expect(opts.sameSite).toBe("strict");
  });

  it("sets secure based on NODE_ENV", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    expect(cookieOptions().secure).toBe(true);
    process.env.NODE_ENV = "development";
    expect(cookieOptions().secure).toBe(false);
    process.env.NODE_ENV = prev;
  });
});

describe("COOKIE_NAME", () => {
  it("is session", () => {
    expect(COOKIE_NAME).toBe("session");
  });
});
