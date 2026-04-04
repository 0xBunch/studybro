import { NextRequest, NextResponse } from "next/server";
import { USER_ID } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFileFromStorage } from "@/lib/storage";
import { extractText } from "@/lib/parsers";
import { extractConcepts } from "@/lib/claude";

export async function POST(req: NextRequest) {
  try {
    const { uploadId } = await req.json();

    const upload = await prisma.upload.findFirst({
      where: { id: uploadId, userId: USER_ID },
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
