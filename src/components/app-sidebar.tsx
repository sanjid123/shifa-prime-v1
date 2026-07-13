import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  UserCog,
  FlaskConical,
  Pill,
  BarChart3,
  LogOut,
  Stethoscope,
  Users,
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  RotateCcw,
  FileText,
  Building2,
  Shield,
  KeyRound,
  Cloud,
  ClipboardCheck,
  Percent,
  CalendarRange,
  User,
  Check,
  ChevronDown,
  UserPlus,
  Ticket,
  CalendarDays,
  ClipboardList,
  Settings2,
  ReceiptText,
  TestTube,
  Wallet,
  TrendingDown,
  TrendingUp,

} from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import type { Role } from "@/lib/mock/data";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import logo from "@/assets/shifa-logo-v2.png";
import { getRole, ROLE_LABEL, DEMO_UNLOCK_DOCTOR } from "@/lib/roles";
import { endSession } from "@/lib/session";

const DOCTOR_ROLES_UI: Role[] = DEMO_UNLOCK_DOCTOR
  ? ["doctor", "front_office", "lab", "pharmacy", "admin", "accountant"]
  : ["doctor", "admin"];

const items: {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}[] = [
  { title: "Front Office", url: "/app/front-office", icon: UserCog, roles: ["front_office"] },
  { title: "Doctor EMR", url: "/app/doctor", icon: Stethoscope, roles: DOCTOR_ROLES_UI },
  { title: "Laboratory", url: "/app/lab", icon: FlaskConical, roles: ["lab"] },
  { title: "Pharmacy", url: "/app/pharmacy", icon: Pill, roles: ["pharmacy"] },
  { title: "Accounts & Admin", url: "/app/admin", icon: BarChart3, roles: ["admin"] },
  { title: "Accounts", url: "/app/admin", icon: Wallet, roles: ["accountant"] },
  { title: "HR & Payroll", url: "/app/hr", icon: Users, roles: ["admin", "accountant"] },
];

