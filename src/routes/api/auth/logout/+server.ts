import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { getDb } from "$lib/server/db/index.js";
import { COOKIE_NAME } from "$lib/server/auth/session.js";

export const POST: RequestHandler = async ({ locals, getClientAddress }) => {
  const db = getDb();
  const user = locals.user;
  let clientIp: string;
  try { clientIp = getClientAddress(); } catch { clientIp = "127.0.0.1"; }

  if (user) {
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "logout",
        entity: "user",
        entityId: user.id,
        ipAddress: clientIp,
      },
    });
  }

  return json(
    { ok: true },
    {
      headers: {
        "set-cookie": `${COOKIE_NAME}=; httpOnly; secure=${process.env.NODE_ENV === "production"}; sameSite=strict; path=/; maxAge=0`,
      },
    }
  );
};
