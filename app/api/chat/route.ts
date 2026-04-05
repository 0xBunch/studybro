import { NextRequest } from "next/server";
import { claude } from "@/lib/claude";
import { getTutor } from "@/lib/tutors";
import { getCategoryHeadlines } from "@/lib/news";

export async function POST(req: NextRequest) {
  try {
    const { messages, concepts, weakConcepts, tutorId } = await req.json();

    if (!messages || !concepts) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tutor = await getTutor(tutorId || "socrates");
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

    // For Weekend Update, inject real current headlines by category so jokes can be topical
    let newsBlock = "";
    if (tutor.id === "weekend-update") {
      const categories = await getCategoryHeadlines(4);
      const nonEmpty = categories.filter((c) => c.headlines.length > 0);
      if (nonEmpty.length > 0) {
        const formatted = nonEmpty
          .map((c) => {
            const items = c.headlines
              .map(
                (h) =>
                  `  - ${h.title}${h.source ? ` [${h.source}]` : ""}${h.description ? `\n    "${h.description}"` : ""}`
              )
              .join("\n");
            return `${c.category.toUpperCase()}:\n${items}`;
          })
          .join("\n\n");
        newsBlock = `

TODAY'S REAL HEADLINES (by category — use these to set up topical jokes that bridge to the study concepts):

${formatted}

When you can, bridge from a real headline to a concept. Example: "In news today, [real headline]. Which reminds us, tonight we're talking about [concept]..." Pick headlines from the category most relevant to the concept (e.g. Science for biology, Tech for computing). Don't force every joke to use a headline, but weave them in when it lands.

NEWS CARDS:
Every response that introduces a new concept MUST include EXACTLY ONE news card marker on its own line, placed BEFORE [SUGGESTIONS]:
[NEWSCARD: <pun headline, 3-7 words> | <cartoon description, 1 sentence, no text in image, SFW>]

Examples:
- [NEWSCARD: Plants Are Solar Farmers Now | A cartoon sunflower in overalls holding a tiny pitchfork, bright sky]
- [NEWSCARD: Mitochondria Files For Overtime | A tiny bean-shaped cell part wearing a hardhat, clocking in at a factory]
- [NEWSCARD: Osmosis: The Great Water Heist | A cartoon water droplet sneaking past a bouncer at a nightclub labeled CELL]

The pun lands in the headline. The cartoon description is a single visual idea for an AI image generator — keep it concrete, no text inside the image (text gets overlaid in code).`;
      }
    }

    const systemPrompt = `${tutor.systemPrompt}

SUBJECT CONTEXT:
Here are the key concepts from the student's study material:
${conceptsText}${weakText}${newsBlock}`;

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
