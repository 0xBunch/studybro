import { NextRequest, NextResponse } from "next/server";
import { getOrCreateSession, EXAMPLE_SESSION_ID } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionId = await getOrCreateSession();
    const { id } = await params;
    const { title, description } = await req.json();

    // Guard: the example study set is read-only
    const existing = await prisma.studySet.findUnique({
      where: { id },
      select: { sessionId: true },
    });
    if (existing?.sessionId === EXAMPLE_SESSION_ID) {
      return NextResponse.json(
        { error: "Example study set is read-only" },
        { status: 403 }
      );
    }

    const studySet = await prisma.studySet.updateMany({
      where: { id, sessionId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description.trim() || null }),
      },
    });

    if (studySet.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/study-sets/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionId = await getOrCreateSession();
    const { id } = await params;

    // Guard: can't delete the example
    const existing = await prisma.studySet.findUnique({
      where: { id },
      select: { sessionId: true },
    });
    if (existing?.sessionId === EXAMPLE_SESSION_ID) {
      return NextResponse.json(
        { error: "Example study set is read-only" },
        { status: 403 }
      );
    }

    const result = await prisma.studySet.deleteMany({
      where: { id, sessionId },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/study-sets/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
