import { NextRequest } from "next/server";
import { claude } from "@/lib/claude";
import { getTutor } from "@/lib/tutors";

export async function POST(req: NextRequest) {
  try {
    const { messages, concepts, weakConcepts, tutorId } = await req.json();

    if (!messages || !concepts) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tutor = getTutor(tutorId || "socrates");
    if (!tutor) {
      return new Response(JSON.stringify({ error: "Unknown tutor" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const conceptsText = concepts
      .map(
        (c: { term: string; definition: string; category: string }) =>
          `- ${c.term} (${c.category}): ${c.definition}`
      )
      .join("\n");

    const weakText =
      weakConcepts?.length > 0
        ? `\nWEAK AREAS (from past quizzes — prioritize these):\n${weakConcepts.map((c: string) => `- ${c}`).join("\n")}`
        : "";

    const systemPrompt = `${tutor.systemPrompt}

SUBJECT CONTEXT:
Here are the key concepts from the student's study material:
${conceptsText}${weakText}`;

    const stream = await claude.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: err instanceof Error ? err.message : "Stream error" })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("POST /api/chat error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
