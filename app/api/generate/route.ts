import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  generateQuiz,
  generateFlashcards,
  generateReverseFlashcards,
} from "@/lib/claude";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { studySetId, type, config } = await req.json();

    if (!studySetId || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const uploads = await prisma.upload.findMany({
      where: {
        studySetId,
        userId: session.user.id,
        processed: true,
      },
    });

    if (uploads.length === 0) {
      return NextResponse.json(
        { error: "No processed uploads found" },
        { status: 400 }
      );
    }

    const allConcepts = uploads.flatMap((u) => {
      const data = u.concepts as { concepts?: { term: string; definition: string; category: string }[] };
      return data?.concepts || [];
    });

    let questions;

    switch (type) {
      case "QUIZ": {
        const count = config?.questionCount || 10;
        const result = await generateQuiz(allConcepts, count);
        questions = result.questions;
        break;
      }
      case "FLASHCARD": {
        const result = await generateFlashcards(allConcepts);
        questions = result.cards;
        break;
      }
      case "REVERSE_FLASHCARD": {
        const result = await generateReverseFlashcards(allConcepts);
        questions = result.cards;
        break;
      }
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const test = await prisma.test.create({
      data: {
        studySetId,
        userId: session.user.id,
        type,
        config: config || {},
        questions: questions as unknown as object,
      },
    });

    if (type === "FLASHCARD" || type === "REVERSE_FLASHCARD") {
      const cards = questions as { front: string; back: string; concept: string }[];
      await prisma.card.createMany({
        data: cards.map((card) => ({
          testId: test.id,
          userId: session.user.id,
          front: card.front,
          back: card.back,
        })),
      });
    }

    return NextResponse.json({ testId: test.id, questions });
  } catch (error) {
    console.error("POST /api/generate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
