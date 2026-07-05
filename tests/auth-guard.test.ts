import { describe, it, expect } from "vitest";
import { isAdmin, isAdminOrPic, requireRole } from "../src/lib/server/auth/guard.js";
import { mockAdminEvent, mockPicEvent, mockUserEvent, mockUnauthenticatedEvent } from "./helpers.js";

describe("requireRole", () => {
  it("returns null when user has matching role", () => {
    const result = requireRole(mockAdminEvent(), ["admin"]);
    expect(result).toBeNull();
  });

  it("returns 403 when user role does not match", () => {
    const result = requireRole(mockPicEvent(), ["admin"]);
    expect(result?.status).toBe(403);
  });

  it("returns 401 when no user", () => {
    const result = requireRole(mockUnauthenticatedEvent(), ["admin"]);
    expect(result?.status).toBe(401);
  });
});

describe("isAdmin", () => {
  it("returns null for admin", () => {
    expect(isAdmin(mockAdminEvent())).toBeNull();
  });

  it("returns 403 for pic", () => {
    const result = isAdmin(mockPicEvent());
    expect(result?.status).toBe(403);
  });

  it("returns 403 for user", () => {
    const result = isAdmin(mockUserEvent());
    expect(result?.status).toBe(403);
  });

  it("returns 401 for unauthenticated", () => {
    const result = isAdmin(mockUnauthenticatedEvent());
    expect(result?.status).toBe(401);
  });
});

describe("isAdminOrPic", () => {
  it("returns null for admin", () => {
    expect(isAdminOrPic(mockAdminEvent())).toBeNull();
  });

  it("returns null for pic", () => {
    expect(isAdminOrPic(mockPicEvent())).toBeNull();
  });

  it("returns 403 for user", () => {
    const result = isAdminOrPic(mockUserEvent());
    expect(result?.status).toBe(403);
  });

  it("returns 401 for unauthenticated", () => {
    const result = isAdminOrPic(mockUnauthenticatedEvent());
    expect(result?.status).toBe(401);
  });
});
