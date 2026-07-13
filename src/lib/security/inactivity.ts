// Inactivity auto-logout hook. Resets on pointer/key events. Warns 60s before.
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { audit } from "@/lib/mock/data";
import { endSession } from "@/lib/session";
import { getRole } from "@/lib/roles";

const KEY = "shifa.security.inactivityMin";
export function getInactivityMinutes(): number {
  if (typeof window === "undefined") return 15;
  const n = Number(localStorage.getItem(KEY) ?? 15);
  return Number.isFinite(n) && n >= 2 && n <= 120 ? n : 15;
}
export function setInactivityMinutes(m: number) {
  if (typeof window !== "undefined") localStorage.setItem(KEY, String(m));
}

export function useInactivityLogout() {
  const nav = useNavigate();
  useEffect(() => {
    let last = Date.now();
    let warned = false;
    const bump = () => { last = Date.now(); warned = false; };
    const events = ["pointerdown", "keydown", "wheel", "touchstart", "visibilitychange"];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));

    const iv = window.setInterval(() => {
      const mins = getInactivityMinutes();
      const idle = (Date.now() - last) / 60000;
      if (!warned && idle >= mins - 1 && idle < mins) {
        warned = true;
        toast.warning("You will be signed out in 60 seconds due to inactivity.");
      }
      if (idle >= mins) {
        const role = getRole();
        if (role) {
          audit("auth", "inactivity_logout", { role, entity: "session", meta: { idleMinutes: Math.round(idle) } });
          endSession("forced");
          toast.error("Signed out due to inactivity.");
          nav({ to: "/" });
        }
      }
    }, 15000);

    return () => {
      window.clearInterval(iv);
      events.forEach((e) => window.removeEventListener(e, bump));
    };
  }, [nav]);
}
