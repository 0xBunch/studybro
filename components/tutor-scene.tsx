"use client";

import { useState } from "react";
import type { TutorPersona as Tutor } from "@/lib/persona-types";

interface Props {
  tutor: Pick<Tutor, "scene" | "name">;
}

/**
 * A hero strip at the top of the chat page showing the tutor's
 * classroom/scene image. Sizes to the image's natural aspect ratio
 * within a sensible max height. Gracefully hides if no scene is set
 * or the image fails to load.
 */
export function TutorScene({ tutor }: Props) {
  const [errored, setErrored] = useState(false);

  if (!tutor.scene || errored) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-lg border bg-muted max-h-64">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={tutor.scene!}
        alt={`${tutor.name} scene`}
        className="w-full h-auto max-h-64 object-contain"
        onError={() => setErrored(true)}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background/40 to-transparent" />
    </div>
  );
}
