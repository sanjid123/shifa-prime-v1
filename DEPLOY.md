# Deployment


## 2. Static IP hosting (offline-first, LAN)

The app is fully client-side; any static host works.

```bash
bun run build
# serves the built /dist/client folder
```

Point the static IP to a lightweight server:
```
caddy file-server --root ./dist/client --listen :80
```

Because the app persists to `localStorage`, users can operate offline. When online, the nightly scheduler (default 22:00) pushes a snapshot via the configured backend adapter.

## 3. Firebase back-end (swap-in)

1. `firebase login && firebase init` (Hosting, Firestore, Storage, optional Functions).
2. Add config to `.env`:
   ```
   VITE_BACKEND=firebase
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_APP_ID=...
   ```
3. Implement `src/lib/backend/firebase.ts` (Firestore for `snapshots/`, Cloud Function for HIBP proxy + server-session validation).
4. Deploy:
   ```
   firebase deploy --only hosting,firestore,functions
   ```

## 4. Google Drive backup

The in-app Google Drive button downloads the JSON snapshot and opens Drive; automatic uploads require Drive OAuth. After Firebase is live, use a Cloud Function with the Drive API + a service account, or per-clinic OAuth (`https://www.googleapis.com/auth/drive.file`).

## 5. PWA / installability

`public/manifest.webmanifest` already ships. When you want true offline (service worker + background sync), add `vite-plugin-pwa` with a guarded registration wrapper (never register in dev). This is intentionally deferred — the app already works offline via `localStorage`.

## 6. Environment matrix

| Variable | Purpose |
|---|---|
| `VITE_BACKEND` | `local` (default) or `firebase` |
| `VITE_SYNC_HOUR` | Default nightly sync hour (0-23), overridable per-clinic in Admin |
| `VITE_FIREBASE_*` | Firebase client config |
