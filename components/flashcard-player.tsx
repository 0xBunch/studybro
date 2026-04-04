"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface FlashCard {
  front: string;
  back: string;
  concept: string;
}

interface Props {
  testId: string;
  cards: FlashCard[];
  studySetId: string;
}

export function FlashcardPlayer({ testId, cards, studySetId }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  const current = cards[currentIndex];
  const progress = ((currentIndex + (flipped ? 0.5 : 0)) / cards.length) * 100;

  const handleResult = useCallback(
    (knew: boolean) => {
      setResults((prev) => [...prev, knew]);
      if (currentIndex + 1 < cards.length) {
        setCurrentIndex((i) => i + 1);
        setFlipped(false);
      } else {
        setFinished(true);
      }
    },
    [currentIndex, cards.length]
  );

  const saveResults = useCallback(async () => {
    setSaving(true);
    const correct = results.filter(Boolean).length;

    const conceptAccuracy: Record<string, { correct: number; total: number }> =
      {};
    for (let i = 0; i < results.length; i++) {
      const concept = cards[i].concept;
      if (!conceptAccuracy[concept]) {
        conceptAccuracy[concept] = { correct: 0, total: 0 };
      }
      conceptAccuracy[concept].total++;
      if (results[i]) conceptAccuracy[concept].correct++;
    }

    const weakConcepts = Object.entries(conceptAccuracy)
      .filter(([, v]) => v.correct / v.total < 0.7)
      .map(([concept]) => concept);

    await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        testId,
        score: correct / cards.length,
        totalQuestions: cards.length,
        results: results.map((knew, i) => ({
          questionIndex: i,
          correct: knew,
          concept: cards[i].concept,
        })),
        weakConcepts,
      }),
    });

    setSaving(false);
  }, [results, testId, cards]);

  if (finished) {
    const correct = results.filter(Boolean).length;
    const score = Math.round((correct / cards.length) * 100);

    return (
      <div className="space-y-6 text-center">
        <div className="space-y-2">
          <h2 className="font-heading text-3xl">{score}%</h2>
          <p className="text-muted-foreground">
            {correct} of {cards.length} cards known
          </p>
          <Button onClick={saveResults} disabled={saving}>
            {saving ? "Saving..." : "Save Results"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Card {currentIndex + 1} of {cards.length}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      <Card
        className="cursor-pointer select-none"
        onClick={() => setFlipped((f) => !f)}
      >
        <CardContent className="flex min-h-[200px] items-center justify-center p-8">
          <div className="text-center space-y-3">
            <p
              className={cn(
                "text-xs font-medium uppercase tracking-wider",
                flipped ? "text-green-600" : "text-muted-foreground"
              )}
            >
              {flipped ? "Answer" : "Prompt"}
            </p>
            <p className="text-lg text-pretty">
              {flipped ? current.back : current.front}
            </p>
            {!flipped && (
              <p className="text-xs text-muted-foreground">
                Tap to reveal answer
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {flipped && (
        <div className="flex justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => handleResult(false)}
            className="min-w-[120px]"
          >
            Didn&apos;t know
          </Button>
          <Button
            onClick={() => handleResult(true)}
            className="min-w-[120px]"
          >
            Knew it
          </Button>
        </div>
      )}
    </div>
  );
}
