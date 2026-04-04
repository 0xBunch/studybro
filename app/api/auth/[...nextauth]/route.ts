import { NextResponse } from "next/server";

// Auth disabled for local development.
// When re-enabled, this will use NextAuth.

export async function GET() {
  return NextResponse.json({ message: "Auth disabled for development" });
}

export async function POST() {
  return NextResponse.json({ message: "Auth disabled for development" });
}
