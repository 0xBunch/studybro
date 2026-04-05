import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthenticated } from "@/lib/admin-session";
import { invalidateTutorCache } from "@/lib/tutors";

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, name, description, avatar, systemPrompt } = body;

    if (!id || !name || !description || !avatar || !systemPrompt) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    const tutor = await prisma.tutor.create({
      data: {
        id,
        name,
        description,
        avatar,
        systemPrompt,
        sortOrder,
        enabled: true,
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
