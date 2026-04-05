import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { TutorEditForm } from "./tutor-edit-form";

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
        sortOrder: tutor.sortOrder,
        enabled: tutor.enabled,
      }}
    />
  );
}
