import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { TutorEditForm } from "./tutor-edit-form";
import type {
  GoldenLines,
  TeachingArc,
  LiveContextConfig,
  Glossary,
} from "@/lib/persona-types";

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function AdminTutorEditPage({ params }: Props) {
  const { id } = await params;
  const tutor = await prisma.tutor.findUnique({ where: { id } });
  if (!tutor) notFound();

  return (
    <TutorEditForm
      tutor={{
        id: tutor.id,
        name: tutor.name,
        description: tutor.description,
        avatar: tutor.avatar,
        image: tutor.image,
        scene: tutor.scene,
        systemPrompt: tutor.systemPrompt,
        identity: tutor.identity,
        voiceTraits: (tutor.voiceTraits as string[]) ?? [],
        antiPatterns: (tutor.antiPatterns as string[]) ?? [],
        goldenLines: (tutor.goldenLines as GoldenLines) ?? {},
        vocabulary: (tutor.vocabulary as string[]) ?? [],
        glossary: (tutor.glossary as Glossary) ?? {},
        teachingArc: (tutor.teachingArc as TeachingArc) ?? {},
        liveContext: (tutor.liveContext as LiveContextConfig | null) ?? null,
        webSearchEnabled: tutor.webSearchEnabled,
        ttsVoiceLabel: tutor.ttsVoiceLabel,
        ttsRefAudio: tutor.ttsRefAudio,
        ttsRefText: tutor.ttsRefText,
        sortOrder: tutor.sortOrder,
        enabled: tutor.enabled,
      }}
    />
  );
}
