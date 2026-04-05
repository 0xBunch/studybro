import { NextRequest } from "next/server";
import { claude } from "@/lib/claude";
import { getTutor } from "@/lib/tutors";
import { assemblePrompt } from "@/lib/prompt-assembler";
import { computeTeachingState } from "@/lib/session-state";
import { getLiveContextForTutor } from "@/lib/tutor-context";

const WEEKEND_UPDATE_NEWSCARD_INSTRUCTIONS = `

NEWS CARDS (Weekend Update only):
Every response that introduces a new concept MUST include EXACTLY ONE news card marker on its own line, placed BEFORE [SUGGESTIONS]:
[NEWSCARD: <pun headline, 3-7 words> | <cartoon description, 1 sentence, no text in image, SFW>]

Examples:
- [NEWSCARD: Plants Are Solar Farmers Now | A cartoon sunflower in overalls holding a tiny pitchfork, bright sky]
- [NEWSCARD: Mitochondria Files For Overtime | A tiny bean-shaped cell part wearing a hardhat, clocking in at a factory]
- [NEWSCARD: Osmosis: The Great Water Heist | A cartoon water droplet sneaking past a bouncer at a nightclub labeled CELL]

The pun lands in the headline. The cartoon description is a single visual idea — keep it concrete, no text inside the image.

OPENING REQUIREMENT (MANDATORY for Weekend Update):
Your FIRST message of every session MUST open with an actual current news headline from the LIVE CONTEXT block above — delivered straight, like a real Weekend Update story, followed by a punchline that takes a shot. Political stories are fair game and ENCOURAGED — Trump is a reliable target whenever he shows up in the headlines (which is most of the time). Then bridge from that opening joke to the study concept.

Example opening structure:
JOST: This week, [real current headline about Trump or politics]. [Punchline that undercuts it.]
CHE: [Harder follow-up take.]
JOST: And speaking of things that don't make sense, let's talk about [study concept]. [Direct question to student.]

The opening news story is REQUIRED. Do not skip it. Do not soften it. This is Weekend Update — real news, real punchlines, then teaching.`;

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

    // Compute dynamic teaching state from message history
    const teachingState = computeTeachingState(messages);

    // Fetch live context for this tutor (cached 12h)
    const liveContext = await getLiveContextForTutor(tutor);

    // Assemble the layered prompt
    let systemPrompt = assemblePrompt({
      persona: tutor,
      concepts,
      weakConcepts: weakConcepts ?? [],
      messages,
      teachingState,
      liveContext,
    });

    // Weekend Update needs the newscard instructions tacked on
    if (tutor.id === "weekend-update") {
      systemPrompt += WEEKEND_UPDATE_NEWSCARD_INSTRUCTIONS;
    }

    // Conditionally add web_search tool
    const tools =
      tutor.webSearchEnabled
        ? [
            {
              type: "web_search_20250305" as const,
              name: "web_search" as const,
              max_uses: 3,
            },
          ]
        : undefined;

    const stream = await claude.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      ...(tools && { tools }),
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
