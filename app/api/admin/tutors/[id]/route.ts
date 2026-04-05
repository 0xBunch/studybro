import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthenticated } from "@/lib/admin-session";
import { invalidateTutorCache } from "@/lib/tutors";

// GET: fetch a single tutor (used by skill upgrade/audit modes)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tutor = await prisma.tutor.findUnique({ where: { id } });
  if (!tutor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ tutor });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    // Whitelist of updatable fields
    const updates: Record<string, unknown> = {};
    if (typeof body.name === "string") updates.name = body.name;
    if (typeof body.description === "string") updates.description = body.description;
    if (typeof body.avatar === "string") updates.avatar = body.avatar;
    if (typeof body.systemPrompt === "string") updates.systemPrompt = body.systemPrompt;
    if (typeof body.sortOrder === "number") updates.sortOrder = body.sortOrder;
    if (typeof body.enabled === "boolean") updates.enabled = body.enabled;
    // v2 persona layers
    if (typeof body.identity === "string") updates.identity = body.identity;
    if (Array.isArray(body.voiceTraits)) updates.voiceTraits = body.voiceTraits;
    if (Array.isArray(body.antiPatterns)) updates.antiPatterns = body.antiPatterns;
    if (Array.isArray(body.vocabulary)) updates.vocabulary = body.vocabulary;
    if (body.glossary && typeof body.glossary === "object")
      updates.glossary = body.glossary;
    if (body.goldenLines && typeof body.goldenLines === "object")
      updates.goldenLines = body.goldenLines;
    if (body.teachingArc && typeof body.teachingArc === "object")
      updates.teachingArc = body.teachingArc;
    if ("liveContext" in body) updates.liveContext = body.liveContext;
    if (typeof body.webSearchEnabled === "boolean")
      updates.webSearchEnabled = body.webSearchEnabled;

    const tutor = await prisma.tutor.update({
      where: { id },
      data: updates,
    });

    invalidateTutorCache();
    return NextResponse.json({ id: tutor.id });
  } catch (error) {
    console.error("PATCH /api/admin/tutors/[id] error:", error);
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
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await prisma.tutor.delete({ where: { id } });
    invalidateTutorCache();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/tutors/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
