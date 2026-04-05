import { NextRequest, NextResponse } from "next/server";
import { clearAdminCookie } from "@/lib/admin-session";

export async function POST(req: NextRequest) {
  await clearAdminCookie();
  return NextResponse.redirect(new URL("/admin/login", req.url));
}
