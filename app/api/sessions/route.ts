import { NextRequest, NextResponse } from "next/server";
import { USER_ID } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { testId, score, totalQuestions, results, weakConcepts } =
      await req.json();

    if (!testId || results === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const testSession = await prisma.testSession.create({
      data: {
        testId,
        userId: USER_ID,
        score,
        totalQuestions,
        results,
        weakConcepts: weakConcepts || [],
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ id: testSession.id });
  } catch (error) {
    console.error("POST /api/sessions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
