import { cookies } from "next/headers";
import { createHmac, timingSafeEqual, randomBytes } from "crypto";

const COOKIE_NAME = "churro_admin";
const COOKIE_TTL_DAYS = 30;

function getSecret(): string {
  const secret =
    process.env.ADMIN_PASSWORD || process.env.AUTH_SECRET || "dev-secret";
  return secret;
}

/**
 * Signed cookie: <timestamp>.<hmac(timestamp, secret)>
 * This makes the cookie tamper-proof without storing session state server-side.
 */
function sign(value: string): string {
  const hmac = createHmac("sha256", getSecret());
  hmac.update(value);
  return hmac.digest("hex");
}

function verify(value: string, signature: string): boolean {
  const expected = sign(value);
  try {
    return timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

export async function setAdminCookie(): Promise<void> {
  const cookieStore = await cookies();
  const timestamp = Date.now().toString();
  const signature = sign(timestamp);
  const value = `${timestamp}.${signature}`;

  cookieStore.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_TTL_DAYS * 24 * 60 * 60,
    path: "/",
  });
}

export async function clearAdminCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return false;

  const [timestamp, signature] = raw.split(".");
  if (!timestamp || !signature) return false;

  if (!verify(timestamp, signature)) return false;

  // Check expiration
  const age = Date.now() - parseInt(timestamp, 10);
  const maxAge = COOKIE_TTL_DAYS * 24 * 60 * 60 * 1000;
  if (age > maxAge) return false;

  return true;
}

export function checkPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    console.error("ADMIN_PASSWORD env var not set");
    return false;
  }
  // Constant-time comparison
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Still do a comparison to avoid timing leak
    timingSafeEqual(randomBytes(32), randomBytes(32));
    return false;
  }
  return timingSafeEqual(a, b);
}