const PHARMACY_SUB: {
  tab: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { tab: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { tab: "sales", label: "Sales & POS", icon: ShoppingCart },
  { tab: "medicines", label: "Inventory", icon: Package },
  { tab: "purchase", label: "Purchase", icon: Truck },
  { tab: "distributors", label: "Distributors", icon: Truck },
  { tab: "returns", label: "Returns", icon: RotateCcw },
  { tab: "reports", label: "Reports", icon: FileText },
];

const ADMIN_SUB: {
  tab: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { tab: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { tab: "daybook", label: "Daybook", icon: CalendarRange },
  { tab: "receivables", label: "Receivables", icon: TrendingUp },
  { tab: "payables", label: "Payables", icon: TrendingDown },
  { tab: "payouts", label: "Doctor Payouts", icon: Stethoscope },
  { tab: "insurance", label: "Insurance & TPA", icon: Shield },
  { tab: "patient360", label: "Patient 360", icon: User },
  { tab: "gst", label: "GST Reports", icon: Percent },
  { tab: "reconcile", label: "Reconcile", icon: ClipboardCheck },
  { tab: "approvals", label: "Approvals", icon: Check },
  { tab: "staff", label: "Staff", icon: Users },
  { tab: "departments", label: "Departments", icon: Building2 },
  { tab: "access", label: "Access Control", icon: KeyRound },
  { tab: "backup", label: "Backup", icon: Cloud },
  { tab: "audit", label: "Audit Log", icon: Shield },
  { tab: "settings", label: "Settings", icon: Settings2 },
];

// Accountant-only view of the admin surface - no approvals/staff/departments/
// access/backup/settings. Lands on Daybook by default.
const ACCOUNTANT_SUB: {
  tab: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { tab: "daybook", label: "Daybook", icon: CalendarRange },
  { tab: "receivables", label: "Receivables", icon: TrendingUp },
  { tab: "payables", label: "Payables", icon: TrendingDown },
  { tab: "payouts", label: "Doctor Payouts", icon: Stethoscope },
  { tab: "insurance", label: "Insurance & TPA", icon: Shield },
  { tab: "gst", label: "GST Reports", icon: Percent },
  { tab: "reconcile", label: "Reconcile", icon: ClipboardCheck },
  { tab: "patient360", label: "Patient 360", icon: User },
  { tab: "audit", label: "Audit Log", icon: Shield },
];



const FRONT_OFFICE_SUB: {
  tab: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { tab: "patients", label: "Patient Registration", icon: UserPlus },
  { tab: "visits", label: "New Visit", icon: Ticket },
  { tab: "appointments", label: "Appointments", icon: CalendarDays },
  { tab: "crossconsult", label: "Cross Consultation", icon: Users },
  { tab: "procedure", label: "Procedure Bill", icon: ClipboardList },
  { tab: "doctors", label: "Doctor Registration", icon: Stethoscope },
  { tab: "reports", label: "Reports", icon: FileText },
];


const LAB_SUB: {
  tab: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { tab: "orders", label: "Orders", icon: ClipboardList },
  { tab: "collection", label: "Sample Collection", icon: TestTube },
  { tab: "reagents", label: "Reagents", icon: Package },
  { tab: "indents", label: "Indents", icon: ClipboardCheck },
  { tab: "purchases", label: "Purchases", icon: Truck },
  { tab: "billing", label: "Lab Billing", icon: FlaskConical },
  { tab: "bills", label: "Bills", icon: ReceiptText },
  { tab: "reports", label: "Lab Reports", icon: FileText },
  { tab: "packages", label: "Packages", icon: Package },
  { tab: "analytics", label: "Reports & Analytics", icon: BarChart3 },
];

const DOCTOR_SUB: {
  tab: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { tab: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { tab: "queue", label: "Consultation Queue", icon: ClipboardList },
  { tab: "patients", label: "Patient Search", icon: User },
];

const HR_SUB: {
  tab: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { tab: "staff", label: "Staff & Payroll", icon: Users },
  { tab: "partners", label: "Partners", icon: Building2 },
];


export function AppSidebar() {
  const nav = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const searchObj = useRouterState({ select: (r) => r.location.search }) as { tab?: string };
  const role = typeof window !== "undefined" ? getRole() : null;
  const visible = role ? items.filter((i) => i.roles.includes(role)) : [];

  const SUBS: Record<string, { tab: string; label: string; icon: React.ComponentType<{ className?: string }> }[]> = {
    "/app/pharmacy": PHARMACY_SUB,
    "/app/admin": role === "accountant" ? ACCOUNTANT_SUB : ADMIN_SUB,
    "/app/front-office": FRONT_OFFICE_SUB,
    "/app/lab": LAB_SUB,
    "/app/doctor": DOCTOR_SUB,
    "/app/hr": HR_SUB,
  };
  const DEFAULT_TAB: Record<string, string> = {
    "/app/pharmacy": "dashboard",
    "/app/admin": role === "accountant" ? "daybook" : "dashboard",
    "/app/front-office": "patients",
    "/app/lab": "orders",
    "/app/doctor": "dashboard",
    "/app/hr": "staff",
  };


  const currentTab = searchObj?.tab ?? DEFAULT_TAB[pathname] ?? "dashboard";

  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  useEffect(() => {
    // Auto-open the group matching the current route
    const match = visible.find((i) => pathname.startsWith(i.url) && SUBS[i.url]);
    if (match) {
      setOpenMap((o) => (o[match.url] ? o : { ...o, [match.url]: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-2">
          <img src={logo} alt="Shifa Clinic" className="h-9 w-9 shrink-0" />
          <div className="min-w-0">
            <div className="truncate text-sm font-bold leading-tight">SHIFA CLINIC</div>
            <div className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
              HMS
            </div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Your Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visible.map((item) => {
                const active = pathname.startsWith(item.url);
                const sub = SUBS[item.url];
                const isOpen = !!openMap[item.url];
                const toggle = () =>
                  setOpenMap((o) => ({ ...o, [item.url]: !o[item.url] }));
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link
                        to={item.url}
                        onClick={() => {
                          if (sub) toggle();
                        }}
                      >
                        <item.icon />
                        <span>{item.title}</span>


                        {sub && (
                          <ChevronDown
                            className={cn(
                              "ml-auto h-4 w-4 shrink-0 transition-transform",
                              isOpen && "rotate-180",
                            )}
                          />
                        )}
                      </Link>
                    </SidebarMenuButton>
                    {sub && !collapsed && (
                      <Collapsible open={isOpen}>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {sub.map((s) => {
                              const isActive =
                                (active && currentTab === s.tab) ||
                                (active && !searchObj?.tab && s.tab === (DEFAULT_TAB[item.url] ?? "dashboard"));
                              return (
                                <SidebarMenuSubItem key={s.tab}>
                                  <SidebarMenuSubButton asChild isActive={isActive}>
                                    <Link to={item.url} search={{ tab: s.tab }}>
                                      <s.icon />
                                      <span>{s.label}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </SidebarMenuItem>
                );
              })}
              {visible.length === 0 && (
                <div className="px-2 py-1 text-xs text-muted-foreground">No workspace assigned</div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        {!collapsed && (
          <div className="px-2 pb-1 pt-2 text-[11px] text-muted-foreground">
            <Stethoscope className="mr-1 inline h-3 w-3" />
            Signed in as {role ? ROLE_LABEL[role] : "Guest"}
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                endSession("logout");
                nav({ to: "/" });
              }}
              tooltip="Sign out"
            >
              <LogOut />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
