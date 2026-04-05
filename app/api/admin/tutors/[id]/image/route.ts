import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthenticated } from "@/lib/admin-session";
import { uploadToStorage } from "@/lib/storage";
import { invalidateTutorCache } from "@/lib/tutors";
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
    const kind = formData.get("kind")?.toString();

    if (!file || !kind || (kind !== "image" && kind !== "scene")) {
      return NextResponse.json(
        { error: "Missing file or invalid kind (image | scene)" },
        { status: 400 }
      );
    }

    const tutor = await prisma.tutor.findUnique({ where: { id } });
    if (!tutor) {
      return NextResponse.json({ error: "Tutor not found" }, { status: 404 });
    }

    // Upload to R2 with a deterministic path + cache-bust suffix
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const suffix = randomUUID().slice(0, 8);
    const fileKey = `tutors/${id}/${kind}-${suffix}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadToStorage(fileKey, buffer, file.type);

    // Serve through our own proxy route (R2 bucket isn't public by default)
    const publicUrl = `/api/files/${fileKey}`;

    await prisma.tutor.update({
      where: { id },
      data: { [kind]: publicUrl },
    });

    invalidateTutorCache();
    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("POST /api/admin/tutors/[id]/image error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
