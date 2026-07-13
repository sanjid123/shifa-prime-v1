# SHIFA CLINIC HMS v1.0

Progressive Web App for **Shifa Clinic** — offline-capable Hospital Management System covering Front Office, Doctor EMR, Lab (LIS), Pharmacy (POS + Inventory) and Administrator / Accountant workspaces.

## Stack
- **TanStack Start** (React 19, Vite 7) with SSR-safe file-based routing.
- **Tailwind v4** (CSS-first tokens in `src/styles.css`).
- **shadcn/ui** primitives, Recharts for KPI dashboards.
- **@dnd-kit** for the appointment calendar.
- Session-scoped mock data layer in `src/lib/mock/data.ts` with a swap-ready **backend adapter** (`src/lib/backend/`) — flip `VITE_BACKEND=firebase` once Firebase is wired.

## Roles
| Role | Access |
|---|---|
| Administrator | Full write, approvals, backup/restore, audit |
| Accountant | Super-user, read-only across all modules |
| Front Office | Registration, OP tickets, appointments, procedure/OP billing |
| Doctor | EMR, prescriptions, lab requisitions |
| Lab | Sample tracking, result entry, LIS validation |
| Pharmacy | POS, inventory ERP, GST |

Unified **UHID (MRN)** across every module; single active session per role enforced with HMAC-signed tokens (`src/lib/security/token.ts`).

## Local development

```bash
bun install
bun run dev        # http://localhost:8080
bun run build      # production build
```

## Offline & nightly sync

- Local storage keeps all working data.
- The nightly scheduler (`src/lib/sync/nightly.ts`) checks every 5 min and pushes a full snapshot via the backend adapter after the configured hour (default **22:00**).
- Configurable per-clinic in **Admin → Backup**: schedule (Daily / Weekly / Monthly / Off), sync hour, manual "Sync now", Google Drive export.

## Security

- Single active session per role (`src/lib/session.ts`).
- HMAC-signed session tokens (SHA-256), swap target for Firebase custom claims.
- Password policy + local HIBP heuristic (`src/lib/security/policy.ts`).
- Inactivity auto-logout (default 15 min, configurable).
- Immutable audit log with CSV export.
- Fee/discount override gate + approval notifications.

## Firebase (post-connection)

See [`DEPLOY.md`](./DEPLOY.md) for the Firebase Hosting + Firestore + Storage playbook. Only three files change on switch-over: `src/lib/backend/firebase.ts`, `.env`, and `firebase.json`.

## Roadmap

Extended clinical/financial features (ICD-10, drug interactions, FEFO batch picking, GSTR-1/3B JSON, TDS ledger, day-close reconciliation, multi-branch, Playwright CI) are tracked in [`docs/ROADMAP.md`](./docs/ROADMAP.md).

---

© Shifa Clinic · crafted with ERPconnect.in
