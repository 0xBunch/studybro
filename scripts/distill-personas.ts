/**
 * Reads each tutor from lib/tutors-seed.ts, sends their systemPrompt to Claude,
 * and asks Claude to distill it into structured persona layers. Saves the output
 * to prisma/distilled-personas.json for human review before seeding into the DB.
 *
 * Run:  npx tsx scripts/distill-personas.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { writeFileSync } from "fs";
import Anthropic from "@anthropic-ai/sdk";
import { tutors as HARDCODED_TUTORS } from "../lib/tutors-seed";

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const DISTILLATION_PROMPT = `You are distilling a tutor persona prompt into structured reusable layers.

You will receive the full text of a persona prompt. Return ONLY raw JSON (no code fences) matching this exact shape:

{
  "identity": "2-3 sentences, present tense. Who they are, where they're speaking from, what they were just doing. Vivid. Sets the scene.",
  "voiceTraits": ["5-8 short bulleted traits — tone, verbal tics, register, how they use language"],
  "antiPatterns": ["4-6 explicit 'NEVER' rules. What breaks this character? What would feel off? Be specific."],
  "goldenLines": {
    "opening": "One sample first-message line in character (1-2 sentences)",
    "correct": "One sample line when student gets something right",
    "wrong": "One sample line when student gets something wrong",
    "explain": "One sample line when giving a direct explanation",
    "transition": "One sample line transitioning between concepts",
    "closing": "One sample line wrapping up a topic"
  },
  "vocabulary": ["15-25 flat references this character would naturally drop — people, places, shows, brands, catchphrases, cultural touchstones. No sentences, just the reference word/phrase."],
  "teachingArc": {
    "openingBehavior": "How to teach in first 3 messages, in this character's voice",
    "struggleTriggers": ["2-3 signs that a student is struggling"],
    "struggleResponse": "What this character does when student is struggling (in their voice)",
    "masteryResponse": "What this character does when student is crushing it (in their voice)",
    "callbackStyle": "How this character loops back to earlier material"
  }
}

Rules:
- Pull IDENTITY, VOICE, and EXAMPLE content from the source prompt first. Only generate new content for ANTI-PATTERNS (they're usually implicit in source).
- Keep each layer tight. No fluff.
- For anti-patterns, think about what a generic AI tutor would do that this character SPECIFICALLY would never do.
- Golden lines should sound EXACTLY like the character. If you can't find good ones in the source, write them yourself using the voice traits.
- Vocabulary is a bank of references, not a sentence. e.g. "Lehman Brothers" not "reference Lehman Brothers sometimes".

Return ONLY the JSON, nothing else.`;

async function distillPersona(tutor: {
  id: string;
  name: string;
  systemPrompt: string;
}) {
  console.log(`\nDistilling ${tutor.name}...`);

  const response = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: DISTILLATION_PROMPT,
    messages: [
      {
        role: "user",
        content: `Distill this persona for "${tutor.name}":\n\n${tutor.systemPrompt}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  // Strip any markdown code fences
  let text = content.text.trim();
  text = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");

  try {
    const parsed = JSON.parse(text);
    console.log(`  ✓ distilled`);
    return parsed;
  } catch (err) {
    console.error(`  ✗ JSON parse failed for ${tutor.id}:`, err);
    console.error("Raw response:", text.slice(0, 500));
    throw err;
  }
}

async function main() {
  const results: Record<string, unknown> = {};

  for (const tutor of HARDCODED_TUTORS) {
    const distilled = await distillPersona({
      id: tutor.id,
      name: tutor.name,
      systemPrompt: tutor.systemPrompt,
    });
    results[tutor.id] = distilled;
  }

  const outPath = "prisma/distilled-personas.json";
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\n✓ Saved to ${outPath}`);
  console.log(`  ${HARDCODED_TUTORS.length} personas distilled`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
