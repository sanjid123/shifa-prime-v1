// Firebase backend adapter implementation.
// Interface matches ./local.ts so backend selection is transparent.
import type { Snapshot } from "@/lib/mock/data";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import type { Backend } from "./index";
import { localBackend } from "./local";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if credentials are provided in the environment
const isConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

let db: ReturnType<typeof getFirestore> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;

if (isConfigured) {
  try {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    
    // Auto-authenticate anonymously to satisfy Firestore secure rules
    signInAnonymously(auth)
      .then(() => {
        console.log("[firebase-backend] Silently authenticated session anonymously.");
      })
      .catch((err) => {
        console.error("[firebase-backend] Silent authentication failed:", err);
      });
  } catch (err) {
    console.error("[firebase-backend] Failed to initialize Firebase SDK:", err);
  }
} else {
  console.warn(
    "[firebase-backend] Firebase credentials not configured in .env file. Falling back to local storage.",
  );
}

async function sha1(str: string): Promise<string> {
  const enc = new TextEncoder();
  const buffer = await crypto.subtle.digest("SHA-1", enc.encode(str));
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export const firebaseBackend: Backend = {
  name: "firebase",
  async pushSnapshot(snap: Snapshot) {
    if (!db) {
      console.warn("[firebase-backend] Firebase not active. Pushing snapshot to local storage instead.");
      return localBackend.pushSnapshot(snap);
    }
    try {
      const payload = JSON.stringify(snap);
      const syncedAt = new Date().toISOString();
      const dateKey = syncedAt.split("T")[0]; // YYYY-MM-DD

      // 1. Store/update the latest snapshot document
      await setDoc(doc(db, "snapshots", "latest"), {
        data: payload,
        syncedAt,
        version: "1.0",
      });

      // 2. Keep a rolling history of daily snapshots for backup ledger
      await setDoc(doc(db, "history", dateKey), {
        data: payload,
        syncedAt,
        version: "1.0",
      });

      return { syncedAt, bytes: payload.length };
    } catch (err) {
      console.error("[firebase-backend] Firestore push failed, falling back to local:", err);
      // Fallback to local push so work is not lost offline
      return localBackend.pushSnapshot(snap);
    }
  },

  async pullSnapshot() {
    if (!db) {
      console.warn("[firebase-backend] Firebase not active. Pulling snapshot from local storage.");
      return localBackend.pullSnapshot();
    }
    try {
      const docRef = doc(db, "snapshots", "latest");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const raw = docSnap.data().data;
        return raw ? (JSON.parse(raw) as Snapshot) : null;
      }
      return null;
    } catch (err) {
      console.error("[firebase-backend] Firestore pull failed, falling back to local:", err);
      return localBackend.pullSnapshot();
    }
  },

  async validateSession(token: string) {
    // Validate session token structure
    try {
      const parts = token.split(".");
      return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
    } catch {
      return false;
    }
  },

  async checkPasswordBreached(pw: string) {
    try {
      const hash = await sha1(pw);
      const prefix = hash.slice(0, 5);
      const suffix = hash.slice(5);
      
      const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      if (!res.ok) throw new Error(`HIBP API returned status ${res.status}`);
      
      const text = await res.text();
      const lines = text.split("\n");
      return lines.some((line) => line.split(":")[0].trim() === suffix);
    } catch (err) {
      console.error("[firebase-backend] HIBP range check failed, falling back to local heuristics:", err);
      return localBackend.checkPasswordBreached(pw);
    }
  },
};
