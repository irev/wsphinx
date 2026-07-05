import { browser } from "$app/environment";

export interface AuthUser {
  id: string;
  name: string;
  role: string;
  phone: string;
}

class AuthStore {
  user = $state<AuthUser | null>(null);
  loading = $state(true);
}

export const auth = new AuthStore();

async function fetchMe() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch("/api/auth/me", { signal: controller.signal });
    if (res.ok) {
      const d = await res.json();
      auth.user = d.data || null;
    } else {
      auth.user = null;
    }
  } catch {
    auth.user = null;
  } finally {
    clearTimeout(timeout);
    auth.loading = false;
  }
}

export async function login(phone: string, password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });
    const d = await res.json();
    if (res.ok) {
      auth.user = d.data || null;
      return { ok: true };
    }
    return { ok: false, error: d.error || "Login gagal" };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  auth.user = null;
}

if (browser) {
  fetchMe();
}
