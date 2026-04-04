import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deleteByPrefix } from "@/lib/storage";
import { EXAMPLE_SESSION_ID, SESSION_TTL_DAYS } from "@/lib/session";

export async function POST(req: NextRequest) {
  // Auth via shared secret
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoff = new Date(
      Date.now() - SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
    );

    // Find expired sessions (never the example)
    const expired = await prisma.session.findMany({
      where: {
        lastSeenAt: { lt: cutoff },
        sessionId: { not: EXAMPLE_SESSION_ID },
      },
      select: { sessionId: true },
    });

    let filesDeleted = 0;
    for (const { sessionId } of expired) {
      try {
        filesDeleted += await deleteByPrefix(`${sessionId}/`);
      } catch (err) {
        console.error(`Failed to clean R2 for ${sessionId}:`, err);
      }
    }

    // Cascade delete all associated rows
    const { count: sessionsDeleted } = await prisma.session.deleteMany({
      where: {
        lastSeenAt: { lt: cutoff },
        sessionId: { not: EXAMPLE_SESSION_ID },
      },
    });

    return NextResponse.json({
      ok: true,
      sessionsDeleted,
      filesDeleted,
      cutoff: cutoff.toISOString(),
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

// GET for manual testing (same auth)
export const GET = POST;
