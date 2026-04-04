import { getOrCreateSession, EXAMPLE_SESSION_ID } from "@/lib/session";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { StudySetClient } from "./study-set-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function StudySetDetailPage({ params }: Props) {
  const { id } = await params;
  const sessionId = await getOrCreateSession();

  // Can access either the visitor's own study sets OR the shared example
  const studySet = await prisma.studySet.findFirst({
    where: {
      id,
      OR: [{ sessionId }, { sessionId: EXAMPLE_SESSION_ID }],
    },
    include: {
      uploads: { orderBy: { createdAt: "desc" } },
      tests: {
        where: { sessionId }, // Tests are per-visitor, even on the example
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { sessions: true } } },
      },
    },
  });

  if (!studySet) notFound();

  const isExample = studySet.sessionId === EXAMPLE_SESSION_ID;

  const allConcepts = studySet.uploads.flatMap((u) => {
    const data = u.concepts as {
      concepts?: { term: string; definition: string; category: string }[];
    };
    return data?.concepts || [];
  });

  return (
    <StudySetClient
      data={{
        id: studySet.id,
        title: studySet.title,
        description: studySet.description,
        isExample,
        uploads: studySet.uploads.map((u) => ({
          id: u.id,
          fileName: u.fileName,
          processed: u.processed,
        })),
        tests: studySet.tests.map((t) => ({
          id: t.id,
          type: t.type,
          createdAt: t.createdAt.toISOString(),
          _count: t._count,
        })),
        concepts: allConcepts,
      }}
    />
  );
}
