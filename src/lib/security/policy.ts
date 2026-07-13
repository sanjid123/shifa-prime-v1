// Password policy + rotation helpers. Real HIBP call is routed through the
// backend adapter (see src/lib/backend).
import { backend } from "@/lib/backend";

export interface PolicyResult { ok: boolean; issues: string[] }

export function checkPasswordPolicy(pw: string): PolicyResult {
  const issues: string[] = [];
  if (pw.length < 10) issues.push("At least 10 characters");
  if (!/[A-Z]/.test(pw)) issues.push("At least one uppercase letter");
  if (!/[a-z]/.test(pw)) issues.push("At least one lowercase letter");
  if (!/\d/.test(pw)) issues.push("At least one digit");
  if (!/[^A-Za-z0-9]/.test(pw)) issues.push("At least one symbol");
  return { ok: issues.length === 0, issues };
}

export async function isBreached(pw: string): Promise<boolean> {
  try { return await backend.checkPasswordBreached(pw); } catch { return false; }
}

const ROTATION_KEY = "shifa.pwRotation";
export const ROTATION_DAYS = 90;

export function markPasswordRotated(username: string) {
  if (typeof window === "undefined") return;
  const map = readMap();
  map[username] = new Date().toISOString();
  localStorage.setItem(ROTATION_KEY, JSON.stringify(map));
}
export function daysSinceRotation(username: string): number | null {
  const map = readMap();
  const iso = map[username];
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}
export function needsRotation(username: string): boolean {
  const d = daysSinceRotation(username);
  return d != null && d > ROTATION_DAYS;
}
function readMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(ROTATION_KEY) || "{}"); } catch { return {}; }
}
