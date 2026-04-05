"use client";

import { useState } from "react";
import type { TutorPersona as Tutor } from "@/lib/persona-types";

interface Props {
  tutor: Pick<Tutor, "scene" | "name">;
}

/**
 * A wide hero strip at the top of the chat page showing the tutor's
 * classroom/scene image. Gracefully hides if no scene is set or
 * the image fails to load.
 */
export function TutorScene({ tutor }: Props) {
  const [errored, setErrored] = useState(false);

  if (!tutor.scene || errored) return null;

  return (
    <div className="relative h-24 w-full overflow-hidden rounded-lg border bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={tutor.scene!}
        alt={`${tutor.name} scene`}
        className="size-full object-cover opacity-80"
        onError={() => setErrored(true)}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
    </div>
  );
}
