"use client";

import { useCallback, useRef, useState } from "react";
import { Volume2, Loader2, Square } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type State = "idle" | "loading" | "playing";

interface Props {
  text: string;
  tutorId: string;
}

export function SpeakerButton({ text, tutorId }: Props) {
  const [state, setState] = useState<State>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cachedAudioRef = useRef<string | null>(null);
  const cachedTextRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setState("idle");
  }, []);

  const play = useCallback(
    async (dataUri: string) => {
      const audio = new Audio(dataUri);
      audioRef.current = audio;
      audio.addEventListener("ended", () => setState("idle"));
      audio.addEventListener("error", () => {
        toast.error("Audio playback failed");
        setState("idle");
      });
      setState("playing");
      await audio.play();
    },
    []
  );

  const handleClick = useCallback(async () => {
    if (state === "playing") {
      stop();
      return;
    }

    if (state === "loading") return;

    // Use cached audio if text hasn't changed
    if (cachedAudioRef.current && cachedTextRef.current === text) {
      await play(cachedAudioRef.current);
      return;
    }

    setState("loading");

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, tutorId }),
      });

      if (!res.ok) throw new Error("TTS request failed");

      const data = await res.json();
      cachedAudioRef.current = data.audio;
      cachedTextRef.current = text;
      await play(data.audio);
    } catch {
      toast.error("Couldn't generate speech");
      setState("idle");
    }
  }, [state, text, tutorId, stop, play]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === "loading"}
      className={cn(
        "inline-flex items-center justify-center size-5 rounded text-muted-foreground/60 transition-colors",
        state === "idle" && "hover:text-foreground",
        state === "playing" && "text-primary"
      )}
      aria-label={
        state === "playing" ? "Stop audio" : "Play message aloud"
      }
    >
      {state === "loading" && <Loader2 className="size-3 animate-spin" />}
      {state === "idle" && <Volume2 className="size-3" />}
      {state === "playing" && <Square className="size-2.5 fill-current" />}
    </button>
  );
}
