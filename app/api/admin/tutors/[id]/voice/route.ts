import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthenticated } from "@/lib/admin-session";
import { uploadToStorage } from "@/lib/storage";
import { invalidateTutorCache } from "@/lib/tutors";
import { registerVoice } from "@/lib/f5tts";
import { randomUUID } from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
    }

    const tutor = await prisma.tutor.findUnique({ where: { id } });
    if (!tutor) {
      return NextResponse.json({ error: "Tutor not found" }, { status: 404 });
    }

    // Upload reference audio to S3/R2
    const ext = file.name.split(".").pop()?.toLowerCase() || "wav";
    const suffix = randomUUID().slice(0, 8);
    const fileKey = `tutors/${id}/voice-ref-${suffix}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadToStorage(fileKey, buffer, file.type);

    // Register voice with F5-TTS server
    await registerVoice(id, buffer);

    // Update tutor record
    const refAudioUrl = `/api/files/${fileKey}`;
    await prisma.tutor.update({
      where: { id },
      data: { ttsVoiceLabel: id, ttsRefAudio: refAudioUrl },
    });

    invalidateTutorCache();
    return NextResponse.json({ ok: true, refAudioUrl });
  } catch (error) {
    console.error("POST /api/admin/tutors/[id]/voice error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Voice registration failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await prisma.tutor.update({
      where: { id },
      data: { ttsVoiceLabel: null, ttsRefAudio: null },
    });

    invalidateTutorCache();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/tutors/[id]/voice error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
