import { NextRequest, NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const sessionId = await getOrCreateSession();
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
        sessionId,
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
