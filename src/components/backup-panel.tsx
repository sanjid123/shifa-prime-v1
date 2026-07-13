import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Download, Upload, RefreshCw, Cloud, Clock, ShieldAlert, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exportSnapshot, importSnapshot, snapshotCounts, audit, type Snapshot } from "@/lib/mock/data";
import { runSyncNow, getSchedule, setSchedule, getLastSyncAt, getSyncHour, setSyncHour, type Schedule } from "@/lib/sync/nightly";
import { getInactivityMinutes, setInactivityMinutes } from "@/lib/security/inactivity";
import { backend } from "@/lib/backend";

export function BackupPanel() {
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const counts = snapshotCounts();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const last = getLastSyncAt();
  const sched = getSchedule();
  const hour = getSyncHour();

  const download = () => {
    const snap = exportSnapshot();
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `shifa-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    audit("admin", "backup_download", { entity: "backup", meta: { records: total } });
    toast.success(`Backup downloaded · ${total} records`);
  };

  const restore = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const snap = JSON.parse(String(r.result)) as Snapshot;
        if (!confirm(`Restore will REPLACE current data with backup from ${new Date(snap.exportedAt).toLocaleString()}. Continue?`)) return;
        const { restored } = importSnapshot(snap);
        audit("admin", "backup_restore", { entity: "backup", meta: { keys: restored, source: file.name } });
        toast.success(`Restored ${restored.length} tables. Reloading…`);
        setTimeout(() => location.reload(), 800);
      } catch (e) {
        toast.error(`Restore failed: ${(e as Error).message}`);
      }
    };
    r.readAsText(file);
  };

  const syncNow = async () => {
    setBusy(true);
    const res = await runSyncNow("manual");
    setBusy(false);
    setTick(t => t + 1);
    if (res.ok) toast.success(`Synced to ${backend.name} · ${(res.bytes / 1024).toFixed(1)} KB`);
    else toast.error(`Sync failed: ${res.error}`);
  };

  const gdrive = () => {
    // Client-side prototype: download the backup then open Drive upload page.
    download();
    window.open("https://drive.google.com/drive/my-drive", "_blank", "noopener");
    audit("admin", "backup_gdrive_manual", { entity: "backup", meta: { method: "manual-upload" } });
    toast.message("Google Drive opened. Real one-click upload activates after Firebase + Drive OAuth are wired.");
  };

  return (
    <div className="space-y-4">
      {/* Snapshot overview */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-semibold"><HardDrive className="h-4 w-4" /> Local snapshot</div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {Object.entries(counts).map(([k, v]) => (
            <span key={k} className="rounded-md border bg-muted/40 px-2 py-1 font-mono">{k}: {v}</span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={download}><Download className="mr-1 h-4 w-4" />Download backup (.json)</Button>
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-1 h-4 w-4" />Restore from file
          </Button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) restore(f); e.target.value = ""; }} />
        </div>
      </div>

      {/* Nightly sync */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-semibold"><Cloud className="h-4 w-4" /> Cloud sync ({backend.name})</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Runs automatically after {hour}:00 based on schedule. Data stays local until then and syncs when online.
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Schedule</Label>
            <select value={sched} onChange={(e) => { setSchedule(e.target.value as Schedule); setTick(t => t + 1); }}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
              <option value="off">Off</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly (Sun)</option>
              <option value="monthly">Monthly (1st)</option>
            </select>
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Sync hour (24h)</Label>
            <Input type="number" min={0} max={23} value={hour} onChange={(e) => { setSyncHour(Number(e.target.value)); setTick(t => t + 1); }} className="mt-1 h-9" />
          </div>
          <div className="flex items-end">
            <Button size="sm" onClick={syncNow} disabled={busy}>
              <RefreshCw className={`mr-1 h-4 w-4 ${busy ? "animate-spin" : ""}`} />Sync now
            </Button>
          </div>
          <div className="flex items-end">
            <Button size="sm" variant="outline" onClick={gdrive}>
              <Cloud className="mr-1 h-4 w-4" />Back up to Google Drive
            </Button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Last sync: {last ? new Date(last).toLocaleString() : "never"}
          <span className="opacity-40">·</span>
          Next window: today {String(hour).padStart(2, "0")}:00
        </div>
      </div>

      {/* Security controls */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-semibold"><ShieldAlert className="h-4 w-4" /> Security</div>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Inactivity auto-logout (minutes)</Label>
            <Input type="number" min={2} max={120}
              defaultValue={getInactivityMinutes()}
              onBlur={(e) => { setInactivityMinutes(Number(e.target.value)); toast.success("Inactivity timeout updated"); }}
              className="mt-1 h-9" />
          </div>
          <div className="self-end text-xs text-muted-foreground">
            Single active session per role · HMAC-signed tokens · Full audit log.
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-dashed bg-muted/30 p-3 text-[11px] text-muted-foreground">
        Backend: <b>{backend.name}</b>. Set <code>VITE_BACKEND=firebase</code> and provide Firebase config to route sync/session/HIBP through the cloud. See <code>DEPLOY.md</code>.
        <span className="hidden">{tick}</span>
      </div>
    </div>
  );
}
