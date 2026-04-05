import { getSessionIdOrNull, EXAMPLE_SESSION_ID } from "@/lib/session";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { StudySetClient } from "./study-set-client";
import { getAllTutors } from "@/lib/tutors";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function StudySetDetailPage({ params }: Props) {
  const { id } = await params;
  const sessionId = await getSessionIdOrNull();

  // If we have a session, let them access their own sets OR the example.
  // If we don't, they can still see the example (cookie will be created
  // when they take an action that hits an API route).
  const whereClauses = sessionId
    ? [{ sessionId }, { sessionId: EXAMPLE_SESSION_ID }]
    : [{ sessionId: EXAMPLE_SESSION_ID }];

  const studySet = await prisma.studySet.findFirst({
    where: { id, OR: whereClauses },
    include: {
      uploads: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!studySet) notFound();

  const isExample = studySet.sessionId === EXAMPLE_SESSION_ID;

  // Tests are scoped to the visitor's session only (example tests stay private per visitor)
  const tests = sessionId
    ? await prisma.test.findMany({
        where: { studySetId: id, sessionId },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { sessions: true } } },
      })
    : [];

  const allConcepts = studySet.uploads.flatMap((u) => {
    const data = u.concepts as {
      concepts?: { term: string; definition: string; category: string }[];
    };
    return data?.concepts || [];
  });

  const tutors = await getAllTutors();

  return (
    <StudySetClient
      tutors={tutors.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        avatar: t.avatar,
        image: t.image ?? undefined,
      }))}
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
        tests: tests.map((t) => ({
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
