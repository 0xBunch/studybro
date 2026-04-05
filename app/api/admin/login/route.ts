import { NextRequest, NextResponse } from "next/server";
import { checkPassword, setAdminCookie } from "@/lib/admin-session";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const password = formData.get("password")?.toString() || "";

    if (!checkPassword(password)) {
      return NextResponse.redirect(new URL("/admin/login?error=1", req.url));
    }

    await setAdminCookie();
    return NextResponse.redirect(new URL("/admin", req.url));
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.redirect(new URL("/admin/login?error=1", req.url));
  }
}
