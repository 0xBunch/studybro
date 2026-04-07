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
import type {
  GoldenLines,
  TeachingArc,
  LiveContextConfig,
  Glossary,
  Catchphrase,
  Relationship,
} from "@/lib/persona-types";

interface TutorData {
  id: string;
  name: string;
  description: string;
  avatar: string;
  image: string | null;
  scene: string | null;
  systemPrompt: string;
  identity: string;
  voiceTraits: string[];
  antiPatterns: string[];
  goldenLines: GoldenLines;
  vocabulary: string[];
  glossary: Glossary;
  teachingArc: TeachingArc;
  liveContext: LiveContextConfig | null;
  webSearchEnabled: boolean;
  ttsVoiceLabel: string | null;
  ttsRefAudio: string | null;
  sortOrder: number;
  enabled: boolean;
}

const GOLDEN_LINE_KEYS: Array<keyof GoldenLines> = [
  "opening",
  "correct",
  "wrong",
  "explain",
  "transition",
  "closing",
];

const LIVE_SOURCES = [
  "time",
  "weather",
  "news",
  "reddit",
  "markets",
  "multi-news",
] as const;

export function TutorEditForm({ tutor }: { tutor: TutorData }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: tutor.name,
    description: tutor.description,
    avatar: tutor.avatar,
    identity: tutor.identity,
    voiceTraits: tutor.voiceTraits.join("\n"),
    antiPatterns: tutor.antiPatterns.join("\n"),
    vocabulary: tutor.vocabulary.join(", "),
    glossary: tutor.glossary,
    goldenLines: tutor.goldenLines,
    teachingArc: tutor.teachingArc,
    liveContext: tutor.liveContext,
    webSearchEnabled: tutor.webSearchEnabled,
    sortOrder: tutor.sortOrder,
    enabled: tutor.enabled,
  });
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [voiceLabel, setVoiceLabel] = useState(tutor.ttsVoiceLabel);
  const [voiceRefAudio, setVoiceRefAudio] = useState(tutor.ttsRefAudio);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveStatus(null);

    const payload = {
      name: form.name,
      description: form.description,
      avatar: form.avatar,
      identity: form.identity,
      voiceTraits: form.voiceTraits
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      antiPatterns: form.antiPatterns
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      vocabulary: form.vocabulary
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      goldenLines: form.goldenLines,
      glossary: form.glossary,
      teachingArc: form.teachingArc,
      liveContext: form.liveContext,
      webSearchEnabled: form.webSearchEnabled,
      sortOrder: form.sortOrder,
      enabled: form.enabled,
    };

    const res = await fetch(`/api/admin/tutors/${tutor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
        `Delete ${tutor.name}? This can't be undone.`
      )
    )
      return;
    const res = await fetch(`/api/admin/tutors/${tutor.id}`, { method: "DELETE" });
    if (res.ok) router.push("/admin");
    else alert("Delete failed");
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

  async function handleVoiceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVoiceStatus("Uploading & registering voice...");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/admin/tutors/${tutor.id}/voice`, {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      setVoiceLabel(tutor.id);
      setVoiceRefAudio(`/api/files/tutors/${tutor.id}/voice-ref-latest`);
      setVoiceStatus("Voice registered");
      router.refresh();
      setTimeout(() => setVoiceStatus(null), 3000);
    } else {
      const data = await res.json().catch(() => ({}));
      setVoiceStatus(`Failed: ${data.error || "unknown"}`);
    }
  }

  async function handleVoiceRemove() {
    if (!confirm("Remove this tutor's voice?")) return;
    const res = await fetch(`/api/admin/tutors/${tutor.id}/voice`, {
      method: "DELETE",
    });
    if (res.ok) {
      setVoiceLabel(null);
      setVoiceRefAudio(null);
      setVoiceStatus("Voice removed");
      router.refresh();
      setTimeout(() => setVoiceStatus(null), 3000);
    } else {
      setVoiceStatus("Remove failed");
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
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-destructive hover:text-destructive"
          >
            Delete
          </Button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Settings</CardTitle>
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
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="avatar">Emoji fallback</Label>
                <Input
                  id="avatar"
                  value={form.avatar}
                  onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                  maxLength={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sortOrder: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="flex items-center gap-4 pt-6">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) =>
                      setForm({ ...form, enabled: e.target.checked })
                    }
                    className="size-4"
                  />
                  Enabled
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={form.webSearchEnabled}
                    onChange={(e) =>
                      setForm({ ...form, webSearchEnabled: e.target.checked })
                    }
                    className="size-4"
                  />
                  Web search
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identity</CardTitle>
            <p className="text-xs text-muted-foreground">
              2-3 sentences, present tense. Who you are, where you&apos;re
              speaking from. Sets the scene.
            </p>
          </CardHeader>
          <CardContent>
            <textarea
              value={form.identity}
              onChange={(e) => setForm({ ...form, identity: e.target.value })}
              rows={4}
              className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="You're Jared Vennett, leaning back in your chair watching the market burn..."
            />
          </CardContent>
        </Card>

        {/* Voice + Anti-patterns */}
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Voice Traits</CardTitle>
              <p className="text-xs text-muted-foreground">
                One per line. Tone, verbal tics, register.
              </p>
            </CardHeader>
            <CardContent>
              <textarea
                value={form.voiceTraits}
                onChange={(e) =>
                  setForm({ ...form, voiceTraits: e.target.value })
                }
                rows={8}
                className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Anti-Patterns</CardTitle>
              <p className="text-xs text-muted-foreground">
                One per line. Explicit &quot;NEVER&quot; rules.
              </p>
            </CardHeader>
            <CardContent>
              <textarea
                value={form.antiPatterns}
                onChange={(e) =>
                  setForm({ ...form, antiPatterns: e.target.value })
                }
                rows={8}
                className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </CardContent>
          </Card>
        </div>

        {/* Golden lines */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Golden Lines</CardTitle>
            <p className="text-xs text-muted-foreground">
              Sample in-character lines — used as few-shot anchors in the first
              few messages.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {GOLDEN_LINE_KEYS.map((key) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={`gl-${key}`} className="text-xs capitalize">
                  {key}
                </Label>
                <Input
                  id={`gl-${key}`}
                  value={form.goldenLines[key] ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      goldenLines: {
                        ...form.goldenLines,
                        [key]: e.target.value,
                      },
                    })
                  }
                  placeholder={`Example line for ${key}...`}
                  className="text-sm"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Vocabulary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vocabulary Bank</CardTitle>
            <p className="text-xs text-muted-foreground">
              Comma-separated references this character drops naturally.
            </p>
          </CardHeader>
          <CardContent>
            <textarea
              value={form.vocabulary}
              onChange={(e) => setForm({ ...form, vocabulary: e.target.value })}
              rows={3}
              className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Lehman Brothers, CDOs, TARP, Bear Stearns..."
            />
          </CardContent>
        </Card>

        {/* Glossary — structured character knowledge */}
        <GlossaryEditor
          glossary={form.glossary}
          onChange={(g) => setForm({ ...form, glossary: g })}
        />

        {/* Teaching Arc */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Teaching Arc</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Opening behavior</Label>
              <Input
                value={form.teachingArc.openingBehavior ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    teachingArc: {
                      ...form.teachingArc,
                      openingBehavior: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Struggle response</Label>
              <Input
                value={form.teachingArc.struggleResponse ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    teachingArc: {
                      ...form.teachingArc,
                      struggleResponse: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Mastery response</Label>
              <Input
                value={form.teachingArc.masteryResponse ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    teachingArc: {
                      ...form.teachingArc,
                      masteryResponse: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Callback style</Label>
              <Input
                value={form.teachingArc.callbackStyle ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    teachingArc: {
                      ...form.teachingArc,
                      callbackStyle: e.target.value,
                    },
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Live context */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live Context</CardTitle>
            <p className="text-xs text-muted-foreground">
              Real-time data stream for this tutor (cached 12h).
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Source</Label>
              <select
                value={form.liveContext?.source ?? ""}
                onChange={(e) => {
                  const source = e.target.value;
                  setForm({
                    ...form,
                    liveContext: source
                      ? {
                          source: source as LiveContextConfig["source"],
                          config: form.liveContext?.config ?? {},
                          framingPrompt: form.liveContext?.framingPrompt ?? "",
                        }
                      : null,
                  });
                }}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">(none)</option>
                {LIVE_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            {form.liveContext && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Config (JSON)</Label>
                  <Input
                    value={JSON.stringify(form.liveContext.config)}
                    onChange={(e) => {
                      try {
                        const config = JSON.parse(e.target.value);
                        setForm({
                          ...form,
                          liveContext: form.liveContext
                            ? { ...form.liveContext, config }
                            : null,
                        });
                      } catch {
                        // leave unparsed input untouched
                      }
                    }}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Framing prompt</Label>
                  <textarea
                    value={form.liveContext.framingPrompt}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        liveContext: form.liveContext
                          ? {
                              ...form.liveContext,
                              framingPrompt: e.target.value,
                            }
                          : null,
                      })
                    }
                    rows={3}
                    className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Images</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Portrait</Label>
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
              </div>
              <div className="space-y-2">
                <Label>Scene</Label>
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
              </div>
            </div>
            {uploadStatus && (
              <p className="text-xs font-mono text-muted-foreground">
                {uploadStatus}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Voice (TTS) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Voice</CardTitle>
            <p className="text-xs text-muted-foreground">
              Upload 5-25 seconds of reference audio to clone this
              character&apos;s voice via F5-TTS.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <div
                className={`size-2 rounded-full ${voiceLabel ? "bg-green-500" : "bg-muted-foreground/30"}`}
              />
              <span className="text-sm">
                {voiceLabel ? "Voice registered" : "No voice"}
              </span>
            </div>
            {voiceRefAudio && (
              <audio
                controls
                src={voiceRefAudio}
                className="w-full h-8"
                preload="none"
              >
                <track kind="captions" />
              </audio>
            )}
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="audio/*"
                onChange={handleVoiceUpload}
                className="text-xs"
              />
              {voiceLabel && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleVoiceRemove}
                  className="text-destructive hover:text-destructive text-xs"
                >
                  Remove voice
                </Button>
              )}
            </div>
            {voiceStatus && (
              <p className="text-xs font-mono text-muted-foreground">
                {voiceStatus}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Legacy system prompt (collapsed) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Legacy System Prompt</CardTitle>
            <p className="text-xs text-muted-foreground">
              Read-only reference — kept as fallback. New fields above drive
              the tutor now.
            </p>
          </CardHeader>
          <CardContent>
            <textarea
              value={tutor.systemPrompt}
              readOnly
              rows={8}
              className="w-full resize-y rounded-lg border bg-muted px-3 py-2 text-xs font-mono opacity-60"
            />
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex items-center justify-end gap-3 sticky bottom-6">
          {saveStatus && (
            <span className="text-xs font-mono text-muted-foreground bg-background px-2 py-1 rounded">
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

// ─── Glossary editor subcomponent ───────────────────────────────────────────

function GlossaryEditor({
  glossary,
  onChange,
}: {
  glossary: Glossary;
  onChange: (g: Glossary) => void;
}) {
  const catchphrases = glossary.catchphrases ?? [];
  const relationships = glossary.relationships ?? [];
  const domain = (glossary.domainKnowledge ?? []).join(", ");
  const settings = (glossary.settings ?? []).join(", ");
  const eraYears = glossary.eraAnchors?.years ?? "";
  const eraRange = glossary.eraAnchors?.allowedCulturalRange ?? "";

  const updateCatchphrase = (i: number, patch: Partial<Catchphrase>) => {
    const next = [...catchphrases];
    next[i] = { ...next[i], ...patch };
    onChange({ ...glossary, catchphrases: next });
  };
  const addCatchphrase = () =>
    onChange({
      ...glossary,
      catchphrases: [...catchphrases, { phrase: "", usage: "" }],
    });
  const removeCatchphrase = (i: number) =>
    onChange({
      ...glossary,
      catchphrases: catchphrases.filter((_, idx) => idx !== i),
    });

  const updateRelationship = (i: number, patch: Partial<Relationship>) => {
    const next = [...relationships];
    next[i] = { ...next[i], ...patch };
    onChange({ ...glossary, relationships: next });
  };
  const addRelationship = () =>
    onChange({
      ...glossary,
      relationships: [...relationships, { name: "", role: "", notes: "" }],
    });
  const removeRelationship = (i: number) =>
    onChange({
      ...glossary,
      relationships: relationships.filter((_, idx) => idx !== i),
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Glossary</CardTitle>
        <p className="text-xs text-muted-foreground">
          Structured character knowledge — catchphrases, relationships, domain
          knowledge, settings, and era anchors.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Catchphrases */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Catchphrases</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addCatchphrase}
            >
              + Add
            </Button>
          </div>
          {catchphrases.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No catchphrases yet.</p>
          )}
          {catchphrases.map((c, i) => (
            <div key={i} className="flex gap-2 items-start">
              <Input
                value={c.phrase}
                onChange={(e) => updateCatchphrase(i, { phrase: e.target.value })}
                placeholder='"NOICE"'
                className="flex-1 font-mono text-xs"
              />
              <Input
                value={c.usage}
                onChange={(e) => updateCatchphrase(i, { usage: e.target.value })}
                placeholder="rarely, genuine surprise"
                className="flex-1 text-xs"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeCatchphrase(i)}
                className="text-destructive"
              >
                ×
              </Button>
            </div>
          ))}
        </div>

        {/* Relationships */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Relationships</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addRelationship}
            >
              + Add
            </Button>
          </div>
          {relationships.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No relationships yet.</p>
          )}
          {relationships.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_2fr_auto] gap-2 items-start">
              <Input
                value={r.name}
                onChange={(e) => updateRelationship(i, { name: e.target.value })}
                placeholder="Boyle"
                className="text-xs"
              />
              <Input
                value={r.role}
                onChange={(e) => updateRelationship(i, { role: e.target.value })}
                placeholder="partner"
                className="text-xs"
              />
              <Input
                value={r.notes}
                onChange={(e) => updateRelationship(i, { notes: e.target.value })}
                placeholder="loves food analogies"
                className="text-xs"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeRelationship(i)}
                className="text-destructive"
              >
                ×
              </Button>
            </div>
          ))}
        </div>

        {/* Domain Knowledge */}
        <div className="space-y-2">
          <Label className="text-sm">Domain Knowledge</Label>
          <p className="text-xs text-muted-foreground">
            Comma-separated topic banks this character draws from for analogies.
          </p>
          <textarea
            value={domain}
            onChange={(e) =>
              onChange({
                ...glossary,
                domainKnowledge: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            rows={2}
            className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-xs font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Die Hard, Halloween Heists, Boyle's sauces..."
          />
        </div>

        {/* Settings */}
        <div className="space-y-2">
          <Label className="text-sm">Settings</Label>
          <p className="text-xs text-muted-foreground">
            Comma-separated physical places this character exists in.
          </p>
          <textarea
            value={settings}
            onChange={(e) =>
              onChange({
                ...glossary,
                settings: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            rows={2}
            className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-xs font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Precinct bullpen, evidence locker, Boyle's food truck..."
          />
        </div>

        {/* Era Anchors */}
        <div className="space-y-2">
          <Label className="text-sm">Era Anchors (optional)</Label>
          <p className="text-xs text-muted-foreground">
            Only for period characters. Keeps references inside the right time window.
          </p>
          <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
            <Input
              value={eraYears}
              onChange={(e) =>
                onChange({
                  ...glossary,
                  eraAnchors: {
                    years: e.target.value,
                    allowedCulturalRange: eraRange,
                  },
                })
              }
              placeholder="2007-2009"
              className="text-xs"
            />
            <Input
              value={eraRange}
              onChange={(e) =>
                onChange({
                  ...glossary,
                  eraAnchors: {
                    years: eraYears,
                    allowedCulturalRange: e.target.value,
                  },
                })
              }
              placeholder="iPhone 3G era, Obama '08, Dark Knight..."
              className="text-xs"
            />
          </div>
          {(eraYears || eraRange) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const next = { ...glossary };
                delete next.eraAnchors;
                onChange(next);
              }}
              className="text-xs text-muted-foreground"
            >
              Clear era anchors
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
