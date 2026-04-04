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
  error?: string;
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
      }));

      setUploads((prev) => [...prev, ...items]);

      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        const idx = uploads.length + i;

        try {
          setUploads((prev) =>
            prev.map((u, j) =>
              j === idx ? { ...u, status: "uploading", progress: 10 } : u
            )
          );

          // Upload file through our API (server proxies to R2)
          const formData = new FormData();
          formData.append("file", file);
          formData.append("studySetId", studySetId);

          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Upload failed");
          }

          const { uploadId } = await res.json();

          setUploads((prev) =>
            prev.map((u, j) =>
              j === idx ? { ...u, status: "processing", progress: 60 } : u
            )
          );

          // Process with Claude
          const processRes = await fetch("/api/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uploadId }),
          });

          if (!processRes.ok) throw new Error("Processing failed");

          setUploads((prev) =>
            prev.map((u, j) =>
              j === idx ? { ...u, status: "done", progress: 100 } : u
            )
          );
        } catch (err) {
          setUploads((prev) =>
            prev.map((u, j) =>
              j === idx
                ? {
                    ...u,
                    status: "error",
                    error: err instanceof Error ? err.message : "Unknown error",
                  }
                : u
            )
          );
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
              className="flex items-center gap-3 rounded-md border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.file.name}</p>
                {item.status !== "done" && item.status !== "error" && (
                  <Progress value={item.progress} className="mt-1 h-1" />
                )}
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
                  ? "Uploading..."
                  : item.status === "processing"
                    ? "Processing..."
                    : item.status === "done"
                      ? "Done"
                      : item.status === "error"
                        ? "Error"
                        : "Pending"}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
