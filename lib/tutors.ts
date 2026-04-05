import { prisma } from "@/lib/db";

export interface Tutor {
  id: string;
  name: string;
  description: string;
  avatar: string;
  /** Square portrait at /public/tutors/{id}.jpg — falls back to avatar emoji if missing */
  image?: string | null;
  /** Wide scene image at /public/tutors/{id}-scene.jpg — used as chat backdrop */
  scene?: string | null;
  systemPrompt: string;
}

// In-memory cache — tutors rarely change, but admin edits should land quickly
let cache: { tutors: Tutor[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

export async function getAllTutors(): Promise<Tutor[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.tutors;
  }

  const rows = await prisma.tutor.findMany({
    where: { enabled: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const tutors: Tutor[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    avatar: r.avatar,
    image: r.image,
    scene: r.scene,
    systemPrompt: r.systemPrompt,
  }));

  cache = { tutors, fetchedAt: Date.now() };
  return tutors;
}

export async function getTutor(id: string): Promise<Tutor | undefined> {
  const all = await getAllTutors();
  return all.find((t) => t.id === id);
}

/** Invalidate the in-memory cache — called after admin mutations */
export function invalidateTutorCache() {
  cache = null;
}
