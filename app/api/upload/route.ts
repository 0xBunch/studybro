import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPresignedUploadUrl } from "@/lib/storage";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { studySetId, fileName, fileType } = await req.json();

    if (!studySetId || !fileName || !fileType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const fileKey = `${session.user.id}/${studySetId}/${randomUUID()}-${fileName}`;

    const upload = await prisma.upload.create({
      data: {
        studySetId,
        userId: session.user.id,
        fileName,
        fileKey,
        fileType,
      },
    });

    const presignedUrl = await getPresignedUploadUrl(fileKey, fileType);

    return NextResponse.json({
      uploadId: upload.id,
      presignedUrl,
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
