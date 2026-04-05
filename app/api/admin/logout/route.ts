import { NextRequest, NextResponse } from "next/server";
import { clearAdminCookie } from "@/lib/admin-session";

export async function POST(req: NextRequest) {
  await clearAdminCookie();
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return NextResponse.redirect(`${proto}://${host}/admin/login`);
}
