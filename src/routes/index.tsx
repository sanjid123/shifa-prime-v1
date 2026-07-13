import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { UserCog, FlaskConical, Pill, BarChart3, Stethoscope, Shield, ShieldCheck, ArrowRight, ArrowLeft, Eye, EyeOff, KeyRound, X, Lock, Sparkles } from "lucide-react";
import { setRole, ROLE_HOME, USERNAME_ROLE } from "@/lib/roles";
import { beginSession } from "@/lib/session";
import type { Role } from "@/lib/mock/data";
import logo from "@/assets/shifa-logo-v2.png";
import clinicBg from "@/assets/clinic-bg.png";
import { toast } from "sonner";
import { verifyCredential, requestPasswordReset, changePassword } from "@/lib/mock/hr";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in · Shifa Clinic HMS v1.0" },
      { name: "description", content: "Shifa Clinic HMS v1.0 · secure sign-in for clinic staff." },
    ],
  }),
  component: Landing,
});

const modules: { id: Role; label: string; icon: React.ComponentType<{ className?: string }>; bg: string; fg: string; desc: string; locked?: boolean }[] = [
  { id: "front_office", label: "Front Office", icon: UserCog, bg: "bg-sky-50", fg: "text-sky-600", desc: "Registrations, appointments, checks-in" },
  { id: "doctor", label: "Doctor EMR", icon: Stethoscope, bg: "bg-emerald-50", fg: "text-emerald-600", desc: "Prescriptions, EMR consultation queue", locked: true },
  { id: "lab", label: "Laboratory", icon: FlaskConical, bg: "bg-purple-50", fg: "text-purple-600", desc: "Lab tests, sample collection, LIS results" },
  { id: "pharmacy", label: "Pharmacy POS", icon: Pill, bg: "bg-amber-50", fg: "text-amber-600", desc: "POS billing, drug inventory, distributions" },
  { id: "accountant", label: "Accounts", icon: BarChart3, bg: "bg-rose-50", fg: "text-rose-600", desc: "Cashbook, payables, receivables ledger" },
  { id: "admin", label: "Administrator", icon: Shield, bg: "bg-slate-100", fg: "text-slate-700", desc: "Settings, access logs, backup ledger, HR" },
];

