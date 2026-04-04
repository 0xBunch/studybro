"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface FileUploaderProps {
  studySetId: string;
  onUploadComplete?: () => void;
}

interface UploadItem {
  file: File;
  status: "pending" | "uploading" | "processing" | "done" | "error";
  progress: number;
  step?: string;
  error?: string;
  elapsed?: number;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export function FileUploader({
  studySetId,
  onUploadComplete,
}: FileUploaderProps) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const updateItem = (idx: number, updates: Partial<UploadItem>) => {
    setUploads((prev) =>
      prev.map((u, j) => (j === idx ? { ...u, ...updates } : u))
    );
  };

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const newFiles = Array.from(files).filter((f) =>
        ACCEPTED_TYPES.includes(f.type)
      );

      if (newFiles.length === 0) return;

      const items: UploadItem[] = newFiles.map((file) => ({
        file,
        status: "pending",
        progress: 0,
        step: "Queued",
      }));

      setUploads((prev) => [...prev, ...items]);

      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        const idx = uploads.length + i;
        const startTime = Date.now();

        const tick = () => {
          setUploads((prev) =>
            prev.map((u, j) =>
              j === idx && u.status !== "done" && u.status !== "error"
                ? { ...u, elapsed: Math.round((Date.now() - startTime) / 1000) }
                : u
            )
          );
        };
        const timer = setInterval(tick, 1000);

        try {
          // Step 1: Upload to server
          updateItem(idx, {
            status: "uploading",
            progress: 10,
            step: "Uploading to server...",
          });

          const formData = new FormData();
          formData.append("file", file);
          formData.append("studySetId", studySetId);

          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(
              `Upload failed (${res.status}): ${data.error || res.statusText}`
            );
          }

          const { uploadId } = await res.json();

          updateItem(idx, {
            progress: 40,
            step: `Uploaded. Upload ID: ${uploadId.slice(0, 8)}...`,
          });

          // Step 2: Extract text + Claude analysis
          updateItem(idx, {
            status: "processing",
            progress: 50,
            step: "Extracting text & analyzing with AI (this can take 15-30s)...",
          });

          const processRes = await fetch("/api/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uploadId }),
          });

          if (!processRes.ok) {
            const data = await processRes.json().catch(() => ({}));
            throw new Error(
              `Processing failed (${processRes.status}): ${data.error || processRes.statusText}`
            );
          }

          clearInterval(timer);
          const finalElapsed = Math.round((Date.now() - startTime) / 1000);

          updateItem(idx, {
            status: "done",
            progress: 100,
            step: `Complete in ${finalElapsed}s`,
            elapsed: finalElapsed,
          });
        } catch (err) {
          clearInterval(timer);
          const finalElapsed = Math.round((Date.now() - startTime) / 1000);
          const message =
            err instanceof Error ? err.message : "Unknown error";

          updateItem(idx, {
            status: "error",
            error: message,
            step: `Failed after ${finalElapsed}s`,
            elapsed: finalElapsed,
          });
        }
      }

      onUploadComplete?.();
    },
    [studySetId, uploads.length, onUploadComplete]
  );

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
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
          handleFiles(e.dataTransfer.files);
        }}
      >
        <div className="text-4xl" aria-hidden="true">
          +
        </div>
        <p className="text-sm text-muted-foreground">
          Drag &amp; drop files here, or click to browse
        </p>
        <p className="text-xs text-muted-foreground">PDF, DOCX, or TXT</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".pdf,.docx,.txt";
            input.multiple = true;
            input.onchange = () => input.files && handleFiles(input.files);
            input.click();
          }}
        >
          Browse files
        </Button>
      </div>

      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((item, i) => (
            <div
              key={i}
              className="rounded-md border p-3 space-y-1.5"
            >
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {item.file.name}
                  </p>
                </div>
                <Badge
                  variant={
                    item.status === "done"
                      ? "default"
                      : item.status === "error"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {item.status === "uploading"
                    ? "Uploading"
                    : item.status === "processing"
                      ? "Processing"
                      : item.status === "done"
                        ? "Done"
                        : item.status === "error"
                          ? "Error"
                          : "Pending"}
                  {item.elapsed !== undefined && ` (${item.elapsed}s)`}
                </Badge>
              </div>

              {item.status !== "done" && item.status !== "error" && (
                <Progress value={item.progress} className="h-1" />
              )}

              {item.step && (
                <p
                  className={cn(
                    "text-xs font-mono",
                    item.status === "error"
                      ? "text-destructive"
                      : "text-muted-foreground"
                  )}
                >
                  {item.step}
                </p>
              )}

              {item.error && (
                <p className="text-xs font-mono text-destructive break-all">
                  {item.error}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
