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

export function NewTutorForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    id: "",
    name: "",
    description: "",
    avatar: "🎓",
    systemPrompt:
      "You are a helpful tutor for Churro Academy.\n\nTEACHING APPROACH:\n- \n\nSTYLE:\n- ",
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function slugify(name: string) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.id.trim() || !form.name.trim()) {
      setError("ID and name are required");
      return;
    }
    setCreating(true);
    setError(null);

    const res = await fetch("/api/admin/tutors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const { id } = await res.json();
      router.push(`/admin/tutors/${id}`);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Create failed");
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl">New Tutor</h1>
        <Link href="/admin">
          <Button variant="ghost" size="sm">
            Back
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm({
                    ...form,
                    name,
                    id: form.id || slugify(name),
                  });
                }}
                placeholder="e.g. Captain Holt"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="id">ID (URL slug, lowercase, hyphens)</Label>
              <Input
                id="id"
                value={form.id}
                onChange={(e) =>
                  setForm({ ...form, id: slugify(e.target.value) })
                }
                placeholder="captain-holt"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="One-liner for the picker card"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatar">Avatar emoji</Label>
              <Input
                id="avatar"
                value={form.avatar}
                onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                maxLength={4}
                className="w-24"
              />
            </div>
          </CardContent>
        </Card>

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
              rows={16}
              className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm font-mono leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          {error && (
            <span className="text-xs font-mono text-destructive">{error}</span>
          )}
          <Button type="submit" disabled={creating}>
            {creating ? "Creating..." : "Create Tutor"}
          </Button>
        </div>
      </form>
    </div>
  );
}
