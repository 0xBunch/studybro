/**
 * Seeds a single persona JSON file into the DB.
 * Used by the churro-tutor-protocol skill (Option 2 handoff).
 *
 * Usage:
 *   npx tsx scripts/seed-one-persona.ts prisma/new-personas/keith-morrison.json
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "fs";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npx tsx scripts/seed-one-persona.ts <path-to-json>");
    process.exit(1);
  }

  const raw = readFileSync(filePath, "utf-8");
  const persona = JSON.parse(raw);

  // Strip _sources field if present (metadata, not a DB column)
  delete persona._sources;

  const requiredFields = ["id", "name", "description", "avatar"];
  for (const f of requiredFields) {
    if (!persona[f]) {
      console.error(`Missing required field: ${f}`);
      process.exit(1);
    }
  }

  if (!/^[a-z0-9-]+$/.test(persona.id)) {
    console.error(
      "Invalid id: must be lowercase letters, numbers, and hyphens only"
    );
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const existing = await prisma.tutor.findUnique({ where: { id: persona.id } });

  const data = {
    id: persona.id,
    name: persona.name,
    description: persona.description,
    avatar: persona.avatar,
    image: persona.image ?? null,
    scene: persona.scene ?? null,
    systemPrompt: persona.systemPrompt ?? "",
    identity: persona.identity ?? "",
    voiceTraits: persona.voiceTraits ?? [],
    antiPatterns: persona.antiPatterns ?? [],
    goldenLines: persona.goldenLines ?? {},
    vocabulary: persona.vocabulary ?? [],
    glossary: persona.glossary ?? {},
    teachingArc: persona.teachingArc ?? {},
    liveContext: persona.liveContext ?? null,
    webSearchEnabled: Boolean(persona.webSearchEnabled),
    enabled: persona.enabled !== false,
  };

  if (existing) {
    console.log(`Updating existing tutor: ${persona.id}`);
    await prisma.tutor.update({
      where: { id: persona.id },
      data,
    });
  } else {
    // Calculate next sort order
    const lastTutor = await prisma.tutor.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const sortOrder = (lastTutor?.sortOrder ?? -1) + 1;
    console.log(`Creating new tutor: ${persona.id}`);
    await prisma.tutor.create({
      data: { ...data, sortOrder },
    });
  }

  await prisma.$disconnect();
  console.log(`✓ Seeded: ${persona.name}`);
  console.log(`  Visit https://churro.academy/admin/tutors/${persona.id} to review`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
