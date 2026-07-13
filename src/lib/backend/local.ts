// Local backend adapter: stores the last snapshot in localStorage.
// Used offline and as the swap-in target for Firebase later.
import type { Snapshot } from "@/lib/mock/data";
import type { Backend } from "./index";

const KEY = "shifa.backend.local.snapshot";

export const localBackend: Backend = {
  name: "local",
  async pushSnapshot(snap) {
    const payload = JSON.stringify(snap);
    if (typeof window !== "undefined") {
      try { localStorage.setItem(KEY, payload); } catch { /* quota */ }
    }
    return { syncedAt: new Date().toISOString(), bytes: payload.length };
  },
  async pullSnapshot() {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Snapshot) : null;
    } catch { return null; }
  },
  async validateSession(_token) {
    // Mock: always true. Firebase impl will verify against server session.
    return true;
  },
  async checkPasswordBreached(pw) {
    // Local heuristic: reject a tiny known-bad list. Real HIBP happens via backend.
    const bad = new Set([
      "password", "password1", "12345678", "qwerty123", "admin123",
      "welcome1", "letmein1", "iloveyou", "shifa123",
    ]);
    return bad.has(pw.toLowerCase());
  },
};
