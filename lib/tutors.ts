import { prisma } from "@/lib/db";
import type {
  TutorPersona,
  GoldenLines,
  TeachingArc,
  LiveContextConfig,
  Glossary,
} from "@/lib/persona-types";

// Legacy flat type, still referenced by UI components. Minimal shape.
export interface Tutor {
  id: string;
  name: string;
  description: string;
  avatar: string;
  image?: string | null;
  scene?: string | null;
  systemPrompt: string;
}

// In-memory cache — tutors rarely change, but admin edits should land quickly
let personaCache: { tutors: TutorPersona[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 30 * 1000;

export async function getAllTutors(): Promise<TutorPersona[]> {
  if (personaCache && Date.now() - personaCache.fetchedAt < CACHE_TTL_MS) {
    return personaCache.tutors;
  }

  const rows = await prisma.tutor.findMany({
    where: { enabled: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const tutors: TutorPersona[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    avatar: r.avatar,
    image: r.image,
    scene: r.scene,
    identity: r.identity,
    voiceTraits: (r.voiceTraits as string[]) ?? [],
    antiPatterns: (r.antiPatterns as string[]) ?? [],
    goldenLines: (r.goldenLines as GoldenLines) ?? {},
    vocabulary: (r.vocabulary as string[]) ?? [],
    glossary: (r.glossary as Glossary) ?? {},
    teachingArc: (r.teachingArc as TeachingArc) ?? {},
    liveContext: (r.liveContext as LiveContextConfig | null) ?? null,
    webSearchEnabled: r.webSearchEnabled,
    legacySystemPrompt: r.systemPrompt,
    sortOrder: r.sortOrder,
    enabled: r.enabled,
  }));

  personaCache = { tutors, fetchedAt: Date.now() };
  return tutors;
}

export async function getTutor(id: string): Promise<TutorPersona | undefined> {
  const all = await getAllTutors();
  return all.find((t) => t.id === id);
}

/** Invalidate the in-memory cache — called after admin mutations */
export function invalidateTutorCache() {
  personaCache = null;
}
