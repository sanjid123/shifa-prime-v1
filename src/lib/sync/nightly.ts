// Nightly sync scheduler. Checks every 5 min; if configured hour has passed
// and today has not been synced yet, pushes the local snapshot via the backend
// adapter. All outcomes are audited.
import { audit, exportSnapshot, persistNow } from "@/lib/mock/data";
import { backend } from "@/lib/backend";

export type Schedule = "off" | "daily" | "weekly" | "monthly";
const SCHEDULE_KEY = "shifa.sync.schedule";
const LAST_KEY = "shifa.sync.lastSyncAt";
const HOUR_KEY = "shifa.sync.hour";

export function getSchedule(): Schedule {
  if (typeof window === "undefined") return "daily";
  return (localStorage.getItem(SCHEDULE_KEY) as Schedule | null) ?? "daily";
}
export function setSchedule(s: Schedule) {
  if (typeof window !== "undefined") localStorage.setItem(SCHEDULE_KEY, s);
}
export function getSyncHour(): number {
  if (typeof window === "undefined") return 22;
  const raw = localStorage.getItem(HOUR_KEY);
  const n = raw ? Number(raw) : Number(import.meta.env.VITE_SYNC_HOUR ?? 22);
  return Number.isFinite(n) && n >= 0 && n <= 23 ? n : 22;
}
export function setSyncHour(h: number) {
  if (typeof window !== "undefined") localStorage.setItem(HOUR_KEY, String(h));
}
export function getLastSyncAt(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LAST_KEY);
}
function markSynced(iso: string) {
  if (typeof window !== "undefined") localStorage.setItem(LAST_KEY, iso);
}

function isDueNow(now = new Date()): boolean {
  const s = getSchedule();
  if (s === "off") return false;
  if (now.getHours() < getSyncHour()) return false;
  const last = getLastSyncAt();
  if (!last) return true;
  const lastD = new Date(last);
  const sameDay = lastD.toDateString() === now.toDateString();
  if (sameDay) return false;
  if (s === "daily") return true;
  if (s === "weekly") return now.getDay() === 0; // Sunday
  if (s === "monthly") return now.getDate() === 1;
  return false;
}

export async function runSyncNow(trigger: "manual" | "scheduler" = "manual") {
  persistNow();
  const snap = exportSnapshot();
  try {
    const res = await backend.pushSnapshot(snap);
    markSynced(res.syncedAt);
    audit("admin", "cloud_sync", {
      entity: "backup",
      meta: { trigger, backend: backend.name, bytes: res.bytes, syncedAt: res.syncedAt },
    });
    return { ok: true as const, ...res };
  } catch (err) {
    audit("admin", "cloud_sync_failed", {
      entity: "backup",
      meta: { trigger, backend: backend.name, error: (err as Error).message },
    });
    return { ok: false as const, error: (err as Error).message };
  }
}

let _iv: number | null = null;
export function startNightlyScheduler() {
  if (typeof window === "undefined") return;
  if (_iv != null) return;
  const tick = () => { if (isDueNow()) void runSyncNow("scheduler"); };
  tick();
  _iv = window.setInterval(tick, 5 * 60 * 1000);
}
