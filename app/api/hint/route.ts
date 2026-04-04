import { NextRequest, NextResponse } from "next/server";
import { claude } from "@/lib/claude";

export async function POST(req: NextRequest) {
  try {
    const { answer, correctAnswer, definition } = await req.json();

    if (!answer || !correctAnswer || !definition) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const response = await claude.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 150,
      system:
        "You are a study helper. A student is trying to recall a term from its definition. They got it wrong. Give a short, helpful clue (1-2 sentences) that nudges them toward the correct answer WITHOUT revealing it directly. Be encouraging.",
      messages: [
        {
          role: "user",
          content: `Definition: "${definition}"\nCorrect term: "${correctAnswer}"\nStudent's guess: "${answer}"\n\nGive a clue:`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    return NextResponse.json({ hint: content.text });
  } catch (error) {
    console.error("POST /api/hint error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
