import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import bcrypt from "bcryptjs";
import { getDb } from "$lib/server/db/index.js";
import { signToken, cookieOptions, COOKIE_NAME } from "$lib/server/auth/session.js";

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  const db = getDb();
  const body = await request.json();
  const { phone, password } = body;
  let clientIp: string;
  try { clientIp = getClientAddress(); } catch { clientIp = "127.0.0.1"; }

  if (!phone || !password) {
    return json({ error: "Phone dan password harus diisi" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { phone } });
  if (!user || !user.active) {
    await db.auditLog.create({
      data: {
        action: "login.failed",
        entity: "user",
        detail: JSON.stringify({ phone, reason: "not_found" }),
        ipAddress: clientIp,
      },
    });
    return json({ error: "Nomor atau password salah" }, { status: 401 });
  }

  if (!user.passwordHash) {
    return json({ error: "User ini belum memiliki password. Hubungi admin." }, { status: 403 });
  }

  const valid = bcrypt.compareSync(password, user.passwordHash);
  if (!valid) {
    await db.auditLog.create({
      data: {
        action: "login.failed",
        entity: "user",
        entityId: user.id,
        detail: JSON.stringify({ phone, reason: "wrong_password" }),
        ipAddress: clientIp,
      },
    });
    return json({ error: "Nomor atau password salah" }, { status: 401 });
  }

  const token = signToken({ userId: user.id, role: user.role, name: user.name });

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "login.success",
      entity: "user",
      entityId: user.id,
      ipAddress: clientIp,
    },
  });

  const reqUrl = new URL(request.url);
  const secureOverride = request.headers.get("x-forwarded-proto") === "https" || reqUrl.protocol === "https:";

  return json(
    { data: { id: user.id, name: user.name, role: user.role, phone: user.phone } },
    {
      status: 200,
      headers: {
        "set-cookie": `${COOKIE_NAME}=${token}; ${Object.entries(cookieOptions(secureOverride))
          .map(([k, v]) => `${k}=${v}`)
          .join("; ")}`,
      },
    }
  );
};
