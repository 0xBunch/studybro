"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Props {
  studySetId: string;
}

export function GenerateTestButtons({ studySetId }: Props) {
  const router = useRouter();
  const [generating, setGenerating] = useState<string | null>(null);

  async function generate(type: "QUIZ" | "FLASHCARD" | "REVERSE_FLASHCARD") {
    setGenerating(type);

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studySetId,
        type,
        config: type === "QUIZ" ? { questionCount: 10 } : {},
      }),
    });

    if (res.ok) {
      const { testId } = await res.json();
      router.push(
        `/dashboard/study-sets/${studySetId}/quiz?testId=${testId}`
      );
    }

    setGenerating(null);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        onClick={() => generate("QUIZ")}
        disabled={generating !== null}
      >
        {generating === "QUIZ" ? "Generating..." : "Quiz (10 MC)"}
      </Button>
      <Button
        variant="secondary"
        onClick={() => generate("FLASHCARD")}
        disabled={generating !== null}
      >
        {generating === "FLASHCARD" ? "Generating..." : "Flashcards"}
      </Button>
      <Button
        variant="secondary"
        onClick={() => generate("REVERSE_FLASHCARD")}
        disabled={generating !== null}
      >
        {generating === "REVERSE_FLASHCARD"
          ? "Generating..."
          : "Reverse Flashcards"}
      </Button>
    </div>
  );
}
