import { NextRequest, NextResponse } from "next/server";
import { getOrCreateSession, EXAMPLE_SESSION_ID } from "@/lib/session";
import { prisma } from "@/lib/db";
import { uploadToStorage } from "@/lib/storage";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const sessionId = await getOrCreateSession();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const studySetId = formData.get("studySetId") as string | null;

    if (!file || !studySetId) {
      return NextResponse.json(
        { error: "Missing file or studySetId" },
        { status: 400 }
      );
    }

    // Guard: can't upload to the example
    const studySet = await prisma.studySet.findUnique({
      where: { id: studySetId },
      select: { sessionId: true },
    });
    if (!studySet || studySet.sessionId !== sessionId) {
      return NextResponse.json({ error: "Study set not found" }, { status: 404 });
    }
    if (studySet.sessionId === EXAMPLE_SESSION_ID) {
      return NextResponse.json(
        { error: "Example study set is read-only" },
        { status: 403 }
      );
    }

    const fileKey = `${sessionId}/${studySetId}/${randomUUID()}-${file.name}`;

    const upload = await prisma.upload.create({
      data: {
        studySetId,
        sessionId,
        fileName: file.name,
        fileKey,
        fileType: file.type,
      },
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadToStorage(fileKey, buffer, file.type);

    return NextResponse.json({
      uploadId: upload.id,
      fileKey,
    });
  } catch (error) {
    console.error("POST /api/upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
