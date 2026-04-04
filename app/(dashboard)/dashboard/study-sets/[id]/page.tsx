import { USER_ID } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { StudySetClient } from "./study-set-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function StudySetDetailPage({ params }: Props) {
  const { id } = await params;

  const studySet = await prisma.studySet.findFirst({
    where: { id, userId: USER_ID },
    include: {
      uploads: { orderBy: { createdAt: "desc" } },
      tests: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { sessions: true } } },
      },
    },
  });

  if (!studySet) notFound();

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
