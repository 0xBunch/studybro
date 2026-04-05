import { NextRequest, NextResponse } from "next/server";
import { checkPassword, setAdminCookie } from "@/lib/admin-session";

function getBaseUrl(req: NextRequest): string {
  // Respect Railway's proxy headers for correct absolute URLs
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  const base = getBaseUrl(req);
  try {
    const formData = await req.formData();
    const password = formData.get("password")?.toString() || "";

    if (!checkPassword(password)) {
      return NextResponse.redirect(`${base}/admin/login?error=1`);
    }

    await setAdminCookie();
    return NextResponse.redirect(`${base}/admin`);
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.redirect(`${base}/admin/login?error=1`);
  }
}
