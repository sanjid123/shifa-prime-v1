// HMAC session token - swap-ready for Firebase custom claims / server session.
const SECRET_KEY = "shifa.security.installSecret";

function getSecret(): string {
  // Use static environment secret if configured, to allow session verification across devices.
  const envSecret = import.meta.env.VITE_JWT_SECRET;
  if (envSecret) return envSecret;

  if (typeof window === "undefined") return "ssr";
  let s = localStorage.getItem(SECRET_KEY);
  if (!s) {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    s = Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(SECRET_KEY, s);
  }
  return s;
}

async function hmac(msg: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(getSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function issueToken(role: string, username: string, sessionId: string): Promise<string> {
  const payload = `${role}|${username}|${sessionId}|${Date.now()}`;
  const sig = await hmac(payload);
  return `${btoa(payload)}.${sig}`;
}
export async function verifyToken(token: string, role: string, username: string, sessionId: string): Promise<boolean> {
  try {
    const [b64, sig] = token.split(".");
    if (!b64 || !sig) return false;
    const payload = atob(b64);
    const [r, u, s] = payload.split("|");
    if (r !== role || u !== username || s !== sessionId) return false;
    const expected = await hmac(payload);
    return expected === sig;
  } catch { return false; }
}
