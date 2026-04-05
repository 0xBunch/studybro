"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

type Status =
  | { kind: "idle" }
  | { kind: "working"; step: string; elapsed: number }
  | { kind: "error"; message: string };

export function HomeUploader() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const runFlow = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setStatus({
          kind: "error",
          message: "Please upload a PDF, DOCX, or TXT file.",
        });
        return;
      }

      const startTime = Date.now();
      const setStep = (step: string) => {
        setStatus({
          kind: "working",
          step,
          elapsed: Math.round((Date.now() - startTime) / 1000),
        });
      };

      const timer = setInterval(() => {
        setStatus((s) =>
          s.kind === "working"
            ? { ...s, elapsed: Math.round((Date.now() - startTime) / 1000) }
            : s
        );
      }, 1000);

      try {
        // 1. Create a new study set
        setStep("Creating study session...");
        const defaultTitle = file.name.replace(/\.[^.]+$/, "");
        const createRes = await fetch("/api/study-sets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: defaultTitle }),
        });
        if (!createRes.ok) {
          const d = await createRes.json().catch(() => ({}));
          throw new Error(d.error || "Could not create study set");
        }
        const { id: studySetId } = await createRes.json();

        // 2. Upload the file
        setStep("Uploading your file...");
        const formData = new FormData();
        formData.append("file", file);
        formData.append("studySetId", studySetId);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) {
          const d = await uploadRes.json().catch(() => ({}));
          throw new Error(d.error || "Upload failed");
        }
        const { uploadId } = await uploadRes.json();

        // 3. Process with Claude
        setStep("Analyzing with AI (this takes 15-30s)...");
        const processRes = await fetch("/api/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uploadId }),
        });
        if (!processRes.ok) {
          const d = await processRes.json().catch(() => ({}));
          throw new Error(d.error || "Processing failed");
        }

        clearInterval(timer);

        // 4. Navigate to the study set
        router.push(`/sessions/study-sets/${studySetId}`);
      } catch (err) {
        clearInterval(timer);
        setStatus({
          kind: "error",
          message: err instanceof Error ? err.message : "Something went wrong",
        });
      }
    },
    [router]
  );

  const handlePick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.docx,.txt";
    input.onchange = () => {
      if (input.files && input.files[0]) runFlow(input.files[0]);
    };
    input.click();
  };

  if (status.kind === "working") {
    return (
      <div className="rounded-2xl border-2 border-dashed border-muted-foreground/25 p-10 text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <span className="inline-block size-2 rounded-full bg-primary animate-pulse" />
          <p className="text-sm font-medium">{status.step}</p>
        </div>
        <p className="text-xs text-muted-foreground font-mono">
          {status.elapsed}s elapsed
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-dashed p-10 transition-colors cursor-pointer",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) runFlow(file);
      }}
      onClick={handlePick}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="text-3xl opacity-40" aria-hidden="true">
          +
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Drop your notes here</p>
          <p className="text-xs text-muted-foreground">
            PDF, DOCX, or TXT — we&apos;ll do the rest
          </p>
        </div>
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handlePick();
          }}
        >
          Choose file
        </Button>
        {status.kind === "error" && (
          <p className="text-xs text-destructive font-mono pt-2">
            {status.message}
          </p>
        )}
      </div>
    </div>
  );
}
