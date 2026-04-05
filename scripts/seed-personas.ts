/**
 * Seeds the distilled persona layers into the DB. Run after distill-personas.ts.
 * Preserves admin-edited fields unless --force is passed.
 *
 * Run:  npx tsx scripts/seed-personas.ts [--force]
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "fs";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const force = process.argv.includes("--force");

// Per-tutor live context configs — distillation didn't know about this layer
const LIVE_CONTEXTS: Record<
  string,
  {
    source: string;
    config: Record<string, unknown>;
    framingPrompt: string;
  } | null
> = {
  socrates: {
    source: "time",
    config: {},
    framingPrompt:
      "Reference the time of day or day of the week naturally (it's evening, it's a weekday afternoon, etc.) — like a philosopher noting the rhythm of daily life.",
  },
  "lonely-island": {
    source: "reddit",
    config: { subreddit: "LiveFromNewYork", limit: 5 },
    framingPrompt:
      "The top threads in the SNL fan community right now. Riff on them if one lines up with the concept — 'did you see that Kyle Mooney thing blowing up, reminds me of...'",
  },
  seinfeld: {
    source: "weather",
    config: { location: "nyc" },
    framingPrompt:
      "Current NYC weather. Weave into observational bits — 'what's the DEAL with this weather?' or 'it's [temp] degrees, which is technically sweater weather but also sandal weather, which is madness.'",
  },
  "ryland-grace": {
    source: "news",
    config: { category: "Science" },
    framingPrompt:
      "Recent real science headlines. Get excited about them, connect to the concept being taught if possible — 'oh man, did you see that JWST thing? That's basically the same principle as what we're talking about.'",
  },
  "jared-vennett": {
    source: "markets",
    config: {},
    framingPrompt:
      "Today's actual market numbers — but riff on them through 2008 nostalgia glasses. 'S&P at [x]? In 2008 it was [y]. Things have changed. The concepts haven't.'",
  },
  "weekend-update": {
    source: "multi-news",
    config: {},
    framingPrompt:
      "Multi-category news headlines. Pick one topically relevant to the concept and bridge from it. 'In news today, [headline]. Speaking of things that don't make sense, let's talk about [concept].'",
  },
  "jean-ralphio": {
    source: "reddit",
    config: { subreddit: "popculturechat", limit: 5 },
    framingPrompt:
      "What Hollywood is buzzing about. Reference a trending story like you're at the club and just heard it — 'did you SEE what happened with [celeb]? It's INSANE.' Segue into the concept.",
  },
  hdtgm: {
    source: "reddit",
    config: { subreddit: "movies", limit: 5 },
    framingPrompt:
      "Movies people are currently freaking out about. Mantzoukas should be ABSOLUTELY LOSING IT about one of them. Bridge into the concept by comparing it to an absurd movie plot.",
  },
  "jake-peralta": {
    source: "weather",
    config: { location: "brooklyn" },
    framingPrompt:
      "Current Brooklyn weather — Peralta commenting on it for 'patrol today.' 'It's [temp] out there which means it's a TWO-hoodie day, rookie.'",
  },
  "how-long-gone": {
    source: "reddit",
    config: { subreddit: "malefashionadvice", limit: 5 },
    framingPrompt:
      "What's trending in culture/fashion today. CB and TJ rate it and debate whether it's 'over' or 'the move.' Bridge into the concept as if it's another cultural product they're reviewing.",
  },
};

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const distilled = JSON.parse(
    readFileSync("prisma/distilled-personas.json", "utf-8")
  ) as Record<string, {
    identity: string;
    voiceTraits: string[];
    antiPatterns: string[];
    goldenLines: Record<string, string>;
    vocabulary: string[];
    teachingArc: Record<string, unknown>;
  }>;

  console.log(`Seeding ${Object.keys(distilled).length} distilled personas...`);
  if (force) console.log("(--force: overwriting all fields)");

  for (const [id, persona] of Object.entries(distilled)) {
    const existing = await prisma.tutor.findUnique({ where: { id } });
    if (!existing) {
      console.log(`  ✗ ${id} not found in DB, skipping`);
      continue;
    }

    // Don't clobber admin edits unless --force
    if (!force && existing.identity && existing.identity.length > 0) {
      console.log(`  - ${id} already has identity, skipping (use --force)`);
      continue;
    }

    const live = LIVE_CONTEXTS[id] ?? null;

    await prisma.tutor.update({
      where: { id },
      data: {
        identity: persona.identity,
        voiceTraits: persona.voiceTraits,
        antiPatterns: persona.antiPatterns,
        goldenLines: persona.goldenLines,
        vocabulary: persona.vocabulary,
        teachingArc: persona.teachingArc,
        liveContext: live,
      },
    });
    console.log(`  ✓ ${id}`);
  }

  await prisma.$disconnect();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
