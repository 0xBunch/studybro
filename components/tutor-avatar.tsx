"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Tutor } from "@/lib/tutors";

interface Props {
  tutor: Pick<Tutor, "id" | "avatar" | "image" | "name">;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "size-8 text-sm",
  md: "size-9 text-base",
  lg: "size-12 text-lg",
};

export function TutorAvatar({ tutor, size = "md", className }: Props) {
  const [errored, setErrored] = useState(false);
  const showImage = tutor.image && !errored;

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-muted overflow-hidden",
        sizeClasses[size],
        className
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={tutor.image!}
          alt={tutor.name}
          className="size-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <span>{tutor.avatar}</span>
      )}
    </span>
  );
}
