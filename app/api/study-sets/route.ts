import { NextRequest, NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const sessionId = await getOrCreateSession();
    const { title, description } = await req.json();

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const studySet = await prisma.studySet.create({
      data: {
        sessionId,
        title: title.trim(),
        description: description?.trim() || null,
      },
    });

    return NextResponse.json({ id: studySet.id });
  } catch (error) {
    console.error("POST /api/study-sets error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
