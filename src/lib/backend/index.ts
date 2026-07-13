// Backend adapter. Swap `local` for `firebase` once Firebase is wired.
// Selection via VITE_BACKEND env ("local" | "firebase"). Default: local.
import type { Snapshot } from "@/lib/mock/data";
import { localBackend } from "./local";
import { firebaseBackend } from "./firebase";

export interface Backend {
  name: string;
  pushSnapshot(snap: Snapshot): Promise<{ syncedAt: string; bytes: number }>;
  pullSnapshot(): Promise<Snapshot | null>;
  validateSession(token: string): Promise<boolean>;
  checkPasswordBreached(pw: string): Promise<boolean>;
}

const which = (import.meta.env.VITE_BACKEND as string | undefined) ?? "local";
export const backend: Backend = which === "firebase" ? firebaseBackend : localBackend;
