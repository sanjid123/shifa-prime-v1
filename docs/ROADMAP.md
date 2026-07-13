# Roadmap

Tracked but not built in the current pass. Each item needs backend wiring or external data.

## Clinical
- ICD-10 lookup + structured diagnosis capture
- Drug interaction & LASA warning database at prescription and dispensing time
- Prescription templates per specialty
- Visit lifecycle state machine enforced in Firestore

## Pharmacy
- FEFO batch picking, expiry auto-block
- Reorder alerts, wastage log, stock reconciliation

## Billing / GST
- Separate gap-less invoice series per department
- Full payment modes: Cash, Card, UPI, Insurance, Credit (with part-payments & refunds)
- HSN-wise GSTR-1 & GSTR-3B JSON export
- e-Invoice-ready IRN payload
- TDS on visiting-doctor payouts + commission ledger
- Day-close: cash drawer reconciliation, shift handover, locked daybook

## Platform
- True offline PWA (vite-plugin-pwa + background sync)
- Multi-branch scoping (`clinic_id` on every table)
- WebUSB thermal-printer support
- Playwright smoke suite + CI gate before deploy
- Role-based dashboards with real KPIs (footfall, revenue, TAT, stock turns)
