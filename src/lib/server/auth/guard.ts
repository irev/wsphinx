import type { RequestEvent } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";

export function requireRole(event: RequestEvent, roles: string[]): Response | null {
  const user = event.locals.user;
  if (!user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!roles.includes(user.role)) {
    return json({ error: "Forbidden: insufficient role" }, { status: 403 });
  }
  return null;
}

export function isAdmin(event: RequestEvent): Response | null {
  return requireRole(event, ["admin"]);
}

export function isAdminOrPic(event: RequestEvent): Response | null {
  return requireRole(event, ["admin", "pic"]);
}
