import { getSessionIdOrNull } from "@/lib/session";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { QuizPlayer } from "@/components/quiz-player";
import { FlashcardPlayer } from "@/components/flashcard-player";
import { ReverseFlashcardPlayer } from "@/components/reverse-flashcard-player";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ testId?: string }>;
}

export default async function QuizPage({ params, searchParams }: Props) {
  const { id: studySetId } = await params;
  const { testId } = await searchParams;
  const sessionId = await getSessionIdOrNull();

  if (!sessionId) {
    redirect("/");
  }

  if (!testId) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 text-center py-12">
        <p className="text-muted-foreground">No test selected.</p>
        <Link href={`/sessions/study-sets/${studySetId}`}>
          <Button variant="outline">Back to study set</Button>
        </Link>
      </div>
    );
  }

  const test = await prisma.test.findFirst({
    where: { id: testId, sessionId, studySetId },
  });

  if (!test) notFound();

  const title =
    test.type === "QUIZ"
      ? "Quiz"
      : test.type === "FLASHCARD"
        ? "Flashcards"
        : "Reverse Flashcards";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl">{title}</h1>
        <Link href={`/sessions/study-sets/${studySetId}`}>
          <Button variant="ghost" size="sm">
            Back
          </Button>
        </Link>
      </div>

      {test.type === "QUIZ" ? (
        <QuizPlayer
          testId={test.id}
          questions={
            test.questions as {
              question: string;
              options: string[];
              correctIndex: number;
              explanation: string;
              concept: string;
            }[]
          }
          studySetId={studySetId}
        />
      ) : test.type === "REVERSE_FLASHCARD" ? (
        <ReverseFlashcardPlayer
          testId={test.id}
          cards={
            test.questions as {
              front: string;
              back: string;
              concept: string;
            }[]
          }
          studySetId={studySetId}
        />
      ) : (
        <FlashcardPlayer
          testId={test.id}
          cards={
            test.questions as {
              front: string;
              back: string;
              concept: string;
            }[]
          }
          studySetId={studySetId}
        />
      )}
    </div>
  );
}
