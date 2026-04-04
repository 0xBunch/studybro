"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileUploader } from "@/components/file-uploader";

export default function NewStudySetPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [studySetId, setStudySetId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!title.trim()) return;
    setCreating(true);

    const res = await fetch("/api/study-sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), description: description.trim() }),
    });

    if (res.ok) {
      const { id } = await res.json();
      setStudySetId(id);
    }

    setCreating(false);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">
          New Study Set
        </h1>
        <p className="text-sm text-muted-foreground">
          Create a study set and upload your notes
        </p>
      </div>

      {!studySetId ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g. Biology 101 — Midterm Review"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="What are you studying?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <Button onClick={handleCreate} disabled={!title.trim() || creating}>
              {creating ? "Creating..." : "Create Study Set"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload Files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUploader
              studySetId={studySetId}
              onUploadComplete={() => {}}
            />
            <div className="flex justify-end">
              <Button
                onClick={() =>
                  router.push(`/dashboard/study-sets/${studySetId}`)
                }
              >
                Done — View Study Set
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
