/**
 * Uses Claude to extract a structured Glossary from each existing tutor's
 * current layers (identity + voiceTraits + vocabulary). Saves to
 * prisma/glossaries.json for human review before seeding.
 *
 * Run: npx tsx scripts/backfill-glossaries.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { writeFileSync } from "fs";
import Anthropic from "@anthropic-ai/sdk";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const GLOSSARY_PROMPT = `You are extracting a structured character glossary from an existing tutor persona.

You will receive a tutor's identity, voice traits, and vocabulary. Return ONLY raw JSON (no code fences) matching this exact shape:

{
  "catchphrases": [
    { "phrase": "exact phrase in quotes", "usage": "when/how it's deployed" }
  ],
  "relationships": [
    { "name": "character name", "role": "their relationship role", "notes": "how the tutor references them" }
  ],
  "domainKnowledge": ["topic bank 1", "topic bank 2", ...],
  "settings": ["physical place 1", "physical place 2", ...],
  "eraAnchors": {
    "years": "YYYY-YYYY",
    "allowedCulturalRange": "description of allowable cultural references"
  }
}

Rules:
- Only include eraAnchors if the character is specifically locked to a time period (e.g. Jared Vennett=2008, Socrates=ancient Greece). Otherwise omit.
- catchphrases should include usage notes (sparingly, when excited, rarely deploy).
- relationships should be named people/characters the tutor would reference.
- domainKnowledge are topic banks — things the character knows well (e.g. "2008 financial crisis", "Die Hard trivia").
- settings are physical places the character exists in (e.g. "Brooklyn 99th precinct", "Wall Street trading floor").
- Aim for 3-8 entries per list. Be specific, not generic.

Return ONLY the JSON.`;

interface Tutor {
  id: string;
  name: string;
  identity: string;
  voiceTraits: unknown;
  vocabulary: unknown;
}

async function extractGlossary(tutor: Tutor): Promise<unknown> {
  console.log(`\nExtracting glossary for ${tutor.name}...`);

  const context = `Tutor: ${tutor.name}

IDENTITY:
${tutor.identity}

VOICE TRAITS:
${JSON.stringify(tutor.voiceTraits, null, 2)}

VOCABULARY BANK:
${JSON.stringify(tutor.vocabulary, null, 2)}`;

  const response = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: GLOSSARY_PROMPT,
    messages: [{ role: "user", content: context }],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  let text = content.text.trim();
  text = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");

  try {
    const parsed = JSON.parse(text);
    console.log(`  ✓ extracted`);
    return parsed;
  } catch (err) {
    console.error(`  ✗ JSON parse failed:`, err);
    console.error("Raw:", text.slice(0, 500));
    throw err;
  }
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const tutors = await prisma.tutor.findMany({
    orderBy: { sortOrder: "asc" },
  });

  const results: Record<string, unknown> = {};
  for (const t of tutors) {
    const glossary = await extractGlossary({
      id: t.id,
      name: t.name,
      identity: t.identity,
      voiceTraits: t.voiceTraits,
      vocabulary: t.vocabulary,
    });
    results[t.id] = glossary;
  }

  writeFileSync("prisma/glossaries.json", JSON.stringify(results, null, 2));
  console.log(`\n✓ Saved to prisma/glossaries.json`);
  console.log(`  ${tutors.length} glossaries extracted`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
