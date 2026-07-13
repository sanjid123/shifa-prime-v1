import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Monitor, Volume2, VolumeX, Activity, Clock, Users, Stethoscope } from "lucide-react";
import {
  queue as seedQueue,
  doctors as seedDoctors,
  findPatient,
  type QueueEntry,
} from "@/lib/mock/data";

export const Route = createFileRoute("/queue-display")({
  component: QueueDisplay,
});

/* ───────── Queue TV Display ─────────
   A full-screen, auto-refreshing public route intended for
   waiting room TVs. No authentication required.
   ──────────────────────────────────── */

function QueueDisplay() {
  const [q, setQ] = useState<QueueEntry[]>(seedQueue);
  const [now, setNow] = useState(new Date());
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Auto-refresh every 3 seconds
  useEffect(() => {
    const iv = setInterval(() => {
      setQ([...seedQueue]);
      setNow(new Date());
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  const waiting = useMemo(() => q.filter((e) => e.status === "waiting"), [q]);
  const inConsult = useMemo(
    () => q.filter((e) => e.station === "with_doctor"),
    [q]
  );
  const completed = useMemo(
    () => q.filter((e) => e.station === "done").slice(0, 5),
    [q]
  );

  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const dateStr = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="queue-tv-root">
      {/* Header */}
      <header className="queue-tv-header">
        <div className="queue-tv-brand">
          <Activity className="h-8 w-8 text-sky-400" />
          <div>
            <h1 className="queue-tv-title">Shifa Clinic HMS</h1>
            <p className="queue-tv-subtitle">Patient Queue Display</p>
          </div>
        </div>
        <div className="queue-tv-time">
          <div className="queue-tv-clock">{timeStr}</div>
          <div className="queue-tv-date">{dateStr}</div>
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="queue-tv-sound-btn"
          title={soundEnabled ? "Mute" : "Unmute"}
        >
          {soundEnabled ? (
            <Volume2 className="h-6 w-6" />
          ) : (
            <VolumeX className="h-6 w-6" />
          )}
        </button>
      </header>

      {/* Stats Bar */}
      <div className="queue-tv-stats">
        <div className="queue-tv-stat">
          <Users className="h-5 w-5 text-amber-400" />
          <span className="queue-tv-stat-value">{waiting.length}</span>
          <span className="queue-tv-stat-label">Waiting</span>
        </div>
        <div className="queue-tv-stat">
          <Stethoscope className="h-5 w-5 text-emerald-400" />
          <span className="queue-tv-stat-value">{inConsult.length}</span>
          <span className="queue-tv-stat-label">In Consultation</span>
        </div>
        <div className="queue-tv-stat">
          <Clock className="h-5 w-5 text-sky-400" />
          <span className="queue-tv-stat-value">
            {waiting.length > 0
              ? `~${Math.max(5, waiting.length * 8)} min`
              : "—"}
          </span>
          <span className="queue-tv-stat-label">Est. Wait</span>
        </div>
      </div>

      {/* Main content grid */}
      <div className="queue-tv-grid">
        {/* Now Serving */}
        <section className="queue-tv-section queue-tv-now">
          <div className="queue-tv-section-header queue-tv-now-header">
            <Stethoscope className="h-5 w-5" />
            <span>Now Serving</span>
          </div>
          <div className="queue-tv-now-list">
            {inConsult.length === 0 ? (
              <div className="queue-tv-empty">No patients in consultation</div>
            ) : (
              inConsult.map((e, i) => {
                const pt = findPatient(e.patientId);
                return (
                  <div
                    key={e.id}
                    className="queue-tv-now-card"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <div className="queue-tv-token-badge queue-tv-token-active">
                      T{e.token}
                    </div>
                    <div className="queue-tv-now-info">
                      <div className="queue-tv-now-name">
                        {pt?.name ?? "Patient"}
                      </div>
                      <div className="queue-tv-now-doctor">
                        Dr.{" "}
                        {seedDoctors.find((d) => d.name === e.doctor)?.name ??
                          e.doctor}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Waiting List */}
        <section className="queue-tv-section queue-tv-waiting">
          <div className="queue-tv-section-header queue-tv-waiting-header">
            <Users className="h-5 w-5" />
            <span>Waiting ({waiting.length})</span>
          </div>
          <div className="queue-tv-waiting-list">
            {waiting.length === 0 ? (
              <div className="queue-tv-empty">No patients waiting</div>
            ) : (
              waiting.map((e, i) => {
                const pt = findPatient(e.patientId);
                return (
                  <div
                    key={e.id}
                    className="queue-tv-waiting-row"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className="queue-tv-token-badge queue-tv-token-waiting">
                      T{e.token}
                    </div>
                    <div className="queue-tv-waiting-name">
                      {pt?.name ?? "Patient"}
                    </div>
                    <div className="queue-tv-waiting-doctor">{e.doctor}</div>
                    <div className="queue-tv-waiting-pos">#{i + 1}</div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Recently Completed (bottom ticker) */}
      {completed.length > 0 && (
        <div className="queue-tv-completed">
          <span className="queue-tv-completed-label">Recently Completed:</span>
          {completed.map((e) => {
            const pt = findPatient(e.patientId);
            return (
              <span key={e.id} className="queue-tv-completed-item">
                T{e.token} · {pt?.name ?? "—"}
              </span>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <footer className="queue-tv-footer">
        <Monitor className="h-4 w-4 opacity-60" />
        <span>Queue auto-refreshes every 3 seconds</span>
        <span className="queue-tv-footer-dot" />
        <span>
          Powered by <strong>Shifa HMS</strong>
        </span>
      </footer>
    </div>
  );
}
