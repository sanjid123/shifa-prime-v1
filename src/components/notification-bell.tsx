import { useEffect, useMemo, useState } from "react";
import { Bell, Check, Trash2, AlertTriangle, Info, ShieldAlert, Sparkles, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { getRole } from "@/lib/roles";
import {
  notificationsFor,
  markAllNotificationsRead,
  markNotificationRead,
  dismissNotification,
  clearAllNotifications,
  type Notification,
  type NotificationType,
} from "@/lib/mock/data";

const TYPE_ICON: Record<
  NotificationType,
  { icon: React.ComponentType<{ className?: string }>; cls: string; label: string }
> = {
  fee_override: {
    icon: AlertTriangle,
    cls: "bg-amber-500/15 text-amber-600",
    label: "Fee override",
  },
  discount_override: {
    icon: AlertTriangle,
    cls: "bg-rose-500/15 text-rose-600",
    label: "Discount override",
  },
  procedure_proposal: {
    icon: Sparkles,
    cls: "bg-violet-500/15 text-violet-600",
    label: "Proposal",
  },
  alert: { icon: ShieldAlert, cls: "bg-red-500/15 text-red-600", label: "Alert" },
  system: { icon: Info, cls: "bg-sky-500/15 text-sky-600", label: "System" },
  info: { icon: Bell, cls: "bg-muted text-muted-foreground", label: "Notification" },
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [, tick] = useState(0);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const role = typeof window !== "undefined" ? getRole() : null;

  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 15000);
    return () => window.clearInterval(id);
  }, []);

  const items = useMemo<Notification[]>(() => (role ? notificationsFor(role) : []), [role, open]);
  const unreadCount = items.filter((n) => !n.read).length;
  const visible = tab === "unread" ? items.filter((n) => !n.read) : items;

  const refresh = () => tick((n) => n + 1);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative grid h-9 w-9 place-items-center rounded-full border bg-background transition hover:bg-muted"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-background">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={10} className="w-[380px] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <div className="text-sm font-semibold">Notifications</div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              disabled={unreadCount === 0}
              onClick={() => {
                if (role) markAllNotificationsRead(role);
                refresh();
              }}
            >
              <Check className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              disabled={items.length === 0}
              onClick={() => {
                if (role) clearAllNotifications(role);
                refresh();
              }}
              title="Clear all"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="flex gap-1 border-b px-2 py-1.5 text-xs">
          {(["all", "unread"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-3 py-1 font-medium capitalize transition ${
                tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {t}
              {t === "unread" && unreadCount > 0 && (
                <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px]">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-xs text-muted-foreground">
              <Bell className="h-6 w-6 opacity-40" />
              <div>You're all caught up.</div>
            </div>
          ) : (
            <ul className="divide-y">
              {visible.map((n) => {
                const meta = TYPE_ICON[n.type] ?? TYPE_ICON.info;
                const Icon = meta.icon;
                return (
                  <li
                    key={n.id}
                    className={`group relative flex gap-3 px-3 py-3 transition hover:bg-muted/50 ${
                      !n.read ? "bg-primary/[0.03]" : ""
                    }`}
                  >
                    <div
                      className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${meta.cls}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-medium leading-tight">
                          {n.title ?? meta.label}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {!n.read && (
                            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
                          )}
                          <span className="text-[11px] text-muted-foreground">{relTime(n.ts)}</span>
                        </div>
                      </div>
                      <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {n.message}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
                        {!n.read && (
                          <button
                            className="text-[11px] font-medium text-primary hover:underline"
                            onClick={() => {
                              markNotificationRead(n.id);
                              refresh();
                            }}
                          >
                            Mark read
                          </button>
                        )}
                        <button
                          className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            dismissNotification(n.id);
                            refresh();
                          }}
                        >
                          <X className="h-3 w-3" />
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="border-t px-3 py-2 text-[10px] text-muted-foreground">
          Signed in as{" "}
          <span className="font-medium capitalize text-foreground">{role ?? "guest"}</span>. Admin
          can broadcast to any module.
        </div>
      </PopoverContent>
    </Popover>
  );
}
