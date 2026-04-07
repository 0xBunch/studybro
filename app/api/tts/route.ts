import { NextRequest, NextResponse } from "next/server";
import { getTutor } from "@/lib/tutors";
import { synthesizeSpeech } from "@/lib/f5tts";

const MAX_TEXT_LENGTH = 5000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, tutorId } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    if (!tutorId || typeof tutorId !== "string") {
      return NextResponse.json({ error: "Missing tutorId" }, { status: 400 });
    }

    const trimmed = text.trim().slice(0, MAX_TEXT_LENGTH);

    const tutor = await getTutor(tutorId);
    if (!tutor || !tutor.ttsVoiceLabel) {
      return NextResponse.json(
        { error: "Tutor not found or has no voice configured" },
        { status: 404 }
      );
    }

    const wavBuffer = await synthesizeSpeech(trimmed, tutor.ttsVoiceLabel);
    const base64 = wavBuffer.toString("base64");

    return NextResponse.json({
      audio: `data:audio/wav;base64,${base64}`,
    });
  } catch (error) {
    console.error("POST /api/tts error:", error);
    return NextResponse.json(
      { error: "Speech synthesis failed" },
      { status: 500 }
    );
  }
}
