import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

export const GET: RequestHandler = async ({ locals }) => {
  const user = locals.user;
  if (!user) {
    return json({ error: "Not authenticated" }, { status: 401 });
  }
  return json({ data: user });
};
