import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFileFromStorage } from "@/lib/storage";
import { extractText } from "@/lib/parsers";
import { extractConcepts } from "@/lib/claude";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { uploadId } = await req.json();

    const upload = await prisma.upload.findFirst({
      where: { id: uploadId, userId: session.user.id },
    });

    if (!upload) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 });
    }

    if (upload.processed) {
      return NextResponse.json({ message: "Already processed" });
    }

    const buffer = await getFileFromStorage(upload.fileKey);
    const text = await extractText(buffer, upload.fileType);
    const concepts = await extractConcepts(text);

    await prisma.upload.update({
      where: { id: uploadId },
      data: {
        extractedText: text,
        concepts: concepts as unknown as object,
        processed: true,
      },
    });

    return NextResponse.json({ concepts });
  } catch (error) {
    console.error("POST /api/process error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
