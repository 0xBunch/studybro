import { getSessionIdOrNull, EXAMPLE_SESSION_ID } from "@/lib/session";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { getTutor } from "@/lib/tutors";
import { TutorChat } from "@/components/tutor-chat";
import { TutorAvatar } from "@/components/tutor-avatar";
import { TutorScene } from "@/components/tutor-scene";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tutor?: string }>;
}

export default async function ChatPage({ params, searchParams }: Props) {
  const { id: studySetId } = await params;
  const { tutor: tutorId } = await searchParams;
  const sessionId = await getSessionIdOrNull();

  const tutor = await getTutor(tutorId || "socrates");
  if (!tutor) notFound();

  const whereClauses = sessionId
    ? [{ sessionId }, { sessionId: EXAMPLE_SESSION_ID }]
    : [{ sessionId: EXAMPLE_SESSION_ID }];

  const studySet = await prisma.studySet.findFirst({
    where: { id: studySetId, OR: whereClauses },
    include: {
      uploads: {
        where: { processed: true },
        select: { concepts: true },
      },
    },
  });

  if (!studySet) notFound();

  const concepts = studySet.uploads.flatMap((u) => {
    const data = u.concepts as {
      concepts?: { term: string; definition: string; category: string }[];
    };
    return data?.concepts || [];
  });

  // Aggregate weak concepts from the visitor's own recent test sessions
  const weakConceptsSet = new Set<string>();
  if (sessionId) {
    const recentSessions = await prisma.testSession.findMany({
      where: {
        sessionId,
        test: { studySetId },
      },
      select: { weakConcepts: true },
      orderBy: { completedAt: "desc" },
      take: 5,
    });
    for (const s of recentSessions) {
      const weak = s.weakConcepts as string[];
      if (Array.isArray(weak)) {
        for (const c of weak) weakConceptsSet.add(c);
      }
    }
  }
  const weakConcepts = Array.from(weakConceptsSet);

  return (
    <div className="mx-auto flex h-[calc(100dvh-73px)] max-w-2xl flex-col">
      <TutorScene tutor={tutor} />
      <div className="flex items-center justify-between border-b px-1 py-3">
        <div className="flex items-center gap-3">
          <TutorAvatar tutor={tutor} size="sm" />
          <div>
            <h1 className="font-heading text-lg">{tutor.name}</h1>
            <p className="text-xs text-muted-foreground">{studySet.title}</p>
          </div>
        </div>
        <Link href={`/dashboard/study-sets/${studySetId}`}>
          <Button variant="ghost" size="sm">
            Back
          </Button>
        </Link>
      </div>

      <TutorChat
        tutor={tutor}
        concepts={concepts}
        weakConcepts={weakConcepts}
        studySetId={studySetId}
      />
    </div>
  );
}
