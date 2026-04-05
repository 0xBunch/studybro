import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthenticated } from "@/lib/admin-session";
import { invalidateTutorCache } from "@/lib/tutors";

// GET: list all tutors (for skill upgrade/audit mode)
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tutors = await prisma.tutor.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ tutors });
}

// POST: create a new tutor (accepts full v2 persona for skill handoff)
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, name, description, avatar } = body;

    if (!id || !name || !description || !avatar) {
      return NextResponse.json(
        { error: "Missing required fields (id, name, description, avatar)" },
        { status: 400 }
      );
    }

    // Validate ID format
    if (!/^[a-z0-9-]+$/.test(id)) {
      return NextResponse.json(
        { error: "ID must be lowercase letters, numbers, and hyphens only" },
        { status: 400 }
      );
    }

    const existing = await prisma.tutor.findUnique({ where: { id } });
    if (existing) {
      return NextResponse.json(
        { error: `Tutor with id "${id}" already exists` },
        { status: 409 }
      );
    }

    // Calculate next sort order
    const lastTutor = await prisma.tutor.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const sortOrder = (lastTutor?.sortOrder ?? -1) + 1;

    // Build full v2 persona data, with fallbacks
    const tutor = await prisma.tutor.create({
      data: {
        id,
        name,
        description,
        avatar,
        image: body.image ?? null,
        scene: body.scene ?? null,
        systemPrompt: body.systemPrompt ?? "", // legacy, optional
        identity: typeof body.identity === "string" ? body.identity : "",
        voiceTraits: Array.isArray(body.voiceTraits) ? body.voiceTraits : [],
        antiPatterns: Array.isArray(body.antiPatterns) ? body.antiPatterns : [],
        goldenLines:
          body.goldenLines && typeof body.goldenLines === "object"
            ? body.goldenLines
            : {},
        vocabulary: Array.isArray(body.vocabulary) ? body.vocabulary : [],
        glossary:
          body.glossary && typeof body.glossary === "object" ? body.glossary : {},
        teachingArc:
          body.teachingArc && typeof body.teachingArc === "object"
            ? body.teachingArc
            : {},
        liveContext: body.liveContext ?? null,
        webSearchEnabled: Boolean(body.webSearchEnabled),
        sortOrder,
        enabled: body.enabled !== false,
      },
    });

    invalidateTutorCache();
    return NextResponse.json({ id: tutor.id });
  } catch (error) {
    console.error("POST /api/admin/tutors error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
