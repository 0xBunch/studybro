import { NextRequest, NextResponse } from "next/server";
import { getOrCreateSession, EXAMPLE_SESSION_ID } from "@/lib/session";
import { prisma } from "@/lib/db";
import {
  generateQuiz,
  generateFlashcards,
  generateReverseFlashcards,
} from "@/lib/claude";

export async function POST(req: NextRequest) {
  try {
    const sessionId = await getOrCreateSession();
    const { studySetId, type, config } = await req.json();

    if (!studySetId || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Allow reading concepts from the example study set OR the visitor's own study sets
    const studySet = await prisma.studySet.findFirst({
      where: {
        id: studySetId,
        OR: [{ sessionId }, { sessionId: EXAMPLE_SESSION_ID }],
      },
    });
    if (!studySet) {
      return NextResponse.json({ error: "Study set not found" }, { status: 404 });
    }

    const uploads = await prisma.upload.findMany({
      where: {
        studySetId,
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

    // Tests are always owned by the visitor's session, even if reading from the example
    const test = await prisma.test.create({
      data: {
        studySetId,
        sessionId,
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
          sessionId,
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
