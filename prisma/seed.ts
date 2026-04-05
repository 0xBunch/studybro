import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { tutors as HARDCODED_TUTORS } from "../lib/tutors-seed";

const EXAMPLE_SESSION_ID = "example";

const EXAMPLE_CONCEPTS = [
  // Photosynthesis
  {
    term: "Photosynthesis",
    definition:
      "The process by which plants convert light energy, water, and carbon dioxide into glucose and oxygen.",
    category: "Photosynthesis",
  },
  {
    term: "Chloroplast",
    definition:
      "The organelle in plant cells where photosynthesis takes place. Contains chlorophyll and has its own DNA.",
    category: "Photosynthesis",
  },
  {
    term: "Chlorophyll",
    definition:
      "The green pigment in chloroplasts that absorbs light energy, primarily in the red and blue wavelengths.",
    category: "Photosynthesis",
  },
  {
    term: "Light-Dependent Reactions",
    definition:
      "The first stage of photosynthesis, occurring in the thylakoid membranes. Converts light energy into ATP and NADPH, releasing oxygen.",
    category: "Photosynthesis",
  },
  {
    term: "Calvin Cycle",
    definition:
      "The light-independent reactions of photosynthesis, occurring in the stroma. Uses ATP and NADPH to fix CO2 into glucose.",
    category: "Photosynthesis",
  },
  {
    term: "Stomata",
    definition:
      "Tiny pores on the underside of leaves that allow CO2 in and water vapor/oxygen out. Open and close via guard cells.",
    category: "Photosynthesis",
  },
  {
    term: "Thylakoid",
    definition:
      "Flattened membrane sacs inside the chloroplast where the light-dependent reactions occur.",
    category: "Photosynthesis",
  },
  // Cell biology
  {
    term: "Cell Membrane",
    definition:
      "The selectively permeable phospholipid bilayer that surrounds all cells, controlling what enters and exits.",
    category: "Cell Biology",
  },
  {
    term: "Nucleus",
    definition:
      "The membrane-bound organelle containing DNA. Controls cell activities and gene expression.",
    category: "Cell Biology",
  },
  {
    term: "Mitochondria",
    definition:
      "The powerhouse of the cell. Produces ATP through cellular respiration. Has its own DNA and double membrane.",
    category: "Cell Biology",
  },
  {
    term: "Ribosome",
    definition:
      "The cellular machinery that synthesizes proteins by translating mRNA. Found free in the cytoplasm or attached to the ER.",
    category: "Cell Biology",
  },
  {
    term: "Endoplasmic Reticulum",
    definition:
      "Network of membranes involved in protein (rough ER) and lipid (smooth ER) synthesis. Extends from the nuclear envelope.",
    category: "Cell Biology",
  },
  {
    term: "Golgi Apparatus",
    definition:
      "Modifies, packages, and ships proteins and lipids from the ER to their destinations in or out of the cell.",
    category: "Cell Biology",
  },
  {
    term: "Lysosome",
    definition:
      "Membrane-bound organelle containing digestive enzymes. Breaks down waste, damaged organelles, and invading pathogens.",
    category: "Cell Biology",
  },
  {
    term: "Cytoskeleton",
    definition:
      "Network of protein filaments (microtubules, actin) that gives the cell shape, enables movement, and transports materials.",
    category: "Cell Biology",
  },
  // Membrane transport
  {
    term: "Diffusion",
    definition:
      "The passive movement of molecules from high to low concentration. Requires no energy.",
    category: "Membrane Transport",
  },
  {
    term: "Osmosis",
    definition:
      "The passive movement of water across a semipermeable membrane from low solute to high solute concentration.",
    category: "Membrane Transport",
  },
  {
    term: "Active Transport",
    definition:
      "Movement of molecules across a membrane against their concentration gradient. Requires ATP.",
    category: "Membrane Transport",
  },
  {
    term: "Sodium-Potassium Pump",
    definition:
      "An active transport protein that pumps 3 Na+ ions out and 2 K+ ions into the cell per ATP used. Critical for nerve function.",
    category: "Membrane Transport",
  },
];

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });

  console.log("Seeding example study set...");

  // Ensure example Session exists
  await prisma.session.upsert({
    where: { sessionId: EXAMPLE_SESSION_ID },
    update: {},
    create: { sessionId: EXAMPLE_SESSION_ID },
  });

  // Nuke any existing example study set (so this is idempotent)
  await prisma.studySet.deleteMany({
    where: { sessionId: EXAMPLE_SESSION_ID },
  });

  // Create fresh example study set
  const studySet = await prisma.studySet.create({
    data: {
      sessionId: EXAMPLE_SESSION_ID,
      title: "Biology — Photosynthesis & Cell Biology",
      description:
        "Try Churro Academy with a pre-loaded biology study set. Generate quizzes, chat with tutors, test yourself.",
    },
  });

  // Fake "upload" with the concepts baked in
  await prisma.upload.create({
    data: {
      studySetId: studySet.id,
      sessionId: EXAMPLE_SESSION_ID,
      fileName: "bio-study-guide.pdf",
      fileKey: `${EXAMPLE_SESSION_ID}/${studySet.id}/seed.pdf`,
      fileType: "application/pdf",
      extractedText: "(pre-loaded example content)",
      concepts: { concepts: EXAMPLE_CONCEPTS },
      processed: true,
    },
  });

  console.log(`✓ Example study set created: ${studySet.id}`);
  console.log(`  ${EXAMPLE_CONCEPTS.length} concepts loaded`);

  // Seed tutors from hardcoded list — upsert so existing admin edits are preserved
  console.log("\nSeeding tutors...");
  for (let i = 0; i < HARDCODED_TUTORS.length; i++) {
    const t = HARDCODED_TUTORS[i];
    await prisma.tutor.upsert({
      where: { id: t.id },
      update: {}, // preserve admin-edited fields if already present
      create: {
        id: t.id,
        name: t.name,
        description: t.description,
        avatar: t.avatar,
        image: t.image ?? null,
        scene: t.scene ?? null,
        systemPrompt: t.systemPrompt,
        sortOrder: i,
        enabled: true,
      },
    });
    console.log(`  ✓ ${t.name}`);
  }
  console.log(`\n${HARDCODED_TUTORS.length} tutors seeded.`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
