"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  concept: string;
}

interface QuizResult {
  questionIndex: number;
  selectedIndex: number;
  correct: boolean;
  concept: string;
}

interface Props {
  testId: string;
  questions: Question[];
  studySetId: string;
}

export function QuizPlayer({ testId, questions, studySetId }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  const current = questions[currentIndex];
  const progress = ((currentIndex + (revealed ? 1 : 0)) / questions.length) * 100;

  const handleSubmit = useCallback(() => {
    if (selectedOption === null) return;
    setRevealed(true);

    setResults((prev) => [
      ...prev,
      {
        questionIndex: currentIndex,
        selectedIndex: selectedOption,
        correct: selectedOption === current.correctIndex,
        concept: current.concept,
      },
    ]);
  }, [selectedOption, currentIndex, current]);

  const handleNext = useCallback(() => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setRevealed(false);
    } else {
      setFinished(true);
    }
  }, [currentIndex, questions.length]);

  const saveResults = useCallback(async () => {
    setSaving(true);
    const correct = results.filter((r) => r.correct).length;

    const conceptAccuracy: Record<string, { correct: number; total: number }> = {};
    for (const r of results) {
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
        score: correct / questions.length,
        totalQuestions: questions.length,
        results,
        weakConcepts,
      }),
    });

    setSaving(false);
  }, [results, testId, questions.length]);

  if (finished) {
    const correct = results.filter((r) => r.correct).length;
    const score = Math.round((correct / questions.length) * 100);

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="font-heading text-3xl font-semibold">
            {score}%
          </h2>
          <p className="text-muted-foreground">
            {correct} of {questions.length} correct
          </p>
          <Button onClick={saveResults} disabled={saving}>
            {saving ? "Saving..." : "Save Results"}
          </Button>
        </div>

        <div className="space-y-3">
          {results.map((result, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">
                    {questions[result.questionIndex].question}
                  </p>
                  <Badge
                    variant={result.correct ? "default" : "destructive"}
                    className="shrink-0"
                  >
                    {result.correct ? "Correct" : "Wrong"}
                  </Badge>
                </div>
                {!result.correct && (
                  <p className="text-xs text-muted-foreground">
                    Your answer:{" "}
                    {questions[result.questionIndex].options[result.selectedIndex]}
                    {" — "}
                    Correct:{" "}
                    {
                      questions[result.questionIndex].options[
                        questions[result.questionIndex].correctIndex
                      ]
                    }
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {questions[result.questionIndex].explanation}
                </p>
              </CardContent>
            </Card>
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
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <p className="text-base font-medium text-pretty">
            {current.question}
          </p>

          <div className="space-y-2">
            {current.options.map((option, i) => {
              const isSelected = selectedOption === i;
              const isCorrect = i === current.correctIndex;

              return (
                <button
                  key={i}
                  type="button"
                  disabled={revealed}
                  onClick={() => setSelectedOption(i)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-md border p-3 text-left text-sm transition-colors",
                    !revealed && isSelected && "border-primary bg-primary/5",
                    !revealed && !isSelected && "hover:bg-muted/50",
                    revealed && isCorrect && "border-green-600 bg-green-50",
                    revealed && isSelected && !isCorrect && "border-red-500 bg-red-50"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                      isSelected && !revealed && "border-primary text-primary",
                      revealed && isCorrect && "border-green-600 text-green-600",
                      revealed && isSelected && !isCorrect && "border-red-500 text-red-500"
                    )}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>

          {revealed && (
            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              {current.explanation}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        {!revealed ? (
          <Button onClick={handleSubmit} disabled={selectedOption === null}>
            Check Answer
          </Button>
        ) : (
          <Button onClick={handleNext}>
            {currentIndex + 1 < questions.length
              ? "Next Question"
              : "See Results"}
          </Button>
        )}
      </div>
    </div>
  );
}
