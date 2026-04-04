import { NextRequest, NextResponse } from "next/server";
import { USER_ID } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadToStorage } from "@/lib/storage";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const studySetId = formData.get("studySetId") as string | null;

    if (!file || !studySetId) {
      return NextResponse.json(
        { error: "Missing file or studySetId" },
        { status: 400 }
      );
    }

    const fileKey = `${USER_ID}/${studySetId}/${randomUUID()}-${file.name}`;

    const upload = await prisma.upload.create({
      data: {
        studySetId,
        userId: USER_ID,
        fileName: file.name,
        fileKey,
        fileType: file.type,
      },
    });

    // Upload directly to R2 from the server (no CORS issues)
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
