"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileUploader } from "@/components/file-uploader";
import { GenerateTestButtons } from "./generate-test-buttons";

interface Upload {
  id: string;
  fileName: string;
  processed: boolean;
}

interface Concept {
  term: string;
  definition: string;
  category: string;
}

interface Test {
  id: string;
  type: string;
  createdAt: string;
  _count: { sessions: number };
}

interface StudySetData {
  id: string;
  title: string;
  description: string | null;
  uploads: Upload[];
  tests: Test[];
  concepts: Concept[];
}

export function StudySetClient({ data }: { data: StudySetData }) {
  const router = useRouter();
  const [title, setTitle] = useState(data.title);
  const [description, setDescription] = useState(data.description ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function saveChanges() {
    setSaving(true);
    await fetch(`/api/study-sets/${data.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Delete this study set and all its data? This can't be undone.")) return;
    setDeleting(true);
    await fetch(`/api/study-sets/${data.id}`, { method: "DELETE" });
    router.push("/dashboard");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {editing ? (
            <div className="space-y-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="font-heading text-2xl font-semibold h-auto py-1"
              />
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveChanges} disabled={saving || !title.trim()}>
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  setTitle(data.title);
                  setDescription(data.description ?? "");
                  setEditing(false);
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="font-heading text-2xl font-semibold">{data.title}</h1>
              {data.description && (
                <p className="text-sm text-muted-foreground">{data.description}</p>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {!editing && (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={handleDelete} disabled={deleting} className="text-destructive hover:text-destructive">
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>

      {/* Uploads + Add more */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Uploads ({data.uploads.length})
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowUploader(!showUploader)}>
            {showUploader ? "Hide" : "Add files"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showUploader && (
            <FileUploader
              studySetId={data.id}
              onUploadComplete={() => {
                router.refresh();
                setShowUploader(false);
              }}
            />
          )}
          {data.uploads.length === 0 && !showUploader ? (
            <p className="text-sm text-muted-foreground">
              No files uploaded yet. Click "Add files" to upload your notes.
            </p>
          ) : (
            <div className="space-y-2">
              {data.uploads.map((upload) => (
                <div
                  key={upload.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <span className="truncate text-sm">{upload.fileName}</span>
                  <Badge variant={upload.processed ? "default" : "secondary"}>
                    {upload.processed ? "Processed" : "Pending"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Concepts */}
      {data.concepts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Extracted Concepts ({data.concepts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.concepts.map((concept, i) => (
                <div key={i} className="rounded-md border p-3 space-y-1">
                  <p className="text-sm font-medium">{concept.term}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {concept.definition}
                  </p>
                  {concept.category && (
                    <Badge variant="secondary" className="text-xs">
                      {concept.category}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Study with Socrates */}
      {data.concepts.length > 0 && (
        <Link href={`/dashboard/study-sets/${data.id}/chat`}>
          <Card className="transition-shadow hover:shadow-md cursor-pointer">
            <CardContent className="flex items-center gap-4 py-5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
                S
              </div>
              <div>
                <p className="font-medium">Study with Socrates</p>
                <p className="text-sm text-muted-foreground">
                  Have an adaptive conversation about your material
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Generate Tests */}
      {data.concepts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generate a Test</CardTitle>
          </CardHeader>
          <CardContent>
            <GenerateTestButtons studySetId={data.id} />
          </CardContent>
        </Card>
      )}

      {/* Previous Tests */}
      {data.tests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Previous Tests ({data.tests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.tests.map((test) => (
                <Link
                  key={test.id}
                  href={`/dashboard/study-sets/${data.id}/quiz?testId=${test.id}`}
                  className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{test.type.replace(/_/g, " ")}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(test.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {test._count.sessions}{" "}
                    {test._count.sessions === 1 ? "attempt" : "attempts"}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
