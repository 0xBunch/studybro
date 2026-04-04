"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface FlashCard {
  front: string;
  back: string;
  concept: string;
}

interface CardResult {
  index: number;
  correct: boolean;
  attempts: number;
  concept: string;
}

interface Props {
  testId: string;
  cards: FlashCard[];
  studySetId: string;
}

export function ReverseFlashcardPlayer({ testId, cards, studySetId }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [results, setResults] = useState<CardResult[]>([]);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  const current = cards[currentIndex];
  const progress = (currentIndex / cards.length) * 100;

  const normalize = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "");

  const checkAnswer = useCallback(async () => {
    if (!answer.trim()) return;

    const isCorrect =
      normalize(answer) === normalize(current.back) ||
      normalize(current.back).includes(normalize(answer));

    setAttempts((a) => a + 1);

    if (isCorrect) {
      setWasCorrect(true);
      setRevealed(true);
      return;
    }

    // Wrong answer — get a hint from AI
    setLoadingHint(true);
    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer: answer.trim(),
          correctAnswer: current.back,
          definition: current.front,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setHint(data.hint);
      } else {
        setHint("Not quite! Try again or reveal the answer.");
      }
    } catch {
      setHint("Not quite! Try again or reveal the answer.");
    }
    setLoadingHint(false);
  }, [answer, current]);

  const handleReveal = () => {
    setRevealed(true);
    setWasCorrect(false);
  };

  const handleNext = useCallback(() => {
    setResults((prev) => [
      ...prev,
      {
        index: currentIndex,
        correct: wasCorrect,
        attempts: attempts,
        concept: current.concept,
      },
    ]);

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex((i) => i + 1);
      setAnswer("");
      setHint(null);
      setAttempts(0);
      setRevealed(false);
      setWasCorrect(false);
    } else {
      setFinished(true);
    }
  }, [currentIndex, cards.length, wasCorrect, attempts, current.concept]);

  const saveResults = useCallback(async () => {
    setSaving(true);
    // Include the last card if finishing
    const allResults =
      finished && results.length < cards.length
        ? [
            ...results,
            {
              index: currentIndex,
              correct: wasCorrect,
              attempts,
              concept: current.concept,
            },
          ]
        : results;

    const correct = allResults.filter((r) => r.correct).length;

    const conceptAccuracy: Record<
      string,
      { correct: number; total: number }
    > = {};
    for (const r of allResults) {
      if (!conceptAccuracy[r.concept]) {
        conceptAccuracy[r.concept] = { correct: 0, total: 0 };
      }
      conceptAccuracy[r.concept].total++;
      if (r.correct) conceptAccuracy[r.concept].correct++;
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
        results: allResults.map((r) => ({
          questionIndex: r.index,
          correct: r.correct,
          attempts: r.attempts,
          concept: r.concept,
        })),
        weakConcepts,
      }),
    });

    setSaving(false);
  }, [
    results,
    finished,
    currentIndex,
    wasCorrect,
    attempts,
    current,
    testId,
    cards.length,
  ]);

  if (finished) {
    const allResults =
      results.length < cards.length
        ? [
            ...results,
            {
              index: currentIndex,
              correct: wasCorrect,
              attempts,
              concept: current.concept,
            },
          ]
        : results;
    const correct = allResults.filter((r) => r.correct).length;
    const score = Math.round((correct / cards.length) * 100);

    return (
      <div className="space-y-6 text-center">
        <div className="space-y-2">
          <h2 className="font-heading text-3xl">{score}%</h2>
          <p className="text-muted-foreground">
            {correct} of {cards.length} recalled correctly
          </p>
          <Button onClick={saveResults} disabled={saving}>
            {saving ? "Saving..." : "Save Results"}
          </Button>
        </div>

        <div className="space-y-2 text-left">
          {allResults.map((r, i) => (
            <div
              key={i}
              className={cn(
                "rounded-md border p-3 text-sm",
                r.correct
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              )}
            >
              <p className="font-medium">{cards[r.index].back}</p>
              <p className="text-muted-foreground text-xs mt-1">
                {r.correct
                  ? `Got it${r.attempts > 1 ? ` in ${r.attempts} tries` : ""}!`
                  : "Revealed"}
              </p>
            </div>
          ))}
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

      <Card>
        <CardContent className="p-6 space-y-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Definition
          </p>
          <p className="text-lg text-pretty">{current.front}</p>

          {!revealed ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Type the term..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") checkAnswer();
                  }}
                  disabled={loadingHint}
                  autoFocus
                />
                <Button onClick={checkAnswer} disabled={!answer.trim() || loadingHint}>
                  {loadingHint ? "..." : "Check"}
                </Button>
              </div>

              {hint && (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
                  {hint}
                </div>
              )}

              {attempts > 0 && (
                <button
                  onClick={handleReveal}
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  Reveal answer
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div
                className={cn(
                  "rounded-md p-3 text-sm font-medium",
                  wasCorrect
                    ? "bg-green-50 border border-green-200 text-green-900"
                    : "bg-muted"
                )}
              >
                <p className="text-xs uppercase tracking-wider mb-1 opacity-60">
                  {wasCorrect ? "Correct!" : "Answer"}
                </p>
                <p className="text-base">{current.back}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {revealed && (
        <div className="flex justify-end">
          <Button onClick={handleNext}>
            {currentIndex + 1 < cards.length ? "Next Card" : "See Results"}
          </Button>
        </div>
      )}
    </div>
  );
}
