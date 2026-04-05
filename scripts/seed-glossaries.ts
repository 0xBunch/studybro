/**
 * Seeds glossaries from prisma/glossaries.json into the DB.
 * Run after backfill-glossaries.ts and reviewing the JSON.
 *
 * Run:  npx tsx scripts/seed-glossaries.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "fs";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const glossaries = JSON.parse(
    readFileSync("prisma/glossaries.json", "utf-8")
  ) as Record<string, unknown>;

  console.log(`Seeding ${Object.keys(glossaries).length} glossaries...`);

  for (const [id, glossary] of Object.entries(glossaries)) {
    await prisma.tutor.update({
      where: { id },
      data: { glossary: glossary as object },
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
