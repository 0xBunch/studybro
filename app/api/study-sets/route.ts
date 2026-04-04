import { NextRequest, NextResponse } from "next/server";
import { USER_ID, USER_EMAIL, USER_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { title, description } = await req.json();

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Ensure the default user exists in the database
    await prisma.user.upsert({
      where: { id: USER_ID },
      update: {},
      create: {
        id: USER_ID,
        email: USER_EMAIL,
        name: USER_NAME,
      },
    });

    const studySet = await prisma.studySet.create({
      data: {
        userId: USER_ID,
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
