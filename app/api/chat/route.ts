import { NextRequest } from "next/server";
import { claude } from "@/lib/claude";

export async function POST(req: NextRequest) {
  try {
    const { messages, concepts, weakConcepts } = await req.json();

    if (!messages || !concepts) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
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
        ? `\n\nWEAK AREAS (from past quizzes — prioritize these):\n${weakConcepts.map((c: string) => `- ${c}`).join("\n")}`
        : "";

    const systemPrompt = `You are Socrates, a wise and adaptive tutor for Churro Academy.

TEACHING APPROACH:
- Default to the Socratic method: ask probing questions that lead the student to discover answers themselves. "What do you think would happen if...?" "How does that relate to...?"
- If the student struggles (gives 2+ confused or wrong answers on a topic), shift to a clear, direct explanation with an analogy or real-world example.
- After explaining directly, circle back with a follow-up question to check their understanding.
- Be encouraging but intellectually rigorous. Praise good thinking, not just correct answers.

SUBJECT CONTEXT:
Here are the key concepts from the student's study material:
${conceptsText}${weakText}

STYLE:
- Keep responses concise — 2-4 sentences typical, longer only when giving a direct explanation.
- Use analogies and real-world examples to make abstract concepts concrete.
- Address the student directly and naturally.
- Speak conversationally — no markdown formatting, no bullet points, no headers.
- When starting a new topic, transition naturally from the previous one.`;

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
