"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface TutorData {
  id: string;
  name: string;
  description: string;
  avatar: string;
  image: string | null;
  scene: string | null;
  systemPrompt: string;
  sortOrder: number;
  enabled: boolean;
}

export function TutorEditForm({ tutor }: { tutor: TutorData }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: tutor.name,
    description: tutor.description,
    avatar: tutor.avatar,
    systemPrompt: tutor.systemPrompt,
    sortOrder: tutor.sortOrder,
    enabled: tutor.enabled,
  });
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveStatus(null);

    const res = await fetch(`/api/admin/tutors/${tutor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setSaveStatus("Saved");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setSaveStatus(`Error: ${data.error || "Save failed"}`);
    }
    setSaving(false);
    setTimeout(() => setSaveStatus(null), 3000);
  }

  async function handleDelete() {
    if (
      !confirm(
        `Delete ${tutor.name}? This can't be undone. Existing chat sessions won't break, but this tutor will disappear from the picker.`
      )
    )
      return;

    const res = await fetch(`/api/admin/tutors/${tutor.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      router.push("/admin");
    } else {
      alert("Delete failed");
    }
  }

  async function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    kind: "image" | "scene"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus(`Uploading ${kind}...`);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);

    const res = await fetch(`/api/admin/tutors/${tutor.id}/image`, {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      setUploadStatus(`${kind} uploaded`);
      router.refresh();
      setTimeout(() => setUploadStatus(null), 3000);
    } else {
      const data = await res.json().catch(() => ({}));
      setUploadStatus(`Upload failed: ${data.error || "unknown"}`);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">{tutor.name}</h1>
          <p className="text-xs text-muted-foreground font-mono">{tutor.id}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              Back
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
            Delete
          </Button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (picker card tagline)</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="avatar">Avatar (emoji fallback)</Label>
                <Input
                  id="avatar"
                  value={form.avatar}
                  onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                  maxLength={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort order (lower = first)</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="enabled"
                type="checkbox"
                checked={form.enabled}
                onChange={(e) =>
                  setForm({ ...form, enabled: e.target.checked })
                }
                className="size-4"
              />
              <Label htmlFor="enabled" className="cursor-pointer">
                Enabled (visible in tutor picker)
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* System prompt */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">System Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={form.systemPrompt}
              onChange={(e) =>
                setForm({ ...form, systemPrompt: e.target.value })
              }
              rows={20}
              className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm font-mono leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="You are..."
            />
            <p className="text-xs text-muted-foreground mt-2">
              The SHARED_INSTRUCTIONS (opening message, suggestions format) are
              appended automatically.
            </p>
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Images</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Portrait */}
              <div className="space-y-2">
                <Label>Portrait (square, shown in picker)</Label>
                {tutor.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tutor.image}
                    alt="Current portrait"
                    className="size-32 rounded-lg object-cover border"
                  />
                ) : (
                  <div className="size-32 rounded-lg border bg-muted flex items-center justify-center text-4xl">
                    {tutor.avatar}
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "image")}
                  className="text-xs"
                />
                {tutor.image && (
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {tutor.image}
                  </p>
                )}
              </div>
              {/* Scene */}
              <div className="space-y-2">
                <Label>Scene (wide, shown in chat)</Label>
                {tutor.scene ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tutor.scene}
                    alt="Current scene"
                    className="w-full h-20 rounded-lg object-cover border"
                  />
                ) : (
                  <div className="w-full h-20 rounded-lg border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    No scene yet
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "scene")}
                  className="text-xs"
                />
                {tutor.scene && (
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {tutor.scene}
                  </p>
                )}
              </div>
            </div>
            {uploadStatus && (
              <p className="text-xs font-mono text-muted-foreground">
                {uploadStatus}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex items-center justify-end gap-3 sticky bottom-6">
          {saveStatus && (
            <span className="text-xs font-mono text-muted-foreground">
              {saveStatus}
            </span>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
