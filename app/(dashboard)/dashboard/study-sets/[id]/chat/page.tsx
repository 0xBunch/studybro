import { USER_ID } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { SocratesChat } from "@/components/socrates-chat";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: Props) {
  const { id: studySetId } = await params;

  const studySet = await prisma.studySet.findFirst({
    where: { id: studySetId, userId: USER_ID },
    include: {
      uploads: {
        where: { processed: true },
        select: { concepts: true },
      },
      tests: {
        select: {
          sessions: {
            select: { weakConcepts: true },
            orderBy: { completedAt: "desc" },
            take: 5,
          },
        },
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

  // Aggregate weak concepts from recent test sessions
  const weakConceptsSet = new Set<string>();
  for (const test of studySet.tests) {
    for (const session of test.sessions) {
      const weak = session.weakConcepts as string[];
      if (Array.isArray(weak)) {
        for (const c of weak) weakConceptsSet.add(c);
      }
    }
  }
  const weakConcepts = Array.from(weakConceptsSet);

  return (
    <div className="mx-auto flex h-[calc(100dvh-73px)] max-w-2xl flex-col">
      <div className="flex items-center justify-between border-b px-1 py-3">
        <div>
          <h1 className="font-heading text-lg font-semibold">
            Study with Socrates
          </h1>
          <p className="text-xs text-muted-foreground">{studySet.title}</p>
        </div>
        <Link href={`/dashboard/study-sets/${studySetId}`}>
          <Button variant="ghost" size="sm">
            Back
          </Button>
        </Link>
      </div>

      <SocratesChat
        concepts={concepts}
        weakConcepts={weakConcepts}
        studySetId={studySetId}
      />
    </div>
  );
}
