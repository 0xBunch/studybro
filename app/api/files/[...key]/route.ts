import { NextRequest } from "next/server";
import { getFileFromStorage } from "@/lib/storage";

/**
 * Proxy route to serve files from R2 storage publicly.
 * Used for tutor images + scenes uploaded via admin.
 *
 * GET /api/files/tutors/socrates/image-abc123.jpg
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key: keyParts } = await params;
    const key = keyParts.join("/");

    // Basic safety: only serve from the tutors/ prefix
    if (!key.startsWith("tutors/")) {
      return new Response("Not found", { status: 404 });
    }

    const buffer = await getFileFromStorage(key);

    // Guess content type from extension
    const ext = key.split(".").pop()?.toLowerCase() || "";
    const contentType =
      {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        gif: "image/gif",
        svg: "image/svg+xml",
      }[ext] || "application/octet-stream";

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("File proxy error:", error);
    return new Response("Not found", { status: 404 });
  }
}
