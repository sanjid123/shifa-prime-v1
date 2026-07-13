import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { HelpButton, type ModuleKey } from "@/components/help-dialog";

import { getRole, ROLE_LABEL, ROLE_HOME, ROUTE_ROLE } from "@/lib/roles";
import { useSessionGuard } from "@/lib/session";
import { useInactivityLogout } from "@/lib/security/inactivity";
import { startNightlyScheduler } from "@/lib/sync/nightly";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const nav = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  useSessionGuard();
  useInactivityLogout();
  useEffect(() => {
    startNightlyScheduler();
  }, []);

  useEffect(() => {
    const role = getRole();
    if (!role) {
      nav({ to: "/" });
      return;
    }
    // TODO: re-lock before release - Doctor EMR temporarily unlocked for dev.
    const allowed = ROUTE_ROLE.find((r) => pathname.startsWith(r.prefix))?.roles;
    if (allowed && !allowed.includes(role)) {
      toast.error(`Access denied. ${ROLE_LABEL[role]} cannot open this workspace.`);
      nav({ to: ROLE_HOME[role] });
    }
  }, [pathname, nav]);

  const role = typeof window !== "undefined" ? getRole() : null;
  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header
            data-app-header
            className="no-print sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b bg-background/85 px-3 backdrop-blur"
          >
            <div className="flex min-w-0 items-center gap-3">
              <SidebarToggle />
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground md:flex">
                <span>{dateStr}</span>
                {role && <span>· {ROLE_LABEL[role]}</span>}
              </div>
              <HelpButton moduleKey={moduleKeyFor(pathname)} className="h-8 w-8" />
              <NotificationBell />
              <ThemeToggle />
            </div>

          </header>
          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function moduleKeyFor(pathname: string): ModuleKey {
  if (pathname.startsWith("/app/front-office")) return "front-office";
  if (pathname.startsWith("/app/doctor")) return "doctor";
  if (pathname.startsWith("/app/lab")) return "lab";
  if (pathname.startsWith("/app/pharmacy")) return "pharmacy";
  if (pathname.startsWith("/app/hr")) return "hr";
  return "admin";
}


function SidebarToggle() {
  const { toggleSidebar, state } = useSidebar();
  const collapsed = state === "collapsed";
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={toggleSidebar}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
    </Button>
  );
}
