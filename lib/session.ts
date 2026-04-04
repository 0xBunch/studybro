import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "churro_session";
export const SESSION_TTL_DAYS = 7;
export const EXAMPLE_SESSION_ID = "example";

/**
 * Reads the session cookie, creating a new DB session if needed,
 * and bumps `lastSeenAt` so the 7-day sliding window stays fresh.
 * Returns the sessionId.
 */
export async function getOrCreateSession(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(SESSION_COOKIE)?.value;

  if (existing && existing !== EXAMPLE_SESSION_ID) {
    // Try to refresh the existing session
    const session = await prisma.session.findUnique({
      where: { sessionId: existing },
    });

    if (session) {
      // Bump lastSeenAt to extend the sliding window
      await prisma.session.update({
        where: { sessionId: existing },
        data: { lastSeenAt: new Date() },
      });

      // Refresh cookie expiration too
      cookieStore.set(SESSION_COOKIE, existing, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
        path: "/",
      });
      return existing;
    }
    // Session in cookie but not in DB (expired/cleaned up) — fall through to create new
  }

  // Create a new session
  const sessionId = `sess_${randomUUID()}`;
  await prisma.session.create({
    data: { sessionId },
  });

  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
    path: "/",
  });

  return sessionId;
}

/**
 * Read-only version: returns the sessionId from the cookie,
 * or null if none exists. Does NOT create a session or update lastSeenAt.
 * Use this when you only need to know whether a session exists.
 */
export async function getSessionIdOrNull(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}
