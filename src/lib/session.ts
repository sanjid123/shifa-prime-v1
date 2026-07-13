import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { Role } from "./mock/data";
import { audit } from "./mock/data";
import { clearRole, getRole } from "./roles";

const SESSIONS_KEY = "shifa.sessions";       // { [role]: { sessionId, username, deviceLabel, startedAt, lastSeen } }
const CURRENT_KEY = "shifa.currentSession";  // this tab's sessionId
const USERNAME_KEY = "shifa.username";

export interface SessionRecord {
  sessionId: string;
  username: string;
  deviceLabel: string;
  startedAt: string;
  lastSeen: string;
}

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
function deviceLabel() {
  if (typeof navigator === "undefined") return "Unknown";
  const ua = navigator.userAgent;
  const os = /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : "Device";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "Browser";
  return `${br} on ${os}`;
}

function readSessions(): Record<string, SessionRecord> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || "{}"); } catch { return {}; }
}
function writeSessions(s: Record<string, SessionRecord>) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(s));
}

export function beginSession(role: Role, username: string): SessionRecord {
  const sessions = readSessions();
  const previous = sessions[role];
  const now = new Date().toISOString();
  const rec: SessionRecord = { sessionId: uuid(), username, deviceLabel: deviceLabel(), startedAt: now, lastSeen: now };
  sessions[role] = rec;
  writeSessions(sessions);
  localStorage.setItem(CURRENT_KEY, rec.sessionId);
  localStorage.setItem(USERNAME_KEY, username);
  if (previous) {
    audit("auth", "session_evicted", { role, actor: username, entity: "session", entityId: previous.sessionId, meta: { previousDevice: previous.deviceLabel } });
  }
  audit("auth", "login", { role, actor: username, entity: "session", entityId: rec.sessionId, meta: { device: rec.deviceLabel } });
  return rec;
}

export function endSession(reason: "logout" | "forced" = "logout") {
  const role = getRole();
  const username = typeof window !== "undefined" ? (localStorage.getItem(USERNAME_KEY) ?? "unknown") : "unknown";
  const current = typeof window !== "undefined" ? localStorage.getItem(CURRENT_KEY) : null;
  if (role) {
    const sessions = readSessions();
    // Only clear registry entry if this tab still owns it
    if (sessions[role]?.sessionId === current) {
      delete sessions[role];
      writeSessions(sessions);
    }
    audit("auth", reason === "forced" ? "forced_logout" : "logout", { role, actor: username, entity: "session", entityId: current ?? undefined });
  }
  localStorage.removeItem(CURRENT_KEY);
  localStorage.removeItem(USERNAME_KEY);
  clearRole();
}

export function currentSessionId() {
  return typeof window === "undefined" ? null : localStorage.getItem(CURRENT_KEY);
}

/** Watches for another device signing in with the same role; forcibly signs out this tab. */
export function useSessionGuard() {
  const nav = useNavigate();
  useEffect(() => {
    const check = () => {
      const role = getRole();
      const current = currentSessionId();
      if (!role || !current) return;
      const sessions = readSessions();
      const active = sessions[role];
      if (!active || active.sessionId !== current) {
        endSession("forced");
        toast.error("Signed out · another device signed in for this account.");
        nav({ to: "/" });
      } else {
        // heartbeat
        active.lastSeen = new Date().toISOString();
        sessions[role] = active;
        writeSessions(sessions);
      }
    };
    check();
    const iv = window.setInterval(check, 5000);
    const onStorage = (e: StorageEvent) => { if (e.key === SESSIONS_KEY || e.key === CURRENT_KEY) check(); };
    window.addEventListener("storage", onStorage);
    return () => { window.clearInterval(iv); window.removeEventListener("storage", onStorage); };
  }, [nav]);
}

export function listActiveSessions(): { role: string; rec: SessionRecord }[] {
  const s = readSessions();
  return Object.entries(s).map(([role, rec]) => ({ role, rec }));
}