function Landing() {
  const nav = useNavigate();
  const [selectedModule, setSelectedModule] = useState<Role | null>(null);
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [mustChange, setMustChange] = useState<{ username: string; role: Role } | null>(null);

  const enter = (r: Role, username: string) => {
    if (r === "doctor") { setUpgradeOpen(true); return; }
    setRole(r);
    beginSession(r, username);
    nav({ to: ROLE_HOME[r] });
  };

  const signIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModule) return;
    const key = u.trim().toLowerCase();
    if (!key) { toast.error("Enter your username"); return; }
    const cred = verifyCredential(key, p);
    
    if (cred) {
      // Role enforcement check: make sure the logged-in user's role matches the selected workspace module
      const isAllowed =
        cred.role === "admin" ||
        cred.role === selectedModule ||
        (selectedModule === "accountant" && cred.role === "admin");
        
      if (!isAllowed) {
        toast.error(`Access denied. Your account is not authorized for the ${modules.find(m => m.id === selectedModule)?.label} workspace.`);
        return;
      }

      if (cred.mustChange) { setMustChange({ username: key, role: cred.role }); return; }
      enter(cred.role, key);
      return;
    }
    
    // Fallback: quick-access username map (no password) for demo convenience
    const demoRole = USERNAME_ROLE[key];
    if (demoRole && !p) {
      if (demoRole !== selectedModule && demoRole !== "admin") {
        toast.error(`Demo access username '${u}' is not assigned to the selected workspace.`);
        return;
      }
      enter(demoRole, key);
      return;
    }
    toast.error("Invalid credentials");
  };

  const activeModuleInfo = modules.find((m) => m.id === selectedModule);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-100 p-3 sm:p-4 md:p-6">
      <div className="mx-auto grid w-full max-w-[400px] grid-cols-1 overflow-hidden rounded-2xl shadow-2xl md:max-w-5xl md:grid-cols-2 bg-white md:min-h-[560px]">
        {/* LEFT · dark hero */}
        <aside className="relative flex flex-col justify-between overflow-hidden bg-[#0b1a33] p-6 text-white md:p-10 min-h-[200px]">
          <div aria-hidden className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: `url(${clinicBg})` }} />
          <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(11,26,51,0.94) 0%, rgba(11,26,51,0.78) 50%, rgba(11,26,51,0.6) 100%)" }} />

          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center">
                <img src={logo} alt="Shifa Clinic" className="h-12 w-12 object-contain" />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-bold leading-tight md:text-xl">Shifa Clinic</div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300">Your Health, Shifa's Priority</div>
              </div>
            </div>
          </div>

          <div className="relative mt-6 md:mt-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-widest text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" /> Shifa Clinic HMS v1.0
            </span>
            <h1
              className="mt-5 font-serif text-4xl leading-[1.05] tracking-tight sm:text-5xl md:mt-6 md:text-6xl"
              style={{ fontFamily: '"Instrument Serif", ui-serif, Georgia, serif' }}
            >
              Care, organised<br />
              <em className="text-sky-400">end to end.</em>
            </h1>
          </div>

          <div className="relative mt-6 border-t border-white/10 pt-4 md:mt-8 md:pt-5">
            <div className="flex flex-wrap gap-1.5 text-[10px] md:text-[11px]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-2.5 py-1 text-sky-200 ring-1 ring-sky-400/30">
                <ShieldCheck className="h-3 w-3" /> 24/7 Encrypted
              </span>
              {["GDPR", "PDPL", "DPDP", "NABH-Aligned"].map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-sky-300 ring-1 ring-white/10">
                  <ShieldCheck className="h-3 w-3" /> {c}
                </span>
              ))}
            </div>
          </div>
        </aside>

        {/* RIGHT · workspace or sign in */}
        <section className="flex flex-col justify-between bg-white p-6 md:p-10 text-slate-900 min-h-[500px]">
          {!selectedModule ? (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-600">Select Module</div>
              <h2
                className="mt-1 font-serif text-3xl tracking-tight md:text-4xl"
                style={{ fontFamily: '"Instrument Serif", ui-serif, Georgia, serif' }}
              >
                Choose Workspace
              </h2>
              <p className="text-xs text-slate-500 mt-1">Select the department module you wish to access.</p>

              <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                {modules.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      if (m.locked) {
                        setUpgradeOpen(true);
                      } else {
                        setSelectedModule(m.id);
                      }
                    }}
                    className="group flex items-start gap-3.5 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:-translate-y-0.5 hover:shadow-md hover:border-sky-300 cursor-pointer"
                  >
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${m.bg} ${m.fg} group-hover:scale-105 transition-transform`}>
                      <m.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-800 group-hover:text-sky-800 transition-colors">{m.label}</span>
                        {m.locked && (
                          <span className="rounded bg-amber-100 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-800">
                            Pro
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-slate-500">{m.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <button
                onClick={() => {
                  setSelectedModule(null);
                  setU("");
                  setP("");
                }}
                className="group mb-4 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
                Back to workspaces
              </button>

              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-600">
                {activeModuleInfo?.label}
              </div>
              <h2
                className="mt-1 font-serif text-4xl tracking-tight md:text-5xl"
                style={{ fontFamily: '"Instrument Serif", ui-serif, Georgia, serif' }}
              >
                Secure Login.
              </h2>
              <p className="text-xs text-slate-500 mt-1">Please enter authorization credentials to access workspace.</p>

              <form onSubmit={signIn} className="mt-5 space-y-4">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-700">Username</label>
                  <input
                    autoFocus autoComplete="username"
                    value={u} onChange={(e) => setU(e.target.value)}
                    placeholder="Enter your username"
                    className="mt-1.5 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-700">Password</label>
                    <button type="button" onClick={() => setForgotOpen(true)} className="text-xs text-sky-600 hover:underline">Forgot?</button>
                  </div>
                  <div className="relative mt-1.5">
                    <input
                      type={showPw ? "text" : "password"} autoComplete="current-password"
                      value={p} onChange={(e) => setP(e.target.value)}
                      placeholder="••••••••"
                      className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 pr-10 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    />
                    <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
                    <ShieldCheck className="h-3.5 w-3.5" /> Secured Session
                  </div>
                </div>

                <button type="submit" className="group flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#0b1a33] text-sm font-semibold tracking-wide text-white transition hover:bg-[#122649] active:scale-[0.99] cursor-pointer">
                  Sign in to Workspace <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </button>

                {!import.meta.env.PROD && import.meta.env.VITE_BACKEND !== "firebase" && (
                  <div className="rounded-lg border border-sky-100 bg-sky-50/50 p-3 text-[10px] leading-relaxed text-sky-800">
                    <span className="font-bold">Demo access username:</span>
                    <ul className="mt-1 list-disc pl-4 space-y-0.5">
                      {selectedModule === "front_office" && <li><code>frontdesk</code> or <code>reception</code> (Password: <code>Root</code>)</li>}
                      {selectedModule === "lab" && <li><code>lab</code> (Password: <code>Root</code>)</li>}
                      {selectedModule === "pharmacy" && <li><code>pharmacy</code> (Password: <code>Root</code>)</li>}
                      {selectedModule === "accountant" && <li><code>accountant</code> (Password: <code>Root</code>)</li>}
                      {selectedModule === "admin" && <li><code>admin</code> (Password: <code>Root</code>)</li>}
                    </ul>
                  </div>
                )}
              </form>
            </div>
          )}

          <div className="mt-6 border-t pt-4 flex items-center justify-between text-[11px] text-slate-400">
            <span>© {new Date().getFullYear()} Shifa Clinic</span>
            <span>Crafted with love ❤️ · ERPconnect.in</span>
          </div>
        </section>
      </div>

      {forgotOpen && <ForgotDialog onClose={() => setForgotOpen(false)} />}
      {upgradeOpen && <UpgradeDialog onClose={() => setUpgradeOpen(false)} />}
      {mustChange && (
        <MustChangeDialog
          username={mustChange.username}
          onDone={() => { const r = mustChange.role; setMustChange(null); enter(r, mustChange.username); }}
          onCancel={() => setMustChange(null)}
        />
      )}
    </div>
  );
}

function UpgradeDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative bg-gradient-to-br from-teal-600 to-emerald-700 p-6 text-white">
          <button className="absolute right-3 top-3 rounded-md p-1 text-white/80 hover:bg-white/10" onClick={onClose}><X className="h-4 w-4" /></button>
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-white/80">Pro Module</div>
              <div className="text-lg font-bold">Doctor EMR</div>
            </div>
          </div>
          <p className="mt-4 text-sm text-white/90">
            Clinical notes, prescriptions, lab routing and diagnosis workflows are part of the Doctor EMR add-on. Available in the next release.
          </p>
        </div>
        <div className="space-y-3 p-6">
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 text-teal-600" /> SOAP notes, Rx templates &amp; ICD tagging</li>
            <li className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 text-teal-600" /> One-click Lab &amp; Pharmacy routing</li>
            <li className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 text-teal-600" /> Consent forms &amp; visit history timeline</li>
          </ul>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">Maybe later</button>
            <button onClick={() => { window.location.href = "mailto:sales@erpconnect.in?subject=Shifa%20HMS%20-%20Doctor%20EMR%20full%20version"; }} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">Purchase Full Version</button>
          </div>
        </div>
      </div>
    </div>
  );
}


function ForgotDialog({ onClose }: { onClose: () => void }) {
  const [u, setU] = useState("");
  const submit = () => {
    if (!u.trim()) { toast.error("Enter your username"); return; }
    try {
      requestPasswordReset(u);
      toast.success("Reset request sent to Administrator");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-sky-600" />
          <h3 className="text-base font-bold">Password reset</h3>
          <button className="ml-auto text-slate-400 hover:text-slate-600" onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <p className="text-xs text-slate-500">Your Administrator will issue a temporary password. You will be required to change it on first sign-in.</p>
        <div className="mt-3">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-700">Username</label>
          <input value={u} onChange={(e) => setU(e.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
          <button onClick={submit} className="rounded-lg bg-[#0b1a33] px-4 py-2 text-sm font-semibold text-white hover:bg-[#122649]">Send request</button>
        </div>
      </div>
    </div>
  );
}

function MustChangeDialog({ username, onDone, onCancel }: { username: string; onDone: () => void; onCancel: () => void }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const submit = () => {
    if (pw.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (pw !== pw2) { toast.error("Passwords don't match"); return; }
    changePassword(username, pw);
    toast.success("Password updated");
    onDone();
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <h3 className="mb-1 text-base font-bold">Set a new password</h3>
        <p className="text-xs text-slate-500">A temporary password was issued for <b>{username}</b>. Please set a new one to continue.</p>
        <div className="mt-3 space-y-2">
          <input type="password" placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
          <input type="password" placeholder="Confirm new password" value={pw2} onChange={(e) => setPw2(e.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
          <button onClick={submit} className="rounded-lg bg-[#0b1a33] px-4 py-2 text-sm font-semibold text-white hover:bg-[#122649]">Update & sign in</button>
        </div>
      </div>
    </div>
  );
}
