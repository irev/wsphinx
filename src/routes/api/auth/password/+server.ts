import { json, type RequestHandler } from "@sveltejs/kit";
import bcrypt from "bcryptjs";
import { getDb } from "$lib/server/db/index.js";

export const PUT: RequestHandler = async (event) => {
  const user = event.locals.user;
  if (!user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const { oldPassword, newPassword } = await event.request.json();

  if (!oldPassword || !newPassword) {
    return json({ error: "Password lama dan baru harus diisi" }, { status: 400 });
  }
  if (newPassword.length < 4 || newPassword.length > 100) {
    return json({ error: "Password baru minimal 4 karakter" }, { status: 400 });
  }

  const db = getDb();
  const record = await db.user.findUnique({ where: { id: user.id } });
  if (!record) {
    return json({ error: "User tidak ditemukan" }, { status: 404 });
  }
  if (!record.passwordHash) {
    return json({ error: "User ini belum memiliki password. Hubungi admin." }, { status: 403 });
  }
  if (!bcrypt.compareSync(oldPassword, record.passwordHash)) {
    return json({ error: "Password lama salah" }, { status: 400 });
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: bcrypt.hashSync(newPassword, 10) },
  });

  return json({ ok: true });
};
